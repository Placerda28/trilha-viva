// Rascunhos da IA no WhatsApp (lado do robô): mesmo motor do Instagram, canal 'whatsapp'. Nunca envia nada.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { D1Local, criarBanco } from '../gestao/_d1local.mjs'
import { gerarRascunho, buscarFilaRascunhos } from '../../lib/instagram-ia/rascunho.js'
import { executarWhatsappIa } from '../../workers/recuperacao-carrinho/instagram.js'
import { atenderWebhook } from '../../workers/recuperacao-carrinho/whatsapp-webhook.js'
import { contarConsultas } from '../../workers/recuperacao-carrinho/orcamento.js'

const BOA = { resposta: 'Oi! Baixe a VS grátis: https://trilhaviva.org/vs-gratis', situacao: 'S14_vs_gratis', precisa_humano: false, motivo: '' }
const calado = { log() {}, warn() {}, error() {} }

function banco(ligada = true) {
  const db = new D1Local(criarBanco())
  if (ligada) db.banco.exec('UPDATE whatsapp_ia_estado SET ia_ligada = 1 WHERE id = 1')
  return db
}
const entrada = (db, tel, texto, direcao = 'entrada') =>
  db.banco.prepare('INSERT INTO whatsapp_mensagens (wa_msg_id, telefone, direcao, texto) VALUES (?, ?, ?, ?)')
    .run(Math.random().toString(36).slice(2), tel, direcao, texto)
function iaFalsa() {
  const chamadas = []
  return { chamadas, async run(modelo, corpo) { chamadas.push(corpo); return { response: BOA, usage: { prompt_tokens: 1, completion_tokens: 1 } } } }
}

test('WhatsApp: IA desligada = nada; ligada = rascunho pendente na tabela do WhatsApp, prompt fala de WhatsApp', async () => {
  const off = banco(false)
  entrada(off, '27999990000', 'tem VS grátis?')
  const ai0 = iaFalsa()
  assert.equal((await gerarRascunho({ DB: off }, '27999990000', { canal: 'whatsapp', ai: ai0, logger: calado })).status, 'desligada')
  assert.equal(ai0.chamadas.length, 0)

  const db = banco()
  entrada(db, '27999990000', 'oi', 'saida') // lembrete do robô antes
  entrada(db, '27999990000', 'tem VS grátis?')
  const ai = iaFalsa()
  const r = await gerarRascunho({ DB: db }, '27999990000', { canal: 'whatsapp', ai, logger: calado })
  assert.equal(r.status, 'pendente')
  const linha = db.banco.prepare('SELECT * FROM whatsapp_rascunhos').get()
  assert.equal(linha.telefone, '27999990000')
  assert.equal(linha.status, 'pendente')
  assert.match(ai.chamadas[0].messages[0].content, /para o WhatsApp da Trilha Viva/)
  assert.equal(db.banco.prepare('SELECT COUNT(*) n FROM instagram_rascunhos').get().n, 0)
})

test('WhatsApp: teto próprio (WA_IA_TETO_DIA) e fila só com IA ligada', async () => {
  const db = banco()
  entrada(db, '27999990001', 'oi')
  entrada(db, '27999990002', 'oi')
  assert.deepEqual(await buscarFilaRascunhos(db, 5, 'whatsapp'), ['27999990001', '27999990002'])
  const env = { DB: db, WA_IA_TETO_DIA: '1' }
  assert.equal((await gerarRascunho(env, '27999990001', { canal: 'whatsapp', ai: iaFalsa(), logger: calado })).status, 'pendente')
  assert.equal((await gerarRascunho(env, '27999990002', { canal: 'whatsapp', ai: iaFalsa(), logger: calado })).status, 'teto')
  db.banco.exec('UPDATE whatsapp_ia_estado SET ia_ligada = 0')
  assert.deepEqual(await buscarFilaRascunhos(db, 5, 'whatsapp'), [])
  await assert.rejects(() => buscarFilaRascunhos(db, 5, 'sms'), /canal desconhecido/)
})

test('cron: etapa whatsapp-ia usa a fila do WhatsApp; sem WA_PHONE_NUMBER_ID não faz nada', async () => {
  const pedidos = []
  const modulo = {
    CUSTO_FILA: 1, CUSTO_RASCUNHO: 5,
    buscarFilaRascunhos: async (_db, limite, canal) => { pedidos.push(canal); return ['27999990000'] },
    gerarRascunho: async (_env, tel, op) => { pedidos.push(`${op.canal}:${tel}`); return { status: 'pendente' } },
  }
  const db = contarConsultas(banco())
  const r = await executarWhatsappIa({ DB: db, WA_PHONE_NUMBER_ID: '1' }, { rascunho: modulo, logger: calado })
  assert.equal(r.gerados, 1)
  assert.deepEqual(pedidos, ['whatsapp', 'whatsapp:27999990000'])
  assert.deepEqual(await executarWhatsappIa({ DB: db }, { rascunho: modulo }), { gerados: 0, adiados: 0 })
})

function avisoWa(texto, id) {
  return JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: '123456' },
    contacts: [{ wa_id: '5527999990000', profile: { name: 'Maria' } }],
    messages: [{ from: '5527999990000', id, type: 'text', text: { body: texto } }],
  } }] }] })
}
async function postar(env, corpo, opcoes) {
  const assinatura = 'sha256=' + createHmac('sha256', env.WA_APP_SECRET).update(corpo).digest('hex')
  const req = new Request('https://robo.example/whatsapp', { method: 'POST', body: corpo, headers: { 'X-Hub-Signature-256': assinatura } })
  return atenderWebhook(req, env, opcoes)
}

test('webhook: mensagem nova pede rascunho (canal whatsapp) depois de responder; repetida e "sair" não pedem', async () => {
  const db = banco()
  const env = { DB: db, WA_APP_SECRET: 'segredo', WA_PHONE_NUMBER_ID: '123456', WA_TOKEN: 't', WA_GRAPH_VERSION: 'v26.0', RESEND_API_KEY: 'r', EMAIL_FROM: 'a@b', WA_ENCAMINHAR_PARA: 'c@d' }
  const pedidos = []
  const enviosMeta = []
  const fetchImpl = async (url) => { if (String(url).includes('graph.facebook.com')) enviosMeta.push(url); return new Response('{"id":"x","messages":[{"id":"wamid.c"}]}', { status: 200 }) }
  const rascunho = { CUSTO_RASCUNHO: 5, gerarRascunho: async (_env, tel, op) => { pedidos.push(`${op.canal}:${tel}`); return { status: 'pendente' } } }
  const tarefas = []
  const ctx = { waitUntil: (p) => tarefas.push(p) }

  assert.equal((await postar(env, avisoWa('tem VS grátis?', 'wamid.1'), { fetchImpl, rascunho, ctx, logger: calado })).status, 200)
  await Promise.all(tarefas)
  assert.deepEqual(pedidos, ['whatsapp:27999990000'])
  assert.equal(enviosMeta.length, 0, 'o rascunho nunca é enviado pelo robô')

  await postar(env, avisoWa('tem VS grátis?', 'wamid.1'), { fetchImpl, rascunho, ctx, logger: calado }) // aviso repetido
  await postar(env, avisoWa('sair', 'wamid.2'), { fetchImpl, rascunho, ctx, logger: calado }) // descadastro
  await Promise.all(tarefas)
  assert.deepEqual(pedidos, ['whatsapp:27999990000'])
})
