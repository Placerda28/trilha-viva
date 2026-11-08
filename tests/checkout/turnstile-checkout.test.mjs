// Anti-robô no checkout (auditoria de 07/11/2026, M3 a M5): sem token válido,
// nada de reserva de cupom, carrinho, preferência ou evento; Cloudflare fora do
// ar não derruba a venda.
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb } from '../afiliados/_base.mjs'
import { consultarTurnstile } from '../../lib/turnstile.js'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  '@/lib/d1': modulo('export const getDB = () => globalThis.__db; export const getEnv = () => ({})'),
  '@/lib/stripe': modulo('export const getStripe = () => null; export const PRODUCT_NAME = "Pacote"'),
  '@/lib/site': modulo("export const site = { price: 89.9, url: 'https://trilhaviva.org' }"),
  '@/lib/mercadopago': modulo(`export const provedorAtivo = () => 'mercadopago'
    export async function criarPreferencia(d) { globalThis.__preferencias.push(d); return 'https://mp.test/pagar' }`),
  '@/lib/meta': modulo(`export const enviarEventoMeta = async () => ({ status: 'ok' })
    export const ipDoPedido = () => '1.2.3.4'
    export const lerCookiesMeta = () => ({ fbp: '', fbc: '' })
    export const lerOrigemVisita = () => null`),
  '@/lib/carrinhos': modulo(`export const gravarCarrinho = async () => { globalThis.__carrinhos += 1 }
    export const limparTelefone = (v) => String(v || '').replace(/\\D/g, '')
    export const limparUtm = () => ({ source: '', medium: '', campaign: '', content: '' })
    export const nomeValido = (n) => Boolean(n)
    export const origemDoCarrinho = () => 'direto'
    export const telefoneValido = (v) => String(v || '').replace(/\\D/g, '').length >= 10`),
  '@/lib/teste': modulo('export const ehContatoTeste = async () => false; export const enviarMetaSeReal = async () => ({ status: "ok" })'),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const { POST } = await import('../../app/api/checkout/route.js')

const URL_SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const pedido = (token, ip) => new Request('https://trilhaviva.org/api/checkout', {
  method: 'POST',
  headers: { 'cf-connecting-ip': ip },
  body: JSON.stringify({ nome: 'Ana', email: 'ana@example.com', telefone: '27988887777', ...(token === undefined ? {} : { turnstile: token }) }),
})
// Resposta falsa da Cloudflare: 'ok', 'invalido', 'outro-host' ou 'fora'.
function cloudflare(modo) {
  globalThis.fetch = async (url) => {
    assert.equal(url, URL_SITEVERIFY)
    if (modo === 'fora') throw new Error('rede')
    const hostname = modo === 'outro-host' ? 'golpe.example' : 'trilhaviva.org'
    return { ok: true, json: async () => ({ success: modo !== 'invalido', hostname }) }
  }
}

test('consultarTurnstile: sem token, inválido, de outro site, fora do ar e ok', async () => {
  const req = pedido()
  assert.equal(await consultarTurnstile(req, '', 's'), 'sem_token')
  assert.equal(await consultarTurnstile(req, 'x'.repeat(2049), 's'), 'sem_token')
  for (const [modo, esperado] of [['invalido', 'invalido'], ['outro-host', 'invalido'], ['fora', 'indisponivel'], ['ok', 'ok']]) {
    cloudflare(modo)
    assert.equal(await consultarTurnstile(req, 'tok', 's'), esperado, modo)
  }
})

test('checkout com a chave configurada: sem token válido não cria nada; ok e Cloudflare fora seguem a venda', async (t) => {
  t.mock.method(console, 'error', () => {})
  const original = globalThis.fetch
  process.env.TURNSTILE_SECRET_KEY = 'segredo'
  process.env.NEXT_PUBLIC_SITE_URL = 'https://trilhaviva.org'
  let ip = 0
  const comprar = async (token, modo) => {
    globalThis.__db = novoDb()
    globalThis.__preferencias = []
    globalThis.__carrinhos = 0
    if (modo) cloudflare(modo)
    ip += 1
    const res = await POST(pedido(token, `10.0.0.${ip}`))
    return { res, corpo: await res.json() }
  }
  try {
    for (const [token, modo] of [[undefined, null], ['tok', 'invalido'], ['tok', 'outro-host']]) {
      const { res, corpo } = await comprar(token, modo)
      assert.equal(res.status, 400, String(modo))
      assert.equal(corpo.turnstile, true)
      assert.match(corpo.error, /anti-robô/)
      assert.deepEqual([globalThis.__preferencias.length, globalThis.__carrinhos], [0, 0], 'nada criado')
    }
    for (const modo of ['ok', 'fora']) {
      const { res, corpo } = await comprar('tok', modo)
      assert.equal(res.status, 200, modo)
      assert.equal(corpo.url, 'https://mp.test/pagar')
      assert.equal(globalThis.__preferencias.length, 1)
    }
  } finally {
    delete process.env.TURNSTILE_SECRET_KEY
    globalThis.fetch = original
  }
})

test('checkout sem a chave (dev e testes antigos): segue sem pedir token', async () => {
  globalThis.__db = novoDb()
  globalThis.__preferencias = []
  globalThis.__carrinhos = 0
  const res = await POST(pedido(undefined, '10.0.1.1'))
  assert.equal(res.status, 200)
})
