import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { D1Local, criarBanco } from './_d1local.mjs'
import { consultarLeads } from '../../lib/gestao/leads.js'
import { validarPeriodo } from '../../lib/gestao/datas.js'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export async function cookies() { return { get() { return { value: "t" } } } }'),
  'next/navigation': modulo('export function notFound() { const e = new Error("404"); e.codigo = "NAO_ENCONTRADO"; throw e }'),
  '@/lib/d1': modulo('export const getDB = () => globalThis.__db; export const getEnv = () => ({}); export const executar = async () => null; export const umaLinha = async () => null'),
  '@/lib/gestao/sessao': modulo('export const adminPeloToken = async () => globalThis.__admin'),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const funil = await import('../../app/api/interno/gestao/leads/funil/route.js')
const parar = await import('../../app/api/interno/gestao/leads/[id]/parar/route.js')
const agora = await import('../../app/api/interno/gestao/leads/[id]/enviar-agora/route.js')

const ADMIN = { papel: 'master', precisa_trocar_senha: false, cliente: { id: 1, email: 'Master@T.com' } }
const HOST = 'https://trilhaviva.org'
const periodo = validarPeriodo('2026-11-01', '2026-11-01')
const ctx = (id) => ({ params: Promise.resolve({ id: String(id) }) })
const post = (caminho, corpo, cabecalhos = {}) => new Request(HOST + caminho, {
  method: 'POST', headers: { 'content-type': 'application/json', host: 'trilhaviva.org', ...cabecalhos }, body: JSON.stringify(corpo),
})

function montar() {
  const db = new D1Local(criarBanco())
  const b = db.banco
  const lead = (id, extra = {}) => {
    b.prepare(`INSERT INTO leads (id, nome, email, whatsapp, consentimento, consentimento_em, token_hash, token_expira_em, criado_em,
        primeiro_download_em, comprou, descadastrado, etapa_email, whatsapp_etapa, encerrado_em, encerrado_motivo)
      VALUES (?, ?, ?, '27999990000', 1, ?, ?, '2026-11-08 00:00:00', ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, `Lead ${id}`, `l${id}@example.com`, extra.criado || '2026-11-01 15:00:00', `h${id}`, extra.criado || '2026-11-01 15:00:00',
      extra.baixou ? '2026-11-01 16:00:00' : null, extra.comprou ? 1 : 0, extra.descadastrado ? 1 : 0,
      extra.email ?? 0, extra.wa ?? 0, extra.encerrado ? '2026-11-05 10:00:00' : null, extra.motivo ?? null)
  }
  const zap = (id, etapa, status) => b.prepare("INSERT INTO leads_whatsapp (lead_id, etapa, modelo, wa_msg_id, wa_status) VALUES (?, ?, ?, ?, ?)")
    .run(id, etapa, `lead_vs_${etapa}`, `wamid.${id}.${etapa}`, status)
  lead(1, { baixou: true, email: 8, wa: 4, encerrado: true, motivo: 'concluido' })
  lead(2, { baixou: true, comprou: true, email: 2, wa: 1, encerrado: true, motivo: 'comprou' })
  lead(3, { descadastrado: true, email: 1, encerrado: true, motivo: 'descadastrou' })
  lead(4, { email: 3, wa: 2, encerrado: true, motivo: 'parado' })
  lead(5)
  lead(6, { criado: '2026-11-03 15:00:00', wa: 1 }) // fora do período
  zap(1, 1, 'read'); zap(1, 2, 'delivered'); zap(1, 3, 'sent'); zap(1, 4, 'failed')
  zap(2, 1, 'delivered'); zap(4, 1, 'sent'); zap(4, 2, 'sent'); zap(6, 1, 'read')
  b.exec(`INSERT INTO clientes (id, email) VALUES (2, 'l2@example.com');
    INSERT INTO compras (cliente_id, stripe_session_id, status, teste, utm_source, utm_medium, utm_campaign)
      VALUES (2, 'mp_1', 'pago', 0, 'whatsapp', 'lead', 'lead_vs_2');
    INSERT INTO carrinhos (id, email, utm_source, utm_medium, utm_campaign) VALUES ('c2', 'l2@example.com', 'whatsapp', 'lead', 'lead_vs_2');`)
  return { db, b }
}

test('funil: números conferidos à mão (período, WhatsApp por etapa, e-mails, encerramentos, custo)', async () => {
  const { db } = montar()
  globalThis.__db = db
  globalThis.__admin = ADMIN
  delete process.env.WA_CUSTO_CENTAVOS
  const r = await funil.GET(new Request(`${HOST}/api/interno/gestao/leads/funil?de=2026-11-01&ate=2026-11-01`))
  assert.equal(r.status, 200)
  assert.match(r.headers.get('Cache-Control'), /no-store/)
  const f = await r.json()
  assert.equal(f.cadastros, 5)
  assert.equal(f.baixaram, 2)
  assert.equal(f.compraram, 1)
  assert.equal(f.taxa_conversao, 20)
  assert.equal(f.clicaram, null)
  assert.equal(f.abriram_checkout_pelo_whatsapp, 1)
  assert.equal(f.compraram_pelo_whatsapp, 1)
  assert.equal(f.em_andamento, 1)
  assert.deepEqual(f.encerrados, { concluido: 1, comprou: 1, descadastrou: 1, parado: 1 })
  assert.deepEqual(f.whatsapp, [
    { etapa: 1, enviadas: 3, entregues: 2, lidas: 1, falhas: 0 },
    { etapa: 2, enviadas: 2, entregues: 1, lidas: 0, falhas: 0 },
    { etapa: 3, enviadas: 1, entregues: 0, lidas: 0, falhas: 0 },
    { etapa: 4, enviadas: 1, entregues: 0, lidas: 0, falhas: 1 },
  ])
  assert.deepEqual(f.emails.map((e) => e.receberam), [4, 3, 2, 1, 1, 1, 1, 1])
  assert.equal(f.mensagens_whatsapp, 6) // 7 registradas, 1 falhou
  assert.equal(f.custo_mensagem_centavos, 40)
  assert.equal(f.custo_whatsapp_centavos, 240)
  process.env.WA_CUSTO_CENTAVOS = '35'
  assert.equal((await (await funil.GET(new Request(`${HOST}/api/interno/gestao/leads/funil?de=2026-11-01&ate=2026-11-01`))).json()).custo_whatsapp_centavos, 210)
  delete process.env.WA_CUSTO_CENTAVOS
  assert.equal((await funil.GET(new Request(`${HOST}/api/interno/gestao/leads/funil?de=2026-02-30&ate=2026-03-01`))).status, 400)
})

test('lista de leads traz etapa, próximo envio de cada canal, encerrado, motivo e convertido', async () => {
  const { db, b } = montar()
  b.exec(`UPDATE leads SET proximo_email_em = '2026-11-20 12:00:00', whatsapp_etapa = 1, proximo_whatsapp_em = '2026-11-13 12:00:00' WHERE id = 5`)
  const lista = await consultarLeads(db, { ...periodo, pagina: 1 })
  assert.equal(db.consultas, 2) // continua em 2 consultas
  const por = Object.fromEntries(lista.itens.map((i) => [i.id, i]))
  assert.equal(por[5].etapa_email, 0)
  assert.equal(por[5].etapa_whatsapp, 1)
  assert.equal(por[5].proximo_email_em, '2026-11-20T12:00:00Z')
  assert.equal(por[5].proximo_whatsapp_em, '2026-11-13T12:00:00Z')
  assert.equal(por[5].encerrado, false)
  assert.equal(por[2].convertido, true)
  assert.equal(por[2].encerrado_motivo, 'comprou')
  assert.equal(por[2].proximo_whatsapp_em, null)
  assert.equal(por[1].encerrado, true)
  assert.equal(por[1].total_emails, 8)
  // etapa 0 sem data: consentimento + 5 minutos
  b.exec('INSERT INTO leads (id, nome, email, whatsapp, consentimento, consentimento_em, token_hash, token_expira_em, criado_em) VALUES (9, \'N\', \'n@e.com\', \'27999990000\', 1, \'2026-11-01 15:00:00\', \'h9\', \'2026-11-08 00:00:00\', \'2026-11-01 15:00:00\')')
  const de9 = (await consultarLeads(db, { ...periodo, pagina: 1 })).itens.find((i) => i.id === 9)
  assert.equal(de9.proximo_whatsapp_em, '2026-11-01T15:05:00Z')
})

test('rotas novas: 404 para quem não é admin, outra origem e métodos errados', async () => {
  const { db } = montar()
  globalThis.__db = db
  for (const admin of [null, { papel: 'membro', precisa_trocar_senha: true }]) {
    globalThis.__admin = admin
    await assert.rejects(() => funil.GET(new Request(`${HOST}/x?de=2026-11-01&ate=2026-11-01`)), (e) => e.codigo === 'NAO_ENCONTRADO')
    await assert.rejects(() => parar.POST(post('/x', {}), ctx(5)), (e) => e.codigo === 'NAO_ENCONTRADO')
    await assert.rejects(() => agora.POST(post('/x', { canal: 'email' }), ctx(5)), (e) => e.codigo === 'NAO_ENCONTRADO')
  }
  globalThis.__admin = ADMIN
  await assert.rejects(() => parar.POST(post('/x', {}, { origin: 'https://outro.com' }), ctx(5)), (e) => e.codigo === 'NAO_ENCONTRADO')
  assert.throws(() => parar.GET(), (e) => e.codigo === 'NAO_ENCONTRADO')
  assert.throws(() => agora.GET(), (e) => e.codigo === 'NAO_ENCONTRADO')
  assert.throws(() => funil.POST(), (e) => e.codigo === 'NAO_ENCONTRADO')
  assert.equal(db.banco.prepare('SELECT encerrado_em FROM leads WHERE id = 5').get().encerrado_em, null)
})

test('parar: encerra os dois canais com motivo "parado", registra a ação e a repetição dá 409', async () => {
  const { db, b } = montar()
  globalThis.__db = db
  globalThis.__admin = ADMIN
  b.exec("UPDATE leads SET proximo_email_em = '2026-11-20 12:00:00', proximo_whatsapp_em = '2026-11-13 12:00:00' WHERE id = 5")
  const r = await parar.POST(post('/x', {}, { origin: HOST }), ctx(5))
  assert.equal(r.status, 200)
  const l = b.prepare('SELECT * FROM leads WHERE id = 5').get()
  assert.equal(l.encerrado_motivo, 'parado')
  assert.ok(l.encerrado_em)
  assert.equal(l.proximo_email_em, null)
  assert.equal(l.proximo_whatsapp_em, null)
  const reg = b.prepare("SELECT quem, acao, alvo FROM registro WHERE acao = 'lead_parado'").all()
  assert.deepEqual(reg.map((x) => ({ ...x })), [{ quem: 'master@t.com', acao: 'lead_parado', alvo: '5' }])
  assert.equal((await parar.POST(post('/x', {}), ctx(5))).status, 409)
  assert.equal((await parar.POST(post('/x', {}), ctx(999))).status, 404)
  assert.equal((await parar.POST(post('/x', {}), ctx('abc'))).status, 400)
})

test('enviar agora: adianta o próximo envio do canal, não envia nada e valida canal e estado', async () => {
  const { db, b } = montar()
  globalThis.__db = db
  globalThis.__admin = ADMIN
  b.exec("UPDATE leads SET proximo_email_em = '2099-01-01 12:00:00', whatsapp_etapa = 1, proximo_whatsapp_em = '2099-01-01 12:00:00' WHERE id = 5")
  assert.equal((await agora.POST(post('/x', { canal: 'sms' }), ctx(5))).status, 400)
  assert.equal((await agora.POST(post('/x', {}), ctx(5))).status, 400)
  const r = await agora.POST(post('/x', { canal: 'whatsapp' }, { origin: HOST }), ctx(5))
  assert.equal(r.status, 200)
  assert.equal((await r.json()).saira_na_proxima_rodada, true)
  const l = b.prepare('SELECT proximo_email_em, proximo_whatsapp_em FROM leads WHERE id = 5').get()
  assert.ok(l.proximo_whatsapp_em < '2099')
  assert.equal(l.proximo_email_em, '2099-01-01 12:00:00') // só o canal pedido
  assert.equal((await agora.POST(post('/x', { canal: 'email' }), ctx(5))).status, 200)
  assert.equal(b.prepare("SELECT COUNT(*) AS n FROM registro WHERE acao = 'lead_enviar_agora'").get().n, 2)
  // processo encerrado, canal concluído ou lead inexistente
  assert.equal((await agora.POST(post('/x', { canal: 'email' }), ctx(1))).status, 409)
  assert.equal((await agora.POST(post('/x', { canal: 'email' }), ctx(999))).status, 404)
})
