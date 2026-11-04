import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb, novoAfiliado, vendas } from './_base.mjs'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  '@/lib/d1': modulo('export const getDB = () => globalThis.__db'),
  '@/lib/gestao/permissao': modulo(`
    const nao = () => new Response('nao', { status: 404 })
    export const naoEncontrado = nao
    export const cabecalhosPrivados = { 'Cache-Control': 'no-store' }
    export const soAdmin = (h) => async (req) => globalThis.__papel ? h(req, { papel: globalThis.__papel, cliente: { email: 'm@t.com' } }) : nao()
    export const soMaster = (h) => async (req) => globalThis.__papel === 'master' ? h(req, { papel: 'master', cliente: { email: 'm@t.com' } }) : nao()`),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const rota = await import('../../app/api/interno/gestao/afiliados/fechamento/route.js')
const { fecharMes } = await import('../../lib/afiliados/fechamento.js')

const HOST = 'https://trilhaviva.org'
const JAN = new Date('2026-01-10T15:00:00Z') // mês liberado em qualquer data de teste
const get = (q = '') => rota.GET(new Request(`${HOST}/api/x${q}`))
const post = (corpo, cab = {}) => rota.POST(new Request(`${HOST}/api/x`, {
  method: 'POST', headers: { host: 'trilhaviva.org', 'content-type': 'application/json', ...cab }, body: JSON.stringify(corpo) }))
const prep = () => { globalThis.__db = novoDb(); globalThis.__papel = 'master'; return globalThis.__db }
const n = (db, sql) => Number(db.banco.prepare(sql).get().n)

test('quem não é admin recebe 404; membro lê mas não grava', async () => {
  prep()
  globalThis.__papel = null
  assert.equal((await get('?mes=2026-01')).status, 404)
  assert.equal((await post({ mes: '2026-01' })).status, 404)
  globalThis.__papel = 'membro'
  assert.equal((await get('?mes=2026-01')).status, 200)
  assert.equal((await post({ mes: '2026-01' })).status, 404)
})

test('POST de outra origem recebe 404', async () => {
  prep()
  assert.equal((await post({ mes: '2026-01' }, { origin: 'https://outro.com' })).status, 404)
})

test('mês inválido ou não liberado dá 400 com o texto do fechamento', async () => {
  prep()
  assert.equal((await post({ mes: 'x' })).status, 400)
  assert.equal((await get('?mes=2026-13')).status, 400)
  const r = await post({ mes: '2099-01' })
  assert.equal(r.status, 400)
  assert.match((await r.json()).erro, /só pode ser feito a partir de 08\/02\/2099/)
})

test('GET mostra pendente e rodado; POST fecha, registra e rodar 2 vezes não duplica', async () => {
  const db = prep()
  for (let i = 0; i < 2; i++) await vendas(db, novoAfiliado(db), 20, JAN)
  await vendas(db, novoAfiliado(db), 3, JAN)
  let g = await (await get('?mes=2026-01')).json()
  assert.equal(g.status, 'pendente')
  assert.equal(g.faltam, 3)
  const r = await post({ mes: '2026-01' })
  const c = await r.json()
  assert.equal(r.status, 200)
  assert.equal(c.fechados, 3)
  assert.equal(c.relatorio.status, 'rodado')
  assert.deepEqual(c.relatorio.por_nivel, [{ nivel: 'Prata', afiliados: 2 }, { nivel: 'Bronze', afiliados: 1 }])
  assert.equal(c.relatorio.total_mes_centavos, 2 * 40000 + 3 * 1500)
  assert.equal(c.relatorio.total_bonus_centavos, 2 * 20 * 500)
  assert.ok(c.relatorio.rodou_em)
  assert.equal(n(db, "SELECT COUNT(*) AS n FROM registro WHERE acao = 'afiliados_fechamento'"), 1)
  const outra = await (await post({ mes: '2026-01' })).json()
  assert.equal(outra.fechados, 0)
  assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados_fechamentos'), 3)
  assert.equal(n(db, "SELECT COUNT(*) AS n FROM afiliados_lancamentos WHERE tipo = 'bonus_nivel'"), 2)
  g = await (await get('?mes=2026-01')).json()
  assert.equal(g.status, 'rodado')
})

test('status parcial quando o limite deixa gente para depois', async () => {
  const db = prep()
  await vendas(db, novoAfiliado(db), 1, JAN)
  await vendas(db, novoAfiliado(db), 1, JAN)
  const r = await fecharMes(db, '2026-01', new Date(), { limite: 1 })
  assert.equal(r.fechados.length, 1)
  assert.equal(r.restam, true)
  const g = await (await get('?mes=2026-01')).json()
  assert.equal(g.status, 'parcial')
  assert.equal(g.faltam, 1)
})
