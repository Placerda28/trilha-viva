// Pacote 1 da auditoria de segurança de 07/11/2026: ações de dinheiro, conta de
// cliente e dado sensível só para o master (A1, M7, M8, M10, B14), cota de
// download atômica (M2) e Pixel fora das páginas de senha (M1).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export async function cookies() { return { get() { return { value: "t" } } } }'),
  'next/navigation': modulo('export function notFound() { const e = new Error("404"); e.codigo = "NAO_ENCONTRADO"; throw e }'),
  '@/lib/d1': modulo(`
    export const getDB = () => globalThis.__db
    export async function umaLinha(db, sql, ...v) { if (!db) return null; return (await db.prepare(sql).bind(...v).first()) || null }
    export async function executar(db, sql, ...v) { if (!db) return null; return db.prepare(sql).bind(...v).run() }
  `),
  '@/lib/gestao/sessao': modulo('export const adminPeloToken = async () => globalThis.__admin'),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})

const ROTAS = [
  'clientes/email',
  'clientes/teste',
  'clientes/bloqueio',
  'recuperacao/teste',
  'testes',
  'cupons',
  'cupons/desativar',
  'whatsapp/estado',
]
const MEMBRO = { papel: 'membro', precisa_trocar_senha: false, cliente: { id: 2, email: 'equipe@t.com' } }
const pedido = () =>
  new Request('https://trilhaviva.org/api/gestao/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'trilhaviva.org', origin: 'https://trilhaviva.org' },
    body: JSON.stringify({ id: 1, email: 'atacante@x.com', codigo: 'TUDO100', percentual: 100, acao: 'ligar' }),
  })

test('membro da equipe recebe 403 com aviso nas ações só do master; quem não é admin, 404', async () => {
  for (const r of ROTAS) {
    const rota = await import(`../../app/api/interno/gestao/${r}/route.js`)
    globalThis.__db = { prepare: () => assert.fail(`${r}: o membro não pode chegar ao banco`) }
    globalThis.__admin = MEMBRO
    const res = await rota.POST(pedido())
    assert.equal(res.status, 403, r)
    assert.deepEqual(await res.json(), { ok: false, erro: 'Só o Administrador Master pode fazer esta ação.' }, r)
    assert.equal(res.headers.get('cache-control'), 'no-store, max-age=0', r)

    globalThis.__admin = null
    await assert.rejects(async () => rota.POST(pedido()), (e) => e.codigo === 'NAO_ENCONTRADO', r)
  }
})

test('membro ainda lista cupons e contatos de teste (só leitura)', async () => {
  const cupons = await import('../../app/api/interno/gestao/cupons/route.js')
  const testes = await import('../../app/api/interno/gestao/testes/route.js')
  globalThis.__admin = MEMBRO
  globalThis.__db = null
  for (const rota of [cupons, testes]) {
    const res = await rota.GET(new Request('https://trilhaviva.org/x'))
    assert.notEqual(res.status, 403)
  }
})

// ------------------------------------------------------------- cota ----

class D1Local {
  constructor(banco) {
    this.banco = banco
  }
  prepare(sql) {
    const p = this.banco.prepare(sql)
    let v = []
    return {
      bind(...n) {
        v = n
        return this
      },
      async first() {
        return p.get(...v) || null
      },
      async run() {
        return { meta: { changes: Number(p.run(...v).changes || 0) } }
      },
    }
  }
}

function bancoCota() {
  const b = new DatabaseSync(':memory:')
  b.exec(readFileSync('migrations/0000_esquema_atual.sql', 'utf8'))
  b.exec("INSERT INTO clientes (id, email) VALUES (1, 'a@t.com'), (2, 'b@t.com')")
  return b
}

test('cota: 50 pedidos em paralelo ocupam só as 30 vagas do dia; desfazer devolve a vaga', async () => {
  const { reservarDownload, desfazerDownload, POR_DIA } = await import('../../lib/cota.js')
  const b = bancoCota()
  const db = new D1Local(b)
  const pedir = (clienteId) => reservarDownload({ clienteId, arquivo: 'x.zip', slug: 's', ip: '1.1.1.1' }, db)

  const rs = await Promise.all(Array.from({ length: 50 }, () => pedir(1)))
  assert.equal(rs.filter((r) => r.ok).length, POR_DIA)
  assert.equal(b.prepare('SELECT COUNT(*) n FROM downloads WHERE cliente_id = 1').get().n, POR_DIA)
  assert.equal((await pedir(1)).ok, false)
  assert.equal((await pedir(2)).ok, true, 'a cota é por cliente')

  // ontem não conta
  b.exec("UPDATE downloads SET criado_em = datetime('now', '-2 days') WHERE cliente_id = 1")
  assert.equal((await pedir(1)).ok, true)

  const cheia = bancoCota()
  const dbCheio = new D1Local(cheia)
  const ids = []
  for (let i = 0; i < POR_DIA; i++) ids.push((await reservarDownload({ clienteId: 1, arquivo: 'x' }, dbCheio)).id)
  assert.equal((await reservarDownload({ clienteId: 1, arquivo: 'x' }, dbCheio)).ok, false)
  await desfazerDownload(ids[0], dbCheio)
  assert.equal((await reservarDownload({ clienteId: 1, arquivo: 'x' }, dbCheio)).ok, true)
})

test('cota: sem banco segue liberado (build e dev sem wrangler)', async () => {
  const { reservarDownload } = await import('../../lib/cota.js')
  assert.deepEqual(await reservarDownload({ clienteId: 1 }, null), { ok: true, id: null })
})

// ------------------------------------------------------------- Pixel ---

test('Pixel não carrega nas páginas com chave ou token no endereço', () => {
  const fonte = readFileSync('components/MetaPixel.jsx', 'utf8')
  const lista = fonte.match(/SEM_PIXEL = \[([^\]]+)\]/)?.[1] || ''
  for (const p of ['/sucesso', '/criar-senha', '/redefinir']) assert.ok(lista.includes(`'${p}'`), p)
  assert.match(fonte, /const fora = SEM_PIXEL\.includes\(pathname\)/)
})
