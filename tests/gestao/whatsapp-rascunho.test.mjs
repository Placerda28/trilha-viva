import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { criarBanco, D1Local } from './_d1local.mjs'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export async function cookies() { return { get() { return { value: "t" } } } }'),
  'next/navigation': modulo('export function notFound() { const e = new Error("404"); e.codigo = "NAO_ENCONTRADO"; throw e }'),
  '@/lib/d1': modulo('export const getDB = () => globalThis.__db; export const getEnv = () => globalThis.__env || {}'),
  '@/lib/gestao/sessao': modulo('export const adminPeloToken = async () => globalThis.__admin'),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const lista = await import('../../app/api/interno/gestao/whatsapp/route.js')
const responder = await import('../../app/api/interno/gestao/whatsapp/responder/route.js')
const enviar = await import('../../app/api/interno/gestao/whatsapp/rascunho/enviar/route.js')
const descartar = await import('../../app/api/interno/gestao/whatsapp/rascunho/descartar/route.js')
const regenerar = await import('../../app/api/interno/gestao/whatsapp/rascunho/regenerar/route.js')
const ia = await import('../../app/api/interno/gestao/whatsapp/ia/route.js')

const HOST = 'https://trilhaviva.org'
const ADMIN = { papel: 'master', precisa_trocar_senha: false, cliente: { id: 1, email: 'Paulo@T.com' } }
const TEL = '11999998888'

// Meta falsa no fetch global: guarda os pedidos e devolve um id de mensagem.
function metaFalsa({ falha = null } = {}) {
  const m = { pedidos: [] }
  globalThis.fetch = async (url, init) => {
    m.pedidos.push({ url, corpo: JSON.parse(init.body) })
    if (falha) return { ok: false, status: 400, json: async () => ({ error: falha }) }
    return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid-' + m.pedidos.length }] }) }
  }
  return m
}

function montar() {
  const banco = criarBanco()
  globalThis.__db = new D1Local(banco)
  globalThis.__admin = ADMIN
  globalThis.__env = { WA_TOKEN: 'segredo-wa', WA_PHONE_NUMBER_ID: '123', WA_GRAPH_VERSION: 'v22.0' }
  banco.exec(`
    INSERT INTO whatsapp_mensagens (id, wa_msg_id, telefone, direcao, texto, criado_em)
      VALUES (1, 'w1', '${TEL}', 'entrada', 'Tem desconto?', datetime('now', '-2 hours'));
    INSERT INTO whatsapp_rascunhos (id, telefone, ate_mensagem_id, texto, status)
      VALUES (1, '${TEL}', 1, 'Oi! Tem sim.', 'pendente');
    UPDATE whatsapp_ia_estado SET ia_ligada = 1 WHERE id = 1;`)
  return { banco, meta: metaFalsa() }
}

const cab = (extra = {}) => ({ host: 'trilhaviva.org', origin: HOST, 'content-type': 'application/json', ...extra })
const post = (rota, corpo, cabecalhos = {}) =>
  rota.POST(new Request(`${HOST}/x`, { method: 'POST', headers: cab(cabecalhos), body: JSON.stringify(corpo) }))
const get = (rota) => rota.GET(new Request(`${HOST}/x`, { headers: cab() }))
const um = (banco, sql, ...a) => banco.prepare(sql).get(...a)
const CORPO = { telefone: TEL, texto: 'Oi! Tem sim.', rascunho_id: 1 }

test('não admin e outra origem recebem 404; nada é enviado', async () => {
  const { meta } = montar()
  globalThis.__admin = null
  for (const rota of [enviar, descartar, regenerar, ia]) await assert.rejects(() => post(rota, CORPO), { codigo: 'NAO_ENCONTRADO' })
  globalThis.__admin = ADMIN
  for (const rota of [enviar, descartar, regenerar, ia]) {
    await assert.rejects(() => post(rota, CORPO, { origin: 'https://outro.site' }), { codigo: 'NAO_ENCONTRADO' })
    await assert.rejects(async () => get(rota), { codigo: 'NAO_ENCONTRADO' })
  }
  assert.equal(meta.pedidos.length, 0)
})

test('só o clique envia: listar, regenerar e ligar/desligar a IA nunca chamam a Meta', async () => {
  const { banco, meta } = montar()
  const l = await (await get(lista)).json()
  assert.equal(l.conversas[0].rascunho.status, 'pendente')
  assert.equal(l.ia.ia_ligada, true)
  assert.equal((await post(regenerar, CORPO)).status, 200)
  assert.equal((await post(ia, { ia_ligada: false })).status, 200)
  assert.equal(meta.pedidos.length, 0)
  assert.equal(um(banco, 'SELECT ia_ligada FROM whatsapp_ia_estado').ia_ligada, 0)
  assert.equal(um(banco, "SELECT COUNT(*) AS n FROM whatsapp_mensagens WHERE direcao = 'saida'").n, 0)
})

test('enviar o rascunho: manda uma vez, grava a saída, marca enviado e registra', async () => {
  const { banco, meta } = montar()
  assert.equal((await post(enviar, CORPO)).status, 200)
  assert.equal(meta.pedidos.length, 1)
  assert.equal(meta.pedidos[0].corpo.to, '55' + TEL)
  const r = um(banco, 'SELECT * FROM whatsapp_rascunhos WHERE id = 1')
  assert.deepEqual([r.status, r.texto_enviado, r.decidido_por], ['enviado', 'Oi! Tem sim.', 'paulo@t.com'])
  assert.equal(um(banco, "SELECT enviado_por FROM whatsapp_mensagens WHERE direcao = 'saida'").enviado_por, 'paulo@t.com')
  assert.equal(um(banco, "SELECT alvo FROM registro WHERE acao = 'whatsapp_rascunho_enviado'").alvo, TEL)
})

test('duas chamadas simultâneas: só uma envia', async () => {
  const { meta } = montar()
  const [a, b] = await Promise.all([post(enviar, CORPO), post(enviar, CORPO)])
  assert.deepEqual([a.status, b.status].sort(), [200, 409])
  assert.equal(meta.pedidos.length, 1)
})

test('texto editado vira editado, com texto_enviado', async () => {
  const { banco } = montar()
  await post(enviar, { ...CORPO, texto: 'Oi! Tem desconto sim.' })
  const r = um(banco, 'SELECT status, texto, texto_enviado FROM whatsapp_rascunhos WHERE id = 1')
  assert.deepEqual({ ...r }, { status: 'editado', texto: 'Oi! Tem sim.', texto_enviado: 'Oi! Tem desconto sim.' })
})

test('a Meta recusou: rascunho volta para pendente e dá para tentar de novo', async () => {
  const { banco } = montar()
  const meta = metaFalsa({ falha: { code: 131047, message: 'x' } })
  const res = await post(enviar, CORPO)
  assert.equal(res.status, 502)
  assert.equal(meta.pedidos.length, 1)
  const r = um(banco, 'SELECT status, texto_enviado, decidido_por FROM whatsapp_rascunhos WHERE id = 1')
  assert.deepEqual({ ...r }, { status: 'pendente', texto_enviado: null, decidido_por: null })
  metaFalsa()
  assert.equal((await post(enviar, CORPO)).status, 200)
})

test('telefone que não é do rascunho ou texto vazio: recusa sem enviar', async () => {
  const { meta } = montar()
  assert.equal((await post(enviar, { ...CORPO, telefone: '11888887777' })).status, 400)
  assert.equal((await post(enviar, { ...CORPO, texto: '  ' })).status, 400)
  assert.equal(meta.pedidos.length, 0)
})

test('descartar: marca descartado; segunda vez dá 409', async () => {
  const { banco } = montar()
  assert.equal((await post(descartar, { rascunho_id: 1 })).status, 200)
  assert.equal(um(banco, 'SELECT status FROM whatsapp_rascunhos WHERE id = 1').status, 'descartado')
  assert.equal((await post(descartar, { rascunho_id: 1 })).status, 409)
})

test('gerar outra: marca substituido; com a IA desligada dá 409', async () => {
  const { banco } = montar()
  banco.exec('UPDATE whatsapp_ia_estado SET ia_ligada = 0 WHERE id = 1')
  assert.equal((await post(regenerar, CORPO)).status, 409)
  assert.equal(um(banco, 'SELECT status FROM whatsapp_rascunhos WHERE id = 1').status, 'pendente')
  banco.exec('UPDATE whatsapp_ia_estado SET ia_ligada = 1 WHERE id = 1')
  assert.equal((await post(regenerar, CORPO)).status, 200)
  assert.equal(um(banco, 'SELECT status FROM whatsapp_rascunhos WHERE id = 1').status, 'substituido')
})

test('resposta manual marca o rascunho pendente como respondido_no_app', async () => {
  const { banco, meta } = montar()
  assert.equal((await post(responder, { telefone: TEL, texto: 'Oi, resposta minha' })).status, 200)
  assert.equal(meta.pedidos.length, 1)
  const r = um(banco, 'SELECT status, decidido_por FROM whatsapp_rascunhos WHERE id = 1')
  assert.deepEqual({ ...r }, { status: 'respondido_no_app', decidido_por: 'paulo@t.com' })
})
