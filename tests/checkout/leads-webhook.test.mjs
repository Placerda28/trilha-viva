import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'

const falsos = {
  'next/server': 'export const NextResponse = Response',
  'next/headers': 'export function cookies() {}',
  '@/lib/d1': `export function getDB() { return globalThis.__leadDb }
    export async function umaLinha(db, sql, ...v) { return db.prepare(sql).bind(...v).first() }
    export async function executar(db, sql, ...v) { return db.prepare(sql).bind(...v).run() }`,
  '@/lib/mercadopago': `
    export const assinaturaValida = async () => true
    export const buscarPagamento = async () => globalThis.__pagamento
    export const resumirPagamento = (p) => p
    export const idPagamentoValido = () => true
    export const mpConfigurado = () => true`,
  '@/lib/clientes': `
    export const acharOuCriar = async () => ({ id: 1 })
    export const criarToken = async () => 'token-de-teste'
    export async function registrarCompra(d) {
      globalThis.__ordem.push('compra')
      globalThis.__banco.prepare('INSERT OR IGNORE INTO compras VALUES (?, ?, ?)').run(d.sessionId, 'pago', d.teste ? 1 : 0)
    }`,
  '@/lib/email': `export async function enviarCriarSenha() { globalThis.__ordem.push('email'); return true }`,
  '@/lib/meta': 'export async function enviarEventoMeta() {}',
  '@/lib/site': "export const site = { url: 'https://trilhaviva.org' }",
  '@/lib/gestao/cupons': `
    export const cancelarReservaCupom = async () => {}
    export const desfazerEnvioAcesso = async () => {}
    export const estenderReservaCupom = async () => {}
    export async function reservarEnvioAcesso() { globalThis.__ordem.push('reserva'); return globalThis.__enviar }`,
  '@/lib/carrinhos': 'export const marcarCarrinhosPagos = async () => {}',
  '@/lib/rastreio-compra': 'export const gravarRastreioCompra = async () => {}',
  '@/lib/teste': `export const ehTeste = async () => globalThis.__teste
    export const enviarMetaSeReal = async () => ({ status: 'ok' })`,
  '@/lib/whatsapp-acesso': "export const enviarAcessoLiberado = async () => 'desligado'",
}
registerHooks({ resolve(nome, contexto, proximo) {
  if (falsos[nome]) return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(falsos[nome]) }
  if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
  return proximo(nome, contexto)
} })
const { POST } = await import('../../app/api/mercadopago/webhook/route.js')

function montar({ teste = false, falhar = false, enviar = true, testeGravado = false } = {}) {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0017_leads.sql', 'utf8'))
  banco.exec(`CREATE TABLE compras (stripe_session_id TEXT PRIMARY KEY, status TEXT, teste INTEGER);
    INSERT INTO leads (nome, email, whatsapp, token_hash, token_expira_em, proximo_email_em)
    VALUES ('Ana', 'ana@example.com', '27999999999', 'hash', '2026-12-01', datetime('now'));`)
  if (testeGravado) banco.exec("INSERT INTO compras VALUES ('mp_1', 'pago', 1)")
  globalThis.__banco = banco
  globalThis.__teste = teste
  globalThis.__enviar = enviar
  globalThis.__ordem = []
  globalThis.__pagamento = { status: 'paid', email: ' ANA@EXAMPLE.COM ', nome: 'Ana', compraId: 'mp_1', pagamentoId: '1', valorCentavos: 8990 }
  globalThis.__leadDb = { prepare(sql) {
    globalThis.__ordem.push('lead')
    if (falhar) throw new Error('falha simulada de leads')
    const consulta = banco.prepare(sql)
    return { bind(...valores) { return { async run() { return { meta: { changes: consulta.run(...valores).changes } } } } } }
  } }
  process.env.MP_WEBHOOK_SECRET = 'teste'
  return banco
}
const chamar = () => POST(new Request('https://trilhaviva.org/api/mercadopago/webhook?type=payment&data.id=1', { method: 'POST' }))

test('webhook marca após compra e antes da reserva de entrega; reenvio também atualiza lead', async () => {
  for (const enviar of [true, false]) {
    const banco = montar({ enviar })
    assert.equal((await chamar()).status, 200)
    assert.equal(banco.prepare('SELECT comprou FROM leads').get().comprou, 1)
    assert.deepEqual(globalThis.__ordem.slice(0, 3), ['compra', 'lead', 'reserva'])
    assert.equal(banco.prepare('SELECT proximo_email_em FROM leads').get().proximo_email_em, null)
  }
})

test('webhook não marca compra de teste atual ou já gravada como teste', async () => {
  for (const opcoes of [{ teste: true }, { testeGravado: true }]) {
    const banco = montar(opcoes)
    assert.equal((await chamar()).status, 200)
    assert.equal(banco.prepare('SELECT comprou FROM leads').get().comprou, 0)
  }
})

test('falha na tabela leads não derruba webhook nem envio do acesso', async (t) => {
  const banco = montar({ falhar: true })
  const erros = []
  t.mock.method(console, 'error', (...args) => erros.push(args))
  assert.equal((await chamar()).status, 200)
  assert.ok(globalThis.__ordem.includes('email'))
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM compras').get().n, 1)
  assert.equal(erros[0][0], 'mp marcar lead comprado')
})
