// POST /api/checkout com código de afiliado: só registra a venda (preço cheio), nunca bloqueia.
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb, novoAfiliado, contar } from '../afiliados/_base.mjs'

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
  '@/lib/carrinhos': modulo(`export const gravarCarrinho = async () => {}
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

let ip = 0
function montar() {
  const db = novoDb()
  globalThis.__db = db
  globalThis.__preferencias = []
  process.env.NEXT_PUBLIC_SITE_URL = 'https://trilhaviva.org'
  return db
}
async function comprar({ cupom, codigo_afiliado, cookie, email = 'comprador@example.com', telefone = '27988887777' } = {}) {
  ip += 1
  const res = await POST(new Request('https://trilhaviva.org/api/checkout', {
    method: 'POST',
    headers: { 'cf-connecting-ip': `9.9.9.${ip}`, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ nome: 'Ana', email, telefone, cupom, codigo_afiliado }),
  }))
  return { res, corpo: await res.json() }
}
const codigoDe = (db, af) => db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
const eventos = (db, evento) => contar(db, 'SELECT COUNT(*) AS n FROM afiliados_eventos WHERE evento = ?', evento)

test('código válido no corpo: preço cheio, código no pagamento e evento checkout_iniciado', async () => {
  const db = montar()
  const af = novoAfiliado(db)
  const codigo = codigoDe(db, af)
  const { res, corpo } = await comprar({ codigo_afiliado: ` ${codigo.toLowerCase()} ` })
  assert.equal(res.status, 200)
  assert.equal(corpo.url, 'https://mp.test/pagar')
  assert.equal('aviso_afiliado' in corpo, false)
  assert.equal(globalThis.__preferencias[0].afiliado, codigo)
  assert.equal(globalThis.__preferencias[0].valorCentavos, 8990)
  assert.equal(eventos(db, 'checkout_iniciado'), 1)
})

test('cookie tv_ref vale quando o corpo vem vazio; o corpo vence o cookie', async () => {
  const db = montar()
  const a = novoAfiliado(db)
  const b = novoAfiliado(db)
  await comprar({ cookie: `x=1; tv_ref=${codigoDe(db, a)}` })
  assert.equal(globalThis.__preferencias[0].afiliado, codigoDe(db, a))
  await comprar({ codigo_afiliado: codigoDe(db, b), cookie: `tv_ref=${codigoDe(db, a)}` })
  assert.equal(globalThis.__preferencias[1].afiliado, codigoDe(db, b))
  await comprar({ codigo_afiliado: '', cookie: '' })
  assert.equal(globalThis.__preferencias[2].afiliado, null)
})

test('código do próprio comprador: a compra segue sem afiliado, com aviso e evento', async () => {
  const db = montar()
  const af = novoAfiliado(db)
  const dono = db.banco.prepare('SELECT c.email FROM afiliados a JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ?').get(af.id).email
  const { res, corpo } = await comprar({ codigo_afiliado: codigoDe(db, af), email: dono })
  assert.equal(res.status, 200)
  assert.equal(corpo.url, 'https://mp.test/pagar')
  assert.match(corpo.aviso_afiliado, /próprio código/)
  assert.equal(globalThis.__preferencias[0].afiliado, null)
  assert.equal(globalThis.__preferencias[0].valorCentavos, 8990)
  assert.equal(eventos(db, 'codigo_recusado_proprio'), 1)
  assert.equal(eventos(db, 'checkout_iniciado'), 0)
  // Mesmo telefone do afiliado, e-mail diferente.
  db.banco.prepare('UPDATE afiliados SET telefone = ? WHERE id = ?').run('27988887777', af.id)
  await comprar({ codigo_afiliado: codigoDe(db, af), telefone: '(27) 98888-7777' })
  assert.equal(eventos(db, 'codigo_recusado_proprio'), 2)
})

test('código inativo ou inexistente: compra ok, sem afiliado, com aviso (inativo grava evento)', async () => {
  const db = montar()
  const af = novoAfiliado(db, { status: 'suspenso' })
  for (const codigo of [codigoDe(db, af), 'NAOEXISTE', 'x']) {
    const { res, corpo } = await comprar({ codigo_afiliado: codigo })
    assert.equal(res.status, 200)
    assert.match(corpo.aviso_afiliado, /não está valendo/)
  }
  assert.ok(globalThis.__preferencias.every((p) => p.afiliado === null && p.valorCentavos === 8990))
  assert.equal(eventos(db, 'codigo_recusado_inativo'), 1)
  assert.equal(contar(db, 'SELECT COUNT(*) AS n FROM afiliados_eventos'), 1)
})

test('cupom de campanha e código de afiliado funcionam juntos e independentes', async () => {
  const db = montar()
  const af = novoAfiliado(db)
  db.banco.exec(`INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por)
    VALUES ('PROMO10', 'percentual', 10, '2099-12-31 02:59:59', 5, 'm@example.com')`)
  const { res } = await comprar({ cupom: 'promo10', codigo_afiliado: codigoDe(db, af) })
  assert.equal(res.status, 200)
  const p = globalThis.__preferencias[0]
  assert.equal(p.cupom, 'PROMO10')
  assert.equal(p.valorCentavos, 8091) // o desconto é do cupom; o afiliado não muda o preço
  assert.equal(p.afiliado, codigoDe(db, af))
  // Sem afiliado, o cupom segue igual.
  await comprar({ cupom: 'PROMO10' })
  assert.equal(globalThis.__preferencias[1].valorCentavos, 8091)
  assert.equal(globalThis.__preferencias[1].afiliado, null)
})
