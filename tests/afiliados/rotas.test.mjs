import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb, novoAfiliado } from './_base.mjs'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export function cookies() {}'),
  '@/lib/d1': modulo(`export const getDB = () => globalThis.__db; export const getEnv = () => ({})
    export const umaLinha = async (db, sql, ...v) => db.prepare(sql).bind(...v).first()
    export const executar = async (db, sql, ...v) => db.prepare(sql).bind(...v).run()`),
  '@/lib/site': modulo("export const site = { url: 'https://trilhaviva.org/' }"),
  '@/lib/sessao': modulo(`export const clienteAtual = async () => globalThis.__cliente
    export const normalizarEmail = (v) => String(v || '').trim().toLowerCase()`),
  '@/lib/leads': modulo(`export async function verificarTurnstile() {
    return globalThis.__turnstileFalha ? Response.json({ ok: false, erro: 'x' }, { status: 400 }) : null }`),
  '@/lib/email': modulo(`export const emailConfigurado = () => true
    export async function enviarContaAfiliado(d) { globalThis.__emails.push({ tipo: 'conta', ...d }); return true }
    export async function enviarBoasVindasAfiliado(d) { globalThis.__emails.push({ tipo: 'boas', ...d }); return true }`),
  '@/lib/clientes': modulo(`
    export async function acharOuCriar({ email, nome }) {
      const db = globalThis.__db
      await db.prepare('INSERT OR IGNORE INTO clientes (email, nome) VALUES (?, ?)').bind(email, nome).run()
      return db.prepare('SELECT * FROM clientes WHERE email = ?').bind(email).first()
    }
    export async function criarToken({ clienteId, tipo, horas }) {
      const t = 'tok' + Math.random().toString(36).slice(2)
      await globalThis.__db.prepare('INSERT INTO tokens (cliente_id, token_hash, tipo, expira_em) VALUES (?, ?, ?, datetime(\\'now\\', ?))')
        .bind(clienteId, 'h' + t, tipo, '+' + horas + ' hours').run()
      return t
    }`),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const conta = await import('../../app/api/afiliados/conta/route.js')
const codigoRota = await import('../../app/api/afiliados/codigo/route.js')
const cadastro = await import('../../app/api/afiliados/cadastro/route.js')
const clique = await import('../../app/api/afiliados/clique/route.js')
const { temCompra } = await import('../../lib/sessao.js')

const HOST = 'https://trilhaviva.org'
function montar({ logado = true } = {}) {
  const db = novoDb()
  globalThis.__db = db
  globalThis.__emails = []
  globalThis.__turnstileFalha = false
  const cli = db.banco.prepare("INSERT INTO clientes (email, nome) VALUES ('ana@t.com', 'Ana') RETURNING id").get()
  globalThis.__cliente = logado ? { id: Number(cli.id), email: 'ana@t.com', nome: 'Ana', bloqueado: 0 } : null
  return { db, clienteId: Number(cli.id) }
}
const post = (rota, corpo, cab = {}) =>
  rota.POST(new Request(`${HOST}/api/x`, {
    method: 'POST',
    headers: { host: 'trilhaviva.org', 'content-type': 'application/json', ...cab },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  }))
const FORM = { nome: 'Ana Souza', cpf: '529.982.247-25', telefone: '(27) 99999-1234', canal: '@ana', codigo: 'ana2026', aceite: true }
const n = (db, sql, ...a) => Number(db.banco.prepare(sql).get(...a).n)

test('codigo: exige login e recusa reservado, cupom, em uso e formato ruim', async () => {
  const { db } = montar()
  const pedir = async (c) => {
    const r = await codigoRota.GET(new Request(`${HOST}/api/afiliados/codigo?c=${c}`))
    return [r, await r.json()]
  }
  globalThis.__cliente = null
  assert.equal((await pedir('ANA2026'))[0].status, 401)
  globalThis.__cliente = { id: 1, email: 'ana@t.com', bloqueado: 0 }
  db.banco.exec("INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por) VALUES ('PROMO10', 'percentual', 10, '2030-01-01', 5, 'x')")
  const [r1, j1] = await pedir('ana2026')
  assert.equal(r1.headers.get('cache-control'), 'no-store, max-age=0')
  assert.deepEqual(j1, { ok: true, codigo: 'ANA2026', disponivel: true })
  for (const c of ['trilhaviva', 'ADMIN', 'promo10', 'ab', 'COM%20ESPACO', 'ABCDEFGHIJKLMNOP']) {
    const [, j] = await pedir(c)
    assert.equal(j.disponivel, false, c)
    assert.ok(j.motivo, c)
  }
  const outro = novoAfiliado(db)
  const [, ocupado] = await pedir(db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(outro.id).codigo.toLowerCase())
  assert.equal(ocupado.disponivel, false)
})

test('cadastro: grava ativo, manda boas-vindas sem desconto e devolve link do site', async () => {
  const { db, clienteId } = montar()
  const r = await post(cadastro, FORM, { origin: HOST })
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { ok: true, codigo: 'ANA2026', link: 'https://trilhaviva.org/?ref=ANA2026', status: 'ativo', pixel: true })
  const a = db.banco.prepare('SELECT * FROM afiliados WHERE cliente_id = ?').get(clienteId)
  assert.equal(a.status, 'ativo')
  assert.equal(a.cpf, '52998224725')
  assert.equal(a.telefone, '27999991234')
  assert.ok(a.termos_aceitos_em)
  assert.equal(n(db, "SELECT COUNT(*) AS n FROM registro WHERE acao = 'afiliado_cadastro' AND detalhe NOT LIKE '%5299%'"), 1)
  const boas = globalThis.__emails.find((e) => e.tipo === 'boas')
  assert.equal(boas.para, 'ana@t.com')
  assert.deepEqual(boas.niveis.map((x) => x.nome), ['Bronze', 'Prata', 'Ouro'])
})

// CompleteRegistration: o servidor manda à Meta o mesmo event_id do Pixel e
// grava a origem (UTM do anúncio) no afiliado. Contato de teste não vai à Meta.
async function comMetaFalsa(fn) {
  const enviados = []
  const fetchOriginal = globalThis.fetch
  process.env.META_CAPI_TOKEN = 'tok-teste'
  globalThis.fetch = async (url, op) => {
    enviados.push({ url: String(url), corpo: JSON.parse(op.body) })
    return new Response('{}', { status: 200 })
  }
  try {
    await fn(enviados)
  } finally {
    globalThis.fetch = fetchOriginal
    delete process.env.META_CAPI_TOKEN
  }
}
const COOKIE_ANUNCIO = 'tv_origem=' + encodeURIComponent(JSON.stringify({
  primeiro: { source: 'meta', medium: 'paid', campaign: 'afiliados' },
  ultimo: { source: 'meta', medium: 'paid', campaign: 'afiliados', content: 'video1' },
})) + '; _fbp=fb.1.1.123'

test('cadastro: CompleteRegistration com o event_id do navegador e origem gravada', async () => {
  await comMetaFalsa(async (enviados) => {
    const { db, clienteId } = montar()
    const r = await post(cadastro, { ...FORM, eventoId: 'ev-123' }, { cookie: COOKIE_ANUNCIO, 'cf-connecting-ip': '1.2.3.4' })
    assert.equal((await r.json()).pixel, true)
    assert.equal(enviados.length, 1)
    const ev = enviados[0].corpo.data[0]
    assert.equal(ev.event_name, 'CompleteRegistration')
    assert.equal(ev.event_id, 'ev-123')
    assert.equal(ev.event_source_url, 'https://trilhaviva.org/minha-conta/afiliado')
    assert.equal(ev.user_data.fbp, 'fb.1.1.123')
    assert.equal(ev.user_data.client_ip_address, '1.2.3.4')
    assert.ok(ev.user_data.em)
    const a = db.banco.prepare('SELECT origem FROM afiliados WHERE cliente_id = ?').get(clienteId)
    assert.equal(a.origem, 'utm=meta/paid/afiliados/video1')
  })
})

test('cadastro: contato de teste não manda evento à Meta nem pede o Pixel; sem UTM a origem fica vazia', async () => {
  await comMetaFalsa(async (enviados) => {
    const { db, clienteId } = montar()
    db.banco.exec("INSERT INTO contatos_teste (valor, tipo) VALUES ('ana@t.com', 'email')")
    const j = await (await post(cadastro, FORM)).json()
    assert.equal(j.ok, true)
    assert.equal(j.pixel, false)
    assert.equal(enviados.length, 0)
    assert.equal(db.banco.prepare('SELECT origem FROM afiliados WHERE cliente_id = ?').get(clienteId).origem, null)
  })
})

test('cadastro: aprovação manual vira pendente; programa fechado recusa', async () => {
  const { db } = montar()
  db.banco.exec('UPDATE afiliados_config SET aprovacao_automatica = 0')
  const r = await post(cadastro, FORM)
  assert.equal((await r.json()).status, 'pendente')
  const m2 = montar()
  m2.db.banco.exec('UPDATE afiliados_config SET programa_aberto = 0')
  const f = await post(cadastro, FORM)
  assert.equal(f.status, 403)
  assert.equal((await f.json()).erro, 'Cadastros encerrados no momento.')
  assert.equal(n(m2.db, 'SELECT COUNT(*) AS n FROM afiliados'), 0)
})

test('cadastro: 409 para cliente repetido e para código em uso; 400/401/403 nas outras falhas', async () => {
  const { db } = montar()
  assert.equal((await post(cadastro, FORM)).status, 200)
  const dois = await post(cadastro, { ...FORM, codigo: 'OUTRO123' })
  assert.equal(dois.status, 409)
  const m2 = montar()
  m2.db.banco.exec("INSERT INTO clientes (id, email) VALUES (999, 'z@t.com')")
  m2.db.banco.exec("INSERT INTO afiliados (cliente_id, codigo, status, nome, cpf) VALUES (999, 'ANA2026', 'ativo', 'X', '1')")
  const uso = await post(cadastro, FORM)
  assert.equal(uso.status, 409)
  assert.equal((await uso.json()).campo, 'codigo')
  m2.db.banco.exec("INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por) VALUES ('PROMO10', 'percentual', 10, '2030-01-01', 5, 'x')")
  assert.equal((await post(cadastro, { ...FORM, codigo: 'promo10' })).status, 409)
  const reservado = await post(cadastro, { ...FORM, codigo: 'TRILHA' })
  assert.deepEqual([reservado.status, (await reservado.json()).campo], [400, 'codigo'])
  for (const [campo, mudanca] of [['cpf', { cpf: '111.111.111-11' }], ['telefone', { telefone: '123' }], ['aceite', { aceite: 'true' }], ['nome', { nome: '' }]]) {
    const r = await post(cadastro, { ...FORM, ...mudanca })
    assert.deepEqual([r.status, (await r.json()).campo], [400, campo])
  }
  assert.equal((await post(cadastro, '{ruim')).status, 400)
  assert.equal((await post(cadastro, FORM, { origin: 'https://outro.com' })).status, 403)
  montar({ logado: false })
  assert.equal((await post(cadastro, FORM)).status, 401)
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados'), 1)
})

test('cadastro: CPF que já tem cadastro de afiliado dá 409 (auditoria B11)', async () => {
  const { db } = montar()
  db.banco.exec("INSERT INTO clientes (id, email) VALUES (998, 'outra@t.com')")
  db.banco.exec("INSERT INTO afiliados (cliente_id, codigo, status, nome, cpf) VALUES (998, 'OUTRA01', 'ativo', 'Outra', '52998224725')")
  const r = await post(cadastro, FORM)
  assert.deepEqual([r.status, (await r.json()).campo], [409, 'cpf'])
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados'), 1)
})

test('clique: grava 1 por visitante em 24 h; código inexistente ou inativo devolve 204 sem gravar', async () => {
  process.env.LEMBRETE_SEGREDO = 'segredo-de-teste'
  const { db } = montar()
  const af = novoAfiliado(db)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const susp = novoAfiliado(db, { status: 'suspenso' })
  const codSusp = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(susp.id).codigo
  const cab = { 'cf-connecting-ip': '203.0.113.9', 'user-agent': 'Mozilla/5.0 (iPhone) Mobile' }
  const corpo = { codigo: codigo.toLowerCase(), caminho: '/musicas/x?a=1', utm_source: 'IG', utm_medium: 'bio', utm_campaign: 'c<>1', utm_content: 'story' }
  for (let i = 0; i < 3; i++) {
    const r = await post(clique, corpo, cab)
    assert.equal(r.status, 204)
  }
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados_cliques'), 1)
  const linha = db.banco.prepare('SELECT * FROM afiliados_cliques').get()
  assert.equal(linha.afiliado_id, af.id)
  assert.equal(linha.pagina, '/musicas/x')
  assert.equal(linha.utm_source, 'ig')
  assert.equal(linha.utm_campaign, 'c1')
  assert.equal(linha.dispositivo, 'celular')
  assert.match(linha.visitante_hash, /^[0-9a-f]{64}$/)
  assert.ok(!JSON.stringify(linha).includes('203.0.113.9'))
  // outro visitante conta; depois de 24 h o mesmo visitante conta de novo
  await post(clique, corpo, { ...cab, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0)' })
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados_cliques'), 2)
  assert.equal(db.banco.prepare("SELECT dispositivo FROM afiliados_cliques ORDER BY id DESC").get().dispositivo, 'computador')
  db.banco.exec("UPDATE afiliados_cliques SET criado_em = datetime('now', '-25 hours')")
  await post(clique, corpo, cab)
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados_cliques'), 3)
  // inexistente, suspenso, lixo: sempre 204, nada gravado
  for (const c of [{ codigo: 'NAOEXISTE' }, { codigo: codSusp }, { codigo: '' }, { codigo: 5 }, 'nao-json', '[]']) {
    const r = await post(clique, c, cab)
    assert.equal(r.status, 204)
    assert.equal(await r.text(), '')
  }
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados_cliques'), 3)
})

test('conta: responde sempre 200 ok, cria cliente e manda link de criar senha; quem já tem senha recebe e-mail de entrada', async () => {
  const { db } = montar({ logado: false })
  const corpo = { nome: 'Bia', email: ' Bia@T.com ', turnstile: 'ok' }
  const r1 = await post(conta, corpo, { 'cf-connecting-ip': '198.51.100.1' })
  assert.equal(r1.status, 200)
  assert.deepEqual(await r1.json(), { ok: true })
  assert.equal(r1.headers.get('cache-control'), 'no-store, max-age=0')
  const bia = db.banco.prepare("SELECT * FROM clientes WHERE email = 'bia@t.com'").get()
  assert.ok(bia)
  assert.equal(n(db, "SELECT COUNT(*) AS n FROM tokens WHERE cliente_id = ? AND tipo = 'criar_senha'", bia.id), 1)
  assert.ok(globalThis.__emails[0].token)
  // pedido repetido em menos de 1 min: mesma resposta, sem novo token
  const r2 = await post(conta, corpo, { 'cf-connecting-ip': '198.51.100.1' })
  assert.deepEqual(await r2.json(), { ok: true })
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM tokens WHERE cliente_id = ?', bia.id), 1)
  // cliente com senha (supabase_id): mesma resposta, e-mail sem token
  db.banco.exec("INSERT INTO clientes (email, supabase_id) VALUES ('com@senha.com', 'sb-1')")
  const r3 = await post(conta, { nome: 'Caio', email: 'com@senha.com', turnstile: 'ok' }, { 'cf-connecting-ip': '198.51.100.1' })
  assert.deepEqual([r3.status, await r3.json()], [200, { ok: true }])
  const ultimo = globalThis.__emails.at(-1)
  assert.equal(ultimo.para, 'com@senha.com')
  assert.equal(ultimo.token, undefined)
  // bloqueado: mesma resposta, nada enviado
  db.banco.exec("INSERT INTO clientes (email, bloqueado) VALUES ('bloq@t.com', 1)")
  const antes = globalThis.__emails.length
  const r4 = await post(conta, { nome: 'Dani', email: 'bloq@t.com', turnstile: 'ok' }, { 'cf-connecting-ip': '198.51.100.1' })
  assert.deepEqual([r4.status, await r4.json()], [200, { ok: true }])
  assert.equal(globalThis.__emails.length, antes)
})

test('conta: 400 dados ruins ou Turnstile, 403 outra origem, 429 no 6º pedido do IP', async () => {
  montar({ logado: false })
  const ip = { 'cf-connecting-ip': '198.51.100.7' }
  assert.equal((await post(conta, { nome: 'A', email: 'a@t.com' }, ip)).status, 400)
  assert.equal((await post(conta, { nome: 'Ana', email: 'sem-arroba' }, ip)).status, 400)
  assert.equal((await post(conta, '{ruim', ip)).status, 400)
  assert.equal((await post(conta, { nome: 'Ana', email: 'a@t.com' }, { ...ip, origin: 'https://outro.com' })).status, 403)
  globalThis.__turnstileFalha = true
  assert.equal((await post(conta, { nome: 'Ana', email: 'a@t.com', turnstile: 'x' }, ip)).status, 400)
  globalThis.__turnstileFalha = false
  for (let i = 0; i < 5; i++) {
    assert.equal((await post(conta, { nome: 'Ana', email: `p${i}@t.com`, turnstile: 'ok' }, ip)).status, 200)
  }
  assert.equal((await post(conta, { nome: 'Ana', email: 'p9@t.com', turnstile: 'ok' }, ip)).status, 429)
  // outro IP segue livre
  assert.equal((await post(conta, { nome: 'Ana', email: 'q@t.com', turnstile: 'ok' }, { 'cf-connecting-ip': '198.51.100.8' })).status, 200)
})

test('conta de afiliado criada pela rota NÃO dá acesso ao acervo (temCompra segue exigindo compra)', async () => {
  const { db } = montar({ logado: false })
  await post(conta, { nome: 'Edu', email: 'edu@t.com', turnstile: 'ok' }, { 'cf-connecting-ip': '198.51.100.20' })
  const edu = db.banco.prepare("SELECT id FROM clientes WHERE email = 'edu@t.com'").get()
  db.banco.exec(`UPDATE clientes SET supabase_id = 'sb-edu' WHERE id = ${edu.id}`) // senha criada
  db.banco.prepare("INSERT INTO afiliados (cliente_id, codigo, status, nome, cpf) VALUES (?, 'EDU2026', 'ativo', 'Edu', '1')").run(edu.id)
  assert.equal(await temCompra(Number(edu.id), db), false)
  db.banco.prepare("INSERT INTO compras (cliente_id, stripe_session_id, status) VALUES (?, 'mp_9', 'pago')").run(edu.id)
  assert.equal(await temCompra(Number(edu.id), db), true)
})
