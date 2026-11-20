// Lista de espera do Palco (POST /api/palco/lista-espera): validação, mesma origem,
// Turnstile, limite por IP, e-mail normalizado, sem duplicar e 503 sem a tabela.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'

registerHooks({ resolve(nome, contexto, proximo) {
  if (nome === 'next/headers') return { shortCircuit: true,
    url: 'data:text/javascript,export function cookies() { throw new Error("Não deve exigir login") }' }
  if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
  return proximo(nome, contexto)
} })
const { responderListaEspera, validarEspera } = await import('../../lib/palco-espera.js')

function montar({ comTabela = true } = {}) {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0017_leads.sql', 'utf8'))
  if (comTabela) banco.exec(readFileSync('migrations/0029_palco_lista_espera.sql', 'utf8'))
  const db = { prepare(sql) {
    const consulta = banco.prepare(sql)
    let valores = []
    return {
      bind(...v) { valores = v; return this },
      async first() { return consulta.get(...valores) || null },
      async run() { return { meta: { changes: consulta.run(...valores).changes } } },
    }
  } }
  return { banco, db }
}
const dados = { email: ' Ana@Example.COM ', sistema: 'windows' }
const req = (corpo = dados, headers = {}) => new Request('https://trilhaviva.org/api/palco/lista-espera', {
  method: 'POST', headers: { host: 'trilhaviva.org', 'cf-connecting-ip': '192.0.2.1', ...headers }, body: JSON.stringify(corpo),
})
const enviar = (db, corpo, extra = {}) => responderListaEspera(req(corpo), { db, ambiente: 'development', ...extra })
const linhas = (banco) => banco.prepare('SELECT email, sistema, criado_em FROM palco_lista_espera').all()

test('valida e-mail, sistema e tipos antes de gravar', async () => {
  const { db, banco } = montar()
  for (const campo of [{ email: '' }, { email: {} }, { email: 'errado' }, { email: 'a@@b.com' }, { sistema: 'linux' },
    { sistema: undefined }, { sistema: ['mac'] }, { turnstile: {} }]) {
    const r = await enviar(db, { ...dados, ...campo })
    assert.equal(r.status, 400, JSON.stringify(campo))
    const corpo = await r.json()
    assert.equal(corpo.ok, false)
    assert.ok(corpo.erro)
  }
  assert.deepEqual(validarEspera(null), { erro: 'Informe um e-mail válido.' })
  assert.equal(linhas(banco).length, 0)
})

test('grava e-mail normalizado com data, responde { ok } sem cache e não duplica', async () => {
  const { db, banco } = montar()
  const r = await enviar(db)
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { ok: true })
  assert.match(r.headers.get('cache-control'), /no-store/)
  assert.deepEqual(linhas(banco).map((l) => [l.email, l.sistema]), [['ana@example.com', 'windows']])
  assert.ok(linhas(banco)[0].criado_em)
  assert.equal((await enviar(db, { ...dados, email: 'ANA@example.com' })).status, 200)
  assert.equal(linhas(banco).length, 1)
  assert.equal((await enviar(db, { ...dados, sistema: 'mac' })).status, 200)
  assert.equal(linhas(banco).length, 2)
})

test('mesma origem obrigatória e corpo que não é JSON é recusado', async () => {
  const { db, banco } = montar()
  assert.equal((await responderListaEspera(req(dados, { origin: 'https://outro.org' }), { db, ambiente: 'development' })).status, 403)
  const ruim = new Request('https://trilhaviva.org/api/palco/lista-espera', { method: 'POST', body: 'não é json' })
  assert.equal((await responderListaEspera(ruim, { db, ambiente: 'development' })).status, 400)
  assert.equal(linhas(banco).length, 0)
})

test('Turnstile falha fechado em produção e só desenvolvimento dispensa a chave', async () => {
  const { db, banco } = montar()
  assert.equal((await enviar(db, dados, { ambiente: 'production' })).status, 503)
  assert.equal((await enviar(db, dados, { segredo: 'teste' })).status, 400) // sem token
  const resposta = (success) => async () => Response.json({ success, hostname: 'trilhaviva.org' })
  const corpo = { ...dados, turnstile: 'token-teste' }
  assert.equal((await enviar(db, corpo, { segredo: 'teste', buscar: resposta(false) })).status, 400)
  assert.equal(linhas(banco).length, 0)
  assert.equal((await enviar(db, corpo, { segredo: 'teste', buscar: resposta(true), ambiente: 'production' })).status, 200)
  assert.equal(linhas(banco).length, 1)
})

test('limite de 5 pedidos por hora por IP', async () => {
  const { db } = montar()
  const emails = Array.from({ length: 6 }, (_, i) => ({ ...dados, email: `p${i}@example.com` }))
  const status = []
  for (const c of emails) status.push((await enviar(db, c)).status)
  assert.deepEqual(status, [200, 200, 200, 200, 200, 429])
  assert.equal((await responderListaEspera(req(dados, { 'cf-connecting-ip': '192.0.2.9' }), { db, ambiente: 'development' })).status, 200)
})

test('sem o banco ou sem a tabela (migração não aplicada) responde 503 sem estourar', async () => {
  assert.equal((await enviar(null)).status, 503)
  const { db } = montar({ comTabela: false })
  const r = await enviar(db)
  assert.equal(r.status, 503)
  const corpo = await r.json()
  assert.equal(corpo.ok, false)
  assert.ok(corpo.erro)
})
