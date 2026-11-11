// Avalia modelos de IA com os casos de tests/instagram/casos-roteiro.json e gera um relatorio .md.
// Usa o MESMO prompt, a MESMA busca no acervo e a MESMA pos-checagem do robo.
//
// Uso:
//   node scripts/instagram-ia-avaliar.mjs --falso                       (IA falsa, nao gasta nada)
//   CLOUDFLARE_API_TOKEN=... node scripts/instagram-ia-avaliar.mjs --modelos "@cf/meta/llama-3.3-70b-instruct-fp8-fast,@cf/google/gemma-4-26b-a4b-it"
//   ANTHROPIC_API_KEY=... node scripts/instagram-ia-avaliar.mjs --provedor anthropic --modelos MODELO
//   node scripts/instagram-ia-avaliar.mjs --ponte http://127.0.0.1:8799  (login do wrangler, sem token;
//     antes: npx wrangler dev --config scripts/instagram-ia-ponte/wrangler.jsonc)
// Opcoes: --casos caminho.json  --saida relatorio.md  --so id1,id2
import { readFileSync, writeFileSync } from 'node:fs'
import { buscarAcervo, normalizar } from '../lib/instagram-ia/acervo-busca.js'
import { campanhaVigente } from '../lib/instagram-ia/roteiro.js'
import { montarPrompt } from '../lib/instagram-ia/prompt.js'
import { pedirComRetry } from '../lib/instagram-ia/rascunho.js'
import { conferirResposta, removerLinksExternos, temPrecoDiferente, PRECO_BASE } from '../lib/instagram-ia/pos-checagem.js'

const CONTA = '218d034ad99d2eaf4e9eb277866901ef'
const PADRAO = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/google/gemma-4-26b-a4b-it', '@cf/qwen/qwen3-30b-a3b-fp8']

function lerArgs(argv) {
  const a = { falso: false, provedor: 'workers-ai', modelos: PADRAO, casos: 'tests/instagram/casos-roteiro.json', saida: 'instagram-ia-relatorio.md', so: null }
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i]
    if (k === '--falso') a.falso = true
    else if (k === '--provedor') a.provedor = argv[++i]
    else if (k === '--modelos') a.modelos = argv[++i].split(',').map((s) => s.trim()).filter(Boolean)
    else if (k === '--casos') a.casos = argv[++i]
    else if (k === '--saida') a.saida = argv[++i]
    else if (k === '--so') a.so = argv[++i].split(',')
    else if (k === '--ponte') a.ponte = argv[++i]
  }
  return a
}

// Plano = minusculas e sem acento (mantem pontuacao, para achar "R$ 10" e "trilhaviva.org/...").
const ACENTOS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g')
const plano = (s) => String(s).normalize('NFD').replace(ACENTOS, '').toLowerCase()
const contem = (texto, padrao) => padrao.split('|').some((p) => plano(texto).includes(plano(p)))

// IA falsa: so prova que o script roda. Escolhe a situacao por palavra-chave.
function iaFalsa() {
  const regras = [
    [/estorn|reembols|devol|cancel|golpe|procon/, 'S10_estorno_insatisfacao', true, 'Obrigado por avisar. O Paulo vai acompanhar o seu caso pessoalmente.'],
    [/mainstage/, 'S05_mainstage', true, 'O MainStage não abre as faixas só arrastando. Posso passar para o Paulo ajudar.'],
    [/paguei|acesso|pagamento/, 'S09_acesso_nao_aparece', true, 'Sinto muito! Me manda o e-mail da compra e um print da tela.'],
    [/afiliad/, 'S13_afiliados', false, 'Veja: https://trilhaviva.org/afiliados'],
    [/gratis|amostra|demonstra/, 'S14_vs_gratis', false, 'Baixe: https://trilhaviva.org/vs-gratis'],
    [/pix|valor|parcel|cupom|custa/, 'S11_preco_pagamento', false, 'O pacote é R$ 89,90. Dá para parcelar em até 12 vezes, valor no Mercado Pago. https://trilhaviva.org/assinar'],
  ]
  return {
    async run(_modelo, entrada) {
      const ultima = normalizar(entrada.messages.at(-1).content)
      const [, situacao, humano, resposta] = regras.find(([re]) => re.test(ultima)) || [null, 'S99_outro', true, 'Obrigado pela mensagem! Vou passar para o Paulo.']
      return { response: { resposta, situacao, precisa_humano: humano, motivo: humano ? 'falso' : '' }, usage: { prompt_tokens: 0, completion_tokens: 0 } }
    },
  }
}

// Workers AI pela API REST da Cloudflare; devolve o mesmo formato do env.AI.run.
function iaRest(token) {
  return {
    async run(modelo, entrada) {
      const url = `https://api.cloudflare.com/client/v4/accounts/${CONTA}/ai/run/${modelo}`
      const r = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(entrada) })
      const corpo = await r.text()
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${corpo.slice(0, 300)}`)
      return JSON.parse(corpo).result
    },
  }
}

// Workers AI pela ponte local (wrangler dev com o binding AI e o login do wrangler).
function iaPonte(url) {
  return {
    async run(modelo, entrada) {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ modelo, entrada }) })
      const corpo = await r.json()
      if (!corpo.ok) throw new Error(corpo.erro)
      return corpo.resultado
    },
  }
}

function montarEnv(args, modelo) {
  if (args.provedor === 'anthropic') return { IG_IA_PROVEDOR: 'anthropic', IG_IA_MODELO: modelo, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY }
  const ai = args.falso ? iaFalsa() : args.ponte ? iaPonte(args.ponte) : iaRest(process.env.CLOUDFLARE_API_TOKEN)
  return { IG_IA_PROVEDOR: 'workers-ai', IG_IA_MODELO: modelo, AI: ai }
}

async function rodarCaso(env, caso) {
  const mensagens = [{ direcao: 'entrada', texto: caso.mensagem }]
  const campanha = campanhaVigente(caso.data_simulada ? new Date(caso.data_simulada) : new Date())
  const pedido = montarPrompt({ mensagens, busca: buscarAcervo(caso.mensagem), campanha })
  const opcoes = {}
  try {
    const r = await pedirComRetry(env, pedido, opcoes)
    const c = conferirResposta({ json: r.json, textosDoCliente: [caso.mensagem], campanha })
    return { ok: true, r, c, campanha }
  } catch (erro) {
    return { ok: false, erro: String(erro.message).slice(0, 300) }
  }
}

function regrasQuebradas(caso, saida) {
  const texto = saida.c.texto
  const quebradas = []
  if (removerLinksExternos(String(saida.r.json.resposta)).removeu) quebradas.push('link externo')
  const precos = saida.campanha ? [PRECO_BASE, saida.campanha.preco] : [PRECO_BASE]
  if (temPrecoDiferente(String(saida.r.json.resposta), precos)) quebradas.push('preço diferente')
  for (const p of caso.nao_pode_conter || []) if (contem(texto, p)) quebradas.push(`disse "${p}"`)
  for (const p of caso.deve_conter || []) if (!contem(texto, p)) quebradas.push(`faltou "${p}"`)
  return quebradas
}

function avaliar(caso, saida) {
  if (!saida.ok) return { caso, falhou: saida.erro }
  const situacaoOk = saida.r.json.situacao === caso.situacao_esperada
  const humanoOk = saida.c.precisaHumano === caso.precisa_humano
  return { caso, saida, situacaoOk, humanoOk, quebradas: regrasQuebradas(caso, saida) }
}

function resumo(avals) {
  const total = avals.length
  const bons = avals.filter((a) => !a.falhou)
  const n = (f) => bons.filter(f).length
  const humanos = avals.filter((a) => a.caso.precisa_humano)
  return {
    total, falhas: total - bons.length, situacao: n((a) => a.situacaoOk), humano: n((a) => a.humanoOk),
    humanoObrigatorio: humanos.filter((a) => !a.falhou && a.saida.c.precisaHumano).length, totalHumanos: humanos.length,
    comRegraQuebrada: n((a) => a.quebradas.length > 0),
  }
}

function secaoModelo(modelo, avals) {
  const s = resumo(avals)
  const linhas = [
    `## ${modelo}`, '',
    `- Casos: ${s.total} (falhas da IA ou JSON inválido: ${s.falhas})`,
    `- Situação certa: ${s.situacao} de ${s.total}`,
    `- precisa_humano certo: ${s.humano} de ${s.total}`,
    `- Casos que exigem humano e saíram com humano: ${s.humanoObrigatorio} de ${s.totalHumanos} (meta: todos)`,
    `- Casos com regra quebrada: ${s.comRegraQuebrada}`,
    `- Aceitou json_schema: ${s.falhas === s.total ? 'NÃO (todas as chamadas falharam)' : 'sim (as respostas vieram em JSON no formato)'}`, '',
  ]
  for (const a of avals) linhas.push(...detalhe(a))
  return linhas.join('\n')
}

function detalhe(a) {
  const topo = `### ${a.caso.id}${a.caso.tipo ? ' (' + a.caso.tipo + ')' : ''}`
  const msg = `Cliente: ${a.caso.mensagem}`
  if (a.falhou) return [topo, msg, `FALHOU: ${a.falhou}`, '']
  const j = a.saida.r.json
  return [
    topo, msg,
    `- Situação: esperada ${a.caso.situacao_esperada}, veio ${j.situacao} ${a.situacaoOk ? '(ok)' : '(ERRADA)'}`,
    `- Precisa humano: esperado ${a.caso.precisa_humano}, final ${a.saida.c.precisaHumano} ${a.humanoOk ? '(ok)' : '(ERRADO)'}`,
    `- Regras quebradas: ${a.quebradas.length ? a.quebradas.join('; ') : 'nenhuma'}`,
    `- Resposta: ${a.saida.c.texto.replace(/\n/g, ' ')}`, '',
  ]
}

export async function avaliarModelo(args, modelo, casos) {
  const env = montarEnv(args, modelo)
  const avals = []
  for (const caso of casos) avals.push(avaliar(caso, await rodarCaso(env, caso)))
  return avals
}

async function principal() {
  const args = lerArgs(process.argv.slice(2))
  if (!args.falso && !args.ponte && args.provedor === 'workers-ai' && !process.env.CLOUDFLARE_API_TOKEN) throw new Error('Defina CLOUDFLARE_API_TOKEN (ou use --falso).')
  if (!args.falso && args.provedor === 'anthropic' && !process.env.ANTHROPIC_API_KEY) throw new Error('Defina ANTHROPIC_API_KEY (ou use --falso).')
  let casos = JSON.parse(readFileSync(args.casos, 'utf8')).casos
  if (args.so) casos = casos.filter((c) => args.so.includes(c.id))
  const partes = [`# Relatório de avaliação da IA do Instagram${args.falso ? ' (IA FALSA, só teste do script)' : ''}`, '', `Casos: ${casos.length}. Gerado em ${new Date().toISOString()}.`, '']
  for (const modelo of args.modelos) partes.push(secaoModelo(modelo, await avaliarModelo(args, modelo, casos)))
  writeFileSync(args.saida, partes.join('\n'))
  console.log(`Relatório gravado em ${args.saida}`)
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  principal().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
