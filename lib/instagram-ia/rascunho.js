// Escreve o RASCUNHO de resposta do Direct do Instagram ou do WhatsApp. Nunca envia nada (so a Gestao envia).
import { buscarAcervo } from './acervo-busca.js'
import { campanhaVigente, CODIGOS_SITUACAO } from './roteiro.js'
import { montarPrompt } from './prompt.js'
import { chamarIA, modeloDe, provedorDe } from './provedores.js'
import { conferirResposta } from './pos-checagem.js'

// Consultas D1 de um gerarRascunho (maximo): estado+teto, mensagens, substituir abertos,
// criar 'gerando', gravar resultado. A busca e a IA nao usam D1.
export const CUSTO_RASCUNHO = 5
export const CUSTO_FILA = 1
const TETO_PADRAO = 100
const MAX_MENSAGENS = 20

// Tabelas de cada canal (nomes fixos aqui, nunca vindos de fora). chave = coluna que identifica a conversa.
export const CANAIS = {
  instagram: { mensagens: 'instagram_mensagens', rascunhos: 'instagram_rascunhos', estado: 'instagram_estado', chave: 'igsid', teto: 'IG_IA_TETO_DIA', nome: 'Direct do Instagram', log: 'ig-ia' },
  whatsapp: { mensagens: 'whatsapp_mensagens', rascunhos: 'whatsapp_rascunhos', estado: 'whatsapp_ia_estado', chave: 'telefone', teto: 'WA_IA_TETO_DIA', nome: 'WhatsApp', log: 'wa-ia' },
}
export function canalDe(nome = 'instagram') {
  const c = CANAIS[nome]
  if (!c) throw new Error(`canal desconhecido: ${nome}`)
  return c
}

const mascarar = (id) => {
  const s = String(id)
  return s.length <= 4 ? '***' : `${s.slice(0, 2)}***${s.slice(-2)}`
}

export function valido(json) {
  return Boolean(json) && typeof json.resposta === 'string' && json.resposta.trim() !== '' &&
    CODIGOS_SITUACAO.includes(json.situacao)
}

// JSON quebrado ou fora do esquema: tenta 1 vez de novo.
export async function pedirComRetry(env, pedido, opcoes) {
  let entrada = 0
  let saida = 0
  for (let tentativa = 0; tentativa < 2; tentativa += 1) {
    const r = await chamarIA(env, pedido, opcoes)
    entrada += r.tokensEntrada
    saida += r.tokensSaida
    if (valido(r.json)) return { json: r.json, tokensEntrada: entrada, tokensSaida: saida }
  }
  throw new Error('JSON da IA inválido depois de 2 tentativas')
}

async function lerPortas(db, env, agora, c) {
  const inicioDoDia = agora.toISOString().slice(0, 10) + ' 00:00:00'
  const linha = await db.prepare(
    `SELECT ia_ligada, (SELECT COUNT(*) FROM ${c.rascunhos} WHERE criado_em >= ?) AS hoje FROM ${c.estado} WHERE id = 1`,
  ).bind(inicioDoDia).first()
  if (!linha || !linha.ia_ligada) return 'desligada'
  const teto = Number.parseInt(env[c.teto], 10)
  return linha.hoje >= (teto > 0 ? teto : TETO_PADRAO) ? 'teto' : null
}

// Marca como 'substituido' o que estiver aberto (ou falhou nesta mesma mensagem) e devolve as tentativas herdadas.
async function substituirAbertos(db, igsid, ultimaId, c) {
  const { results } = await db.prepare(
    `UPDATE ${c.rascunhos} SET status = 'substituido'
     WHERE ${c.chave} = ? AND (status IN ('gerando', 'pendente') OR (status = 'falhou' AND ate_mensagem_id = ?))
     RETURNING status, tentativas, ate_mensagem_id`,
  ).bind(igsid, ultimaId).all()
  let herdadas = 0
  for (const r of results) {
    if (r.ate_mensagem_id !== ultimaId || r.status === 'pendente') continue
    herdadas = Math.max(herdadas, r.tentativas + (r.status === 'gerando' ? 1 : 0))
  }
  return herdadas
}

async function criarGerando(db, igsid, ultimaId, tentativas, env, c) {
  try {
    const nova = await db.prepare(
      `INSERT INTO ${c.rascunhos} (${c.chave}, ate_mensagem_id, status, provedor, modelo, tentativas)
       VALUES (?, ?, 'gerando', ?, ?, ?) RETURNING id`,
    ).bind(igsid, ultimaId, provedorDe(env), modeloDe(env) || null, tentativas).first()
    return nova.id
  } catch (erro) {
    if (/UNIQUE|constraint/i.test(String(erro?.message))) return null
    throw erro
  }
}

async function escreverTexto(env, mensagens, agora, opcoes, c) {
  const doCliente = mensagens.filter((m) => m.direcao === 'entrada')
  const textos = doCliente.map((m) => m.texto || '')
  const campanha = campanhaVigente(agora)
  const busca = buscarAcervo(textos.slice(-3).join('\n'))
  const pedido = montarPrompt({ mensagens, busca, campanha, canal: c.nome })
  const r = await pedirComRetry(env, pedido, opcoes)
  const conferida = conferirResposta({ json: r.json, textosDoCliente: textos, campanha })
  return { ...conferida, situacao: r.json.situacao, tokensEntrada: r.tokensEntrada, tokensSaida: r.tokensSaida }
}

async function gravar(db, id, campos, c) {
  const r = await db.prepare(
    `UPDATE ${c.rascunhos} SET status = ?, texto = ?, situacao = ?, precisa_humano = ?, motivo = ?,
       tokens_entrada = ?, tokens_saida = ?, erro = ?, tentativas = ?
     WHERE id = ? AND status = 'gerando'`,
  ).bind(
    campos.status, campos.texto ?? null, campos.situacao ?? null, campos.precisaHumano ? 1 : 0, campos.motivo ?? null,
    campos.tokensEntrada ?? null, campos.tokensSaida ?? null, campos.erro ?? null, campos.tentativas, id,
  ).run()
  return r.meta.changes === 1
}

const textoDoErro = (e) => (e?.cota ? 'cota: cota diária da IA acabou' : String(e?.message || e)).slice(0, 300)

// opcoes.canal: 'instagram' (padrao) ou 'whatsapp'. igsid = id da conversa (no WhatsApp, o telefone).
export async function gerarRascunho(env, igsid, opcoes = {}) {
  const c = canalDe(opcoes.canal)
  const db = env.DB
  const agora = opcoes.agora || new Date()
  const log = opcoes.logger || console
  const quem = mascarar(igsid)
  const fim = (resultado) => {
    log.log?.(`[${c.log}] conversa ${quem}: ${resultado.status}${resultado.rascunhoId ? ' #' + resultado.rascunhoId : ''}`)
    return resultado
  }
  const porta = await lerPortas(db, env, agora, c)
  if (porta) return fim({ status: porta })
  const { results } = await db.prepare(
    `SELECT id, direcao, texto, midia_tipo FROM ${c.mensagens} WHERE ${c.chave} = ? ORDER BY id DESC LIMIT ?`,
  ).bind(igsid, MAX_MENSAGENS).all()
  if (!results.length || results[0].direcao !== 'entrada') return fim({ status: 'sem_entrada' })
  const ultimaId = results[0].id
  const herdadas = await substituirAbertos(db, igsid, ultimaId, c)
  const rascunhoId = await criarGerando(db, igsid, ultimaId, herdadas, env, c)
  if (!rascunhoId) return fim({ status: 'ocupado' })
  const inicio = Date.now()
  try {
    const r = await escreverTexto(env, [...results].reverse(), agora, opcoes, c)
    const ok = await gravar(db, rascunhoId, { ...r, status: 'pendente', tentativas: herdadas }, c)
    log.log?.(`[${c.log}] conversa ${quem}: ${r.situacao}, humano=${r.precisaHumano}, ${Date.now() - inicio} ms, tokens ${r.tokensEntrada}/${r.tokensSaida}`)
    return fim(ok ? { status: 'pendente', rascunhoId } : { status: 'ocupado' })
  } catch (erro) {
    log.warn?.(`[${c.log}] conversa ${quem}: falhou (${textoDoErro(erro).slice(0, 80)})`)
    await gravar(db, rascunhoId, { status: 'falhou', erro: textoDoErro(erro), tentativas: herdadas + 1 }, c)
    return fim({ status: 'falhou', rascunhoId })
  }
}

// Conversas que precisam de rascunho (regra do contrato). 1 consulta. Devolve os ids das conversas.
// IA desligada = lista vazia (o teto do dia fica so no gerarRascunho, que le o env).
export async function buscarFilaRascunhos(db, limite = 3, canal = 'instagram') {
  const c = canalDe(canal)
  const n = Math.min(Math.max(Math.trunc(Number(limite)) || 3, 1), 20)
  const { results } = await db.prepare(
    `SELECT m.${c.chave} AS conversa FROM ${c.mensagens} m
     WHERE EXISTS (SELECT 1 FROM ${c.estado} WHERE id = 1 AND ia_ligada = 1)
       AND m.direcao = 'entrada' AND m.criado_em > datetime('now', '-24 hours')
       AND NOT EXISTS (SELECT 1 FROM ${c.mensagens} n WHERE n.${c.chave} = m.${c.chave} AND n.id > m.id)
       AND NOT EXISTS (
         SELECT 1 FROM ${c.rascunhos} r
         WHERE r.${c.chave} = m.${c.chave} AND r.ate_mensagem_id = m.id AND r.status <> 'substituido'
           AND NOT (
             (r.status = 'falhou' AND r.tentativas < 3 AND r.criado_em < datetime('now', '-2 minutes')
               AND (r.erro IS NULL OR r.erro NOT LIKE 'cota%' OR r.criado_em < date('now')))
             OR (r.status = 'gerando' AND r.tentativas < 3 AND r.criado_em < datetime('now', '-10 minutes'))
           )
       )
     ORDER BY m.id LIMIT ?`,
  ).bind(n).all()
  return results.map((l) => l.conversa)
}
