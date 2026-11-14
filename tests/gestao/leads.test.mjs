import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import { consultarLeads, consultarLeadsCsv } from '../../lib/gestao/leads.js'
import { validarPeriodo } from '../../lib/gestao/datas.js'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/navigation': modulo(`export function notFound() { throw Object.assign(new Error('404'), { codigo: 'NAO_ENCONTRADO' }) }; export function useRouter() {}; export function useSearchParams() {}`),
  'next/headers': modulo(`export async function cookies() { return { get() { return { value: 'token' } } } }`),
  '@/lib/gestao/sessao': modulo(`export async function adminPeloToken() { return globalThis.__adminLeads || null }`),
  '@/lib/d1': modulo(`export function getDB() { return globalThis.__dbLeads || null }`),
}
registerHooks({
  resolve(especificador, contexto, proximo) {
    if (falsos[especificador]) return { shortCircuit: true, url: falsos[especificador] }
    if (especificador === './formato' && contexto.parentURL?.endsWith('/usePeriodo.js')) {
      return { shortCircuit: true, url: pathToFileURL(resolve('components/gestao/formato.js')).href }
    }
    if (especificador.startsWith('@/')) {
      return { shortCircuit: true, url: pathToFileURL(resolve(especificador.slice(2) + '.js')).href }
    }
    return proximo(especificador, contexto)
  },
})
const rota = await import('../../app/api/interno/gestao/leads/route.js')
const csv = await import('../../app/api/interno/gestao/leads/csv/route.js')
const csvRecuperacao = await import('../../app/api/interno/gestao/recuperacao/csv/route.js')
const { erroDoPeriodo } = await import('../../components/gestao/usePeriodo.js')

class D1Local {
  constructor(banco) { this.banco = banco; this.consultas = 0 }
  prepare(sql) {
    this.consultas += 1
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novos) { valores = novos; return this },
      async all() { return { results: preparada.all(...valores) } },
      async first() { return preparada.get(...valores) || null },
      async run() { return { meta: { changes: Number(preparada.run(...valores).changes || 0) } } },
    }
  }
}

function banco(quantidade = 30) {
  const b = new DatabaseSync(':memory:')
  b.exec(readFileSync('migrations/0017_leads.sql', 'utf8'))
  b.exec(readFileSync('migrations/0023_leads_robo.sql', 'utf8'))
  b.exec('CREATE TABLE registro (id INTEGER PRIMARY KEY AUTOINCREMENT, quem TEXT, acao TEXT, alvo TEXT, detalhe TEXT, criado_em TEXT DEFAULT CURRENT_TIMESTAMP)')
  const inserir = b.prepare(`INSERT INTO leads
    (nome, email, whatsapp, token_hash, token_expira_em, criado_em, primeiro_download_em, comprou)
    VALUES (?, ?, '27999990000', ?, '2026-10-28 03:00:00', ?, ?, ?)`)
  for (let i = 0; i < quantidade; i++) {
    inserir.run(i === 0 ? '=SUM(A1)' : `Pessoa ${i}`, `p${i}@example.com`, `hash${i}`,
      '2026-10-21 03:00:00', i < 10 ? '2026-10-21 04:00:00' : null, i < 3 ? 1 : 0)
  }
  inserir.run('Antes', 'antes@example.com', 'antes', '2026-10-21 02:59:59', null, 0)
  inserir.run('Depois', 'depois@example.com', 'depois', '2026-10-22 03:00:00', null, 0)
  return b
}

const periodo = validarPeriodo('2026-10-21', '2026-10-21')
const pedido = (query = 'de=2026-10-21&ate=2026-10-21') => new Request(`https://trilhaviva.org/api/interno/gestao/leads?${query}`)

test('leads: paginação, totais e fronteiras de Brasília; download histórico sobrevive ao contador zerado', async () => {
  const db = new D1Local(banco())
  const primeira = await consultarLeads(db, { ...periodo, pagina: 1 })
  assert.equal(db.consultas, 2)
  assert.equal(primeira.itens.length, 25)
  assert.deepEqual(primeira.totais, { cadastros: 30, baixaram: 10, compraram: 3, taxa_conversao: 10 })
  assert.equal(primeira.total_itens, 30)
  assert.equal(primeira.itens[0].criado_em, '2026-10-21T03:00:00Z')
  assert.ok(primeira.itens.every((item) => !('token_hash' in item)))
  const segunda = await consultarLeads(db, { ...periodo, pagina: 2 })
  assert.equal(segunda.itens.length, 5)
  assert.equal(segunda.itens[0].downloads, 0)
  assert.ok(segunda.itens[0].primeiro_download_em)
  assert.ok(!segunda.itens.some((item) => primeira.itens.some((outro) => outro.id === item.id)))
  const vazio = await consultarLeads(db, { ...validarPeriodo('2025-01-01', '2025-01-01'), pagina: -1 })
  assert.equal(vazio.pagina, 1)
  assert.deepEqual(vazio.totais, { cadastros: 0, baixaram: 0, compraram: 0, taxa_conversao: 0 })
})

test('leads: CSV detecta a linha 5001 sem token', async () => {
  const linhas = await consultarLeadsCsv(new D1Local(banco(5001)), periodo)
  assert.equal(linhas.length, 5001)
  assert.ok(linhas.every((linha) => !('token_hash' in linha)))
  const busca = await consultarLeadsCsv(new D1Local(banco(30)), { ...periodo, q: 'Pessoa 11' })
  assert.deepEqual(busca.map((l) => l.nome), ['Pessoa 11'])
})

test('leads: a rota filtra a planilha e recusa mais de 5000 linhas', async () => {
  globalThis.__adminLeads = { papel: 'master', precisa_trocar_senha: false, cliente: { email: 'master@t.com' } }
  globalThis.__dbLeads = new D1Local(banco(30))
  const filtrada = await csv.GET(pedido('de=2026-10-21&ate=2026-10-21&q=Pessoa%2011'))
  assert.equal(filtrada.status, 200)
  const texto = await filtrada.text()
  assert.match(texto, /Pessoa 11/)
  assert.doesNotMatch(texto, /Pessoa 12/)
  globalThis.__dbLeads = new D1Local(banco(5001))
  const grande = await csv.GET(pedido())
  assert.equal(grande.status, 400)
  assert.match((await grande.json()).erro, /mais de 5000 linhas/)
  assert.equal(globalThis.__dbLeads.banco.prepare('SELECT COUNT(*) AS n FROM registro').get().n, 0)
})

test('período: navegador e servidor rejeitam datas impossíveis e pares incompletos com o mesmo texto', () => {
  for (const [de, ate] of [['2026-02-31', '2026-03-01'], ['2026-10-01', ''], ['', '2026-10-01']]) {
    assert.equal(erroDoPeriodo(de, ate), validarPeriodo(de, ate).erro)
  }
})

test('carrinhos: CSV rejeita período incompleto ou inválido antes de consultar o banco', async () => {
  globalThis.__adminLeads = { papel: 'master', precisa_trocar_senha: false, cliente: { email: 'master@t.com' } }
  globalThis.__dbLeads = new D1Local(banco())
  for (const q of ['de=2026-10-21', 'ate=2026-10-21', 'de=2026-02-31&ate=2026-03-01']) {
    const r = await csvRecuperacao.GET(pedido(q))
    assert.equal(r.status, 400)
    assert.match((await r.json()).erro, /data/i)
  }
  assert.equal(globalThis.__dbLeads.consultas, 0)
})

test('leads: rotas negam não admin e troca obrigatória com 404 antes de consultar', async () => {
  globalThis.__dbLeads = new D1Local(banco())
  for (const admin of [null, { papel: 'membro', precisa_trocar_senha: true }]) {
    globalThis.__adminLeads = admin
    for (const r of [rota, csv]) {
      await assert.rejects(() => r.GET(pedido()), (e) => e.codigo === 'NAO_ENCONTRADO')
    }
  }
  assert.equal(globalThis.__dbLeads.consultas, 0)
  for (const r of [rota, csv]) {
    for (const verbo of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.throws(() => r[verbo](pedido()), (e) => e.codigo === 'NAO_ENCONTRADO')
    }
  }
})

test('leads: master e membro acessam; JSON e CSV privados, fórmulas protegidas e datas validadas', async () => {
  for (const papel of ['master', 'membro']) {
    globalThis.__adminLeads = { papel, precisa_trocar_senha: false, cliente: { email: `${papel}@t.com` } }
    globalThis.__dbLeads = new D1Local(banco())
    const resposta = await rota.GET(pedido())
    assert.equal(resposta.status, 200)
    assert.match(resposta.headers.get('Cache-Control'), /no-store/)
    assert.equal((await resposta.json()).por_pagina, 25)
    const exportacao = await csv.GET(pedido())
    assert.equal(exportacao.status, 200)
    assert.match(exportacao.headers.get('Cache-Control'), /no-store/)
    assert.match(exportacao.headers.get('Content-Disposition'), /leads-2026-10-21-a-2026-10-21.csv/)
    const texto = await exportacao.text()
    assert.ok(texto.includes("'=SUM(A1)"))
    assert.ok(texto.includes('21/10/2026 00:00'))
    assert.ok(!texto.includes('hash'))
    // quem baixou a planilha fica no Registro (auditoria de 07/11/2026, M11)
    const reg = globalThis.__dbLeads.banco.prepare("SELECT quem, acao, alvo FROM registro WHERE acao = 'exportar_csv'").all()
    assert.deepEqual(reg.map((l) => [l.quem, l.alvo]), [[`${papel}@t.com`, 'leads']])
    for (const r of [rota, csv]) {
      assert.equal((await r.GET(pedido('de=2026-02-30&ate=2026-03-01'))).status, 400)
      assert.equal((await r.GET(pedido(''))).status, 400)
    }
  }
  globalThis.__dbLeads = null
  assert.equal((await rota.GET(pedido())).status, 503)
  assert.equal((await csv.GET(pedido())).status, 503)
})
