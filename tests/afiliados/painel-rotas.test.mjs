import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb, novoAfiliado } from './_base.mjs'
import { gravarComissaoBase } from '../../lib/afiliados/comissao.js'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export function cookies() {}'),
  '@/lib/d1': modulo('export const getDB = () => globalThis.__db'),
  '@/lib/site': modulo("export const site = { url: 'https://trilhaviva.org/', email: 'contato@trilhaviva.org' }"),
  '@/lib/sessao': modulo('export const clienteAtual = async () => globalThis.__cliente'),
  '@/lib/email': modulo(`export async function enviarSaqueSolicitado(d) {
    if (globalThis.__emailFalha) throw new Error('resend fora')
    globalThis.__emails.push(d); return true }`),
  '@/lib/senhas': modulo("export const conferirSenha = async ({ senha }) => ({ ok: senha === 'certa' })"),
  // Mesmo critério do login: 10 erros em 15 min trancam; acerto limpa os erros.
  '@/lib/clientes': modulo(`
    export async function podeTentar(email) {
      const r = await globalThis.__db.prepare("SELECT COUNT(*) AS n FROM tentativas WHERE email = ? AND sucesso = 0").bind(email).first()
      return Number(r.n) < 10
    }
    export async function anotarTentativa({ email, ip, sucesso }) {
      const db = globalThis.__db
      await db.prepare('INSERT INTO tentativas (email, ip, sucesso) VALUES (?, ?, ?)').bind(email, ip, sucesso ? 1 : 0).run()
      if (sucesso) await db.prepare('DELETE FROM tentativas WHERE email = ? AND sucesso = 0').bind(email).run()
    }`),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const rVendas = await import('../../app/api/afiliados/vendas/route.js')
const rGanhos = await import('../../app/api/afiliados/ganhos/route.js')
const rSaques = await import('../../app/api/afiliados/saques/route.js')
const rSaque = await import('../../app/api/afiliados/saque/route.js')
const rPix = await import('../../app/api/afiliados/pix/route.js')
const rAvisos = await import('../../app/api/afiliados/avisos/route.js')
const rPref = await import('../../app/api/afiliados/preferencias/route.js')

const HOST = 'https://trilhaviva.org'
const CPF = '52998224725'
const TRINTA_DIAS = () => new Date(Date.now() - 30 * 86400000)

function entrar(db, af, extra = {}) {
  const c = db.banco.prepare('SELECT id, email FROM clientes WHERE id = ?').get(af.clienteId)
  globalThis.__cliente = { id: Number(c.id), email: c.email, nome: 'X', bloqueado: 0, ...extra }
}
function montar() {
  const db = novoDb()
  globalThis.__db = db
  globalThis.__emails = []
  globalThis.__emailFalha = false
  const a = novoAfiliado(db)
  const b = novoAfiliado(db)
  for (const af of [a, b]) db.banco.prepare('UPDATE afiliados SET cpf = ? WHERE id = ?').run(CPF, af.id)
  entrar(db, a)
  return { db, a, b }
}
const get = (rota, query = '') => rota.GET(new Request(`${HOST}/api/x${query}`))
const post = (rota, corpo, cab = {}) =>
  rota.POST(new Request(`${HOST}/api/x`, {
    method: 'POST',
    headers: { host: 'trilhaviva.org', 'content-type': 'application/json', ...cab },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  }))
const n = (db, sql, ...a) => Number(db.banco.prepare(sql).get(...a).n)

async function vendaReal(db, af, email, quando = TRINTA_DIAS()) {
  db.banco.prepare('INSERT OR IGNORE INTO clientes (email) VALUES (?)').run(email)
  const cli = db.banco.prepare('SELECT id FROM clientes WHERE email = ?').get(email)
  const c = db.banco
    .prepare("INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, afiliado_id) VALUES (?, ?, 8990, 'pago', ?) RETURNING id")
    .get(cli.id, `mp_r_${email}_${Math.random()}`, af.id)
  await gravarComissaoBase(db, { afiliadoId: af.id, compraId: Number(c.id), aprovadoEm: quando })
  return Number(c.id)
}
const PIX = { tipo_chave: 'email', chave: 'Ana@Exemplo.com', titular_nome: 'Ana Souza', titular_cpf: '529.982.247-25', senha: 'certa' }

test('rotas GET: sem login 401, sem afiliado 404, no-store', async () => {
  const { db } = montar()
  for (const r of [rVendas, rGanhos, rSaques, rPix]) {
    globalThis.__cliente = null
    assert.equal((await get(r)).status, 401)
    db.banco.exec("INSERT OR IGNORE INTO clientes (id, email) VALUES (900, 'sem@t.com')")
    globalThis.__cliente = { id: 900, email: 'sem@t.com', bloqueado: 0 }
    assert.equal((await get(r)).status, 404)
  }
  const { a } = montar()
  const ok = await get(rGanhos)
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get('cache-control'), 'no-store, max-age=0')
  assert.ok(a)
})

test('vendas: mês inválido 400; comprador mascarado; A não vê B', async () => {
  const { db, a, b } = montar()
  await vendaReal(db, a, 'joao.silva@gmail.com')
  await vendaReal(db, b, 'maria@outro.com')
  const mes = new Date(Date.now() - 30 * 86400000 - 3 * 3600000).toISOString().slice(0, 7)
  assert.equal((await get(rVendas, '?mes=2026-13')).status, 400)
  assert.equal((await get(rVendas, '?mes=abc')).status, 400)
  const r = await get(rVendas, `?mes=${mes}`)
  const j = await r.json()
  assert.equal(r.status, 200)
  assert.equal(j.itens.length, 1)
  assert.equal(j.itens[0].comprador, 'jo***@gmail.com')
  assert.equal(j.itens[0].situacao, 'disponivel')
  const texto = JSON.stringify(j)
  assert.ok(!texto.includes('joao.silva') && !texto.includes('maria'))

  entrar(db, b)
  const jb = await (await get(rVendas, `?mes=${mes}`)).json()
  assert.deepEqual(jb.itens.map((i) => i.comprador), ['ma***@outro.com'])
})

test('ganhos e saques: formato e isolamento', async () => {
  const { db, a, b } = montar()
  await vendaReal(db, a, 'x@x.com')
  const g = await (await get(rGanhos)).json()
  assert.equal(g.historico[0].situacao, 'em_andamento')
  assert.equal(g.extrato.length, 1)
  assert.equal((await saqueOk()).ok, true)
  const s = await (await get(rSaques)).json()
  assert.equal(s.itens.length, 1)
  assert.equal(s.itens[0].temComprovante, false)
  assert.match(s.proximoSaqueEm, /^\d{4}-\d{2}-\d{2}$/)
  entrar(db, b)
  const sb = await (await get(rSaques)).json()
  assert.deepEqual([sb.itens, sb.proximoSaqueEm], [[], null])
  assert.deepEqual((await (await get(rGanhos)).json()).extrato, [])
})
async function saqueOk() {
  const r = await post(rSaque, {})
  return { ...(await r.json()), status: r.status }
}

test('saque: sucesso grava registro e avisa o dono; segundo pedido dá 409 com motivo e sem e-mail', async () => {
  process.env.ADMIN_MASTER = 'dono@trilhaviva.org'
  const { db, a } = montar()
  await vendaReal(db, a, 'x@x.com')
  const r = await post(rSaque, {}, { origin: HOST })
  const j = await r.json()
  assert.equal(r.status, 200)
  assert.deepEqual([j.ok, j.valor_centavos], [true, 1500])
  assert.ok(j.pedido_em)
  assert.equal(globalThis.__emails.length, 1)
  assert.deepEqual(
    [globalThis.__emails[0].para, globalThis.__emails[0].codigo, globalThis.__emails[0].valorCentavos],
    ['dono@trilhaviva.org', db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(a.id).codigo, 1500],
  )
  assert.equal(n(db, "SELECT COUNT(*) AS n FROM registro WHERE acao = 'afiliado_saque'"), 1)

  const de = await post(rSaque, {})
  assert.equal(de.status, 409)
  const dj = await de.json()
  assert.equal(dj.ok, false)
  assert.match(dj.motivo, /saque em análise/)
  assert.equal(globalThis.__emails.length, 1)
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados_saques'), 1)
})

test('saque: falha no e-mail só vira log; origem de fora 403; suspenso vê mas não saca', async () => {
  const { db, a, b } = montar()
  await vendaReal(db, a, 'x@x.com')
  assert.equal((await post(rSaque, {}, { origin: 'https://outro.com' })).status, 403)
  globalThis.__emailFalha = true
  const r = await post(rSaque, {})
  assert.equal(r.status, 200)
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados_saques'), 1)

  await vendaReal(db, b, 'y@y.com')
  db.banco.prepare("UPDATE afiliados SET status = 'suspenso' WHERE id = ?").run(b.id)
  entrar(db, b)
  assert.equal((await get(rVendas)).status, 200)
  assert.equal((await get(rGanhos)).status, 200)
  assert.equal((await get(rPix)).status, 200)
  const s = await post(rSaque, {})
  assert.equal(s.status, 409)
  assert.equal((await s.json()).motivo, 'Sua conta de afiliado não está ativa')
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados_saques WHERE afiliado_id = ?', b.id), 0)
})

test('pix: salva com senha certa, mascara na resposta e no GET, registro sem chave nem CPF', async () => {
  const { db, a } = montar()
  db.banco.prepare('DELETE FROM afiliados_pix WHERE afiliado_id = ?').run(a.id)
  db.banco.prepare("UPDATE clientes SET supabase_id = 'sb-1' WHERE id = ?").run(a.clienteId)
  assert.deepEqual(await (await get(rPix)).json(), { ok: true, pix: null, bloqueado: false, motivo: null })

  const r = await post(rPix, PIX, { origin: HOST })
  const j = await r.json()
  assert.equal(r.status, 200)
  assert.deepEqual(j.pix, { tipo_chave: 'email', chave_mascarada: 'an***@exemplo.com', titular_nome: 'Ana Souza', titular_cpf_mascarado: '***.982.247-**' })
  const gravado = db.banco.prepare('SELECT * FROM afiliados_pix WHERE afiliado_id = ?').get(a.id)
  assert.equal(gravado.chave, 'ana@exemplo.com')
  const g = await (await get(rPix)).json()
  assert.equal(g.pix.chave_mascarada, 'an***@exemplo.com')
  assert.ok(!JSON.stringify(g).includes('ana@exemplo.com'))
  const reg = db.banco.prepare("SELECT detalhe, alvo FROM registro WHERE acao = 'afiliado_pix'").all()
  assert.equal(reg.length, 1)
  assert.ok(!JSON.stringify(reg).includes('exemplo') && !JSON.stringify(reg).includes('5299'))
})

test('pix: senha errada 401 (e trava após 10), sem senha na conta 409, CPF de outro 400, saque aberto 409', async () => {
  const { db, a } = montar()
  assert.equal((await post(rPix, PIX)).status, 409) // sem supabase_id
  assert.equal((await (await post(rPix, PIX)).json()).codigo, 'sem_senha')
  db.banco.prepare("UPDATE clientes SET supabase_id = 'sb-1' WHERE id = ?").run(a.clienteId)
  const antes = db.banco.prepare('SELECT chave FROM afiliados_pix WHERE afiliado_id = ?').get(a.id).chave

  const errada = await post(rPix, { ...PIX, senha: 'errada' })
  assert.equal(errada.status, 401)
  assert.equal((await post(rPix, { ...PIX, senha: '' })).status, 401)
  assert.equal(db.banco.prepare('SELECT chave FROM afiliados_pix WHERE afiliado_id = ?').get(a.id).chave, antes)

  const outro = await post(rPix, { ...PIX, titular_cpf: '111.444.777-35' })
  assert.deepEqual([outro.status, (await outro.json()).campo], [400, 'titular_cpf'])
  for (const ruim of [{ tipo_chave: 'cpf', chave: '123' }, { tipo_chave: 'telefone', chave: '12' }, { tipo_chave: 'aleatoria', chave: 'abc' }, { tipo_chave: 'email', chave: 'sem-arroba' }, { tipo_chave: 'x', chave: 'y' }]) {
    assert.equal((await post(rPix, { ...PIX, ...ruim })).status, 400, JSON.stringify(ruim))
  }
  for (const boa of [{ tipo_chave: 'cpf', chave: '529.982.247-25' }, { tipo_chave: 'telefone', chave: '(27) 99999-1234' }, { tipo_chave: 'aleatoria', chave: '123e4567-e89b-12d3-a456-426614174000' }]) {
    assert.equal((await post(rPix, { ...PIX, ...boa })).status, 200, JSON.stringify(boa))
  }
  const tel = await (await get(rPix)).json()
  assert.equal(tel.pix.tipo_chave, 'aleatoria')
  assert.equal(tel.pix.chave_mascarada, '123e…4000')

  // saque aberto: troca recusada, no GET e no POST
  await vendaReal(db, a, 'x@x.com')
  assert.equal((await post(rSaque, {})).status, 200)
  const aberto = await post(rPix, PIX)
  assert.equal(aberto.status, 409)
  const g = await (await get(rPix)).json()
  assert.equal(g.bloqueado, true)
  assert.match(g.motivo, /saque em análise/)
  assert.equal(db.banco.prepare('SELECT tipo_chave FROM afiliados_pix WHERE afiliado_id = ?').get(a.id).tipo_chave, 'aleatoria')
})

test('pix: tipo CPF só aceita o CPF do próprio afiliado', async () => {
  const { db, a } = montar()
  db.banco.prepare("UPDATE clientes SET supabase_id = 'sb-1' WHERE id = ?").run(a.clienteId)
  const antes = db.banco.prepare('SELECT chave FROM afiliados_pix WHERE afiliado_id = ?').get(a.id).chave
  const r = await post(rPix, { ...PIX, tipo_chave: 'cpf', chave: '111.444.777-35' })
  assert.deepEqual([r.status, (await r.json()).campo], [400, 'chave'])
  assert.equal(db.banco.prepare('SELECT chave FROM afiliados_pix WHERE afiliado_id = ?').get(a.id).chave, antes)
  assert.equal((await post(rPix, { ...PIX, tipo_chave: 'cpf', chave: '529.982.247-25' })).status, 200)
})

test('pix: 10 senhas erradas seguidas travam (429) e o contador não é o do login', async () => {
  const { db, a } = montar()
  db.banco.prepare("UPDATE clientes SET supabase_id = 'sb-1' WHERE id = ?").run(a.clienteId)
  for (let i = 0; i < 10; i++) assert.equal((await post(rPix, { ...PIX, senha: 'errada' })).status, 401)
  assert.equal((await post(rPix, PIX)).status, 429) // até a senha certa espera
  assert.equal(n(db, "SELECT COUNT(*) AS n FROM tentativas WHERE email NOT LIKE 'pix:%'"), 0)
})

test('avisos: marca só os do próprio afiliado; preferências exigem boolean', async () => {
  const { db, a, b } = montar()
  const ins = db.banco.prepare("INSERT INTO afiliados_avisos (afiliado_id, tipo, titulo) VALUES (?, 'x', 't') RETURNING id")
  const idA = Number(ins.get(a.id).id)
  const idB = Number(ins.get(b.id).id)
  assert.equal((await post(rAvisos, { ids: [idA, idB] })).status, 200)
  const lido = (id) => db.banco.prepare('SELECT lido_em FROM afiliados_avisos WHERE id = ?').get(id).lido_em
  assert.ok(lido(idA))
  assert.equal(lido(idB), null)
  for (const ruim of [{ ids: [] }, { ids: 'x' }, { ids: [1.5] }, { ids: [-1] }, {}, { ids: Array.from({ length: 51 }, (_, i) => i + 1) }]) {
    assert.equal((await post(rAvisos, ruim)).status, 400, JSON.stringify(ruim))
  }
  assert.equal((await post(rAvisos, { ids: [idB] }, { origin: 'https://outro.com' })).status, 403)

  assert.equal((await post(rPref, { avisar_cada_venda: 'sim' })).status, 400)
  assert.equal((await post(rPref, { avisar_cada_venda: true })).status, 200)
  const flag = (id) => db.banco.prepare('SELECT avisar_cada_venda AS v FROM afiliados WHERE id = ?').get(id).v
  assert.deepEqual([flag(a.id), flag(b.id)], [1, 0])
  assert.equal((await post(rPref, { avisar_cada_venda: false })).status, 200)
  assert.equal(flag(a.id), 0)
})
