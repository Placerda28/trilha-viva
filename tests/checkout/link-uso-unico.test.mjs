import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'

// O link de criar senha (e-mail do aviso, "Primeiro acesso" e WhatsApp) é de
// uso único e vence. Aqui roda o código de verdade (lib/clientes.js) contra um
// banco em memória.
const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/headers': modulo('export async function cookies() { return { get() { return null } } }'),
  '@/lib/d1': modulo(`
    export function getDB() { return globalThis.__db || null }
    export async function umaLinha(db, sql, ...v) { return db ? (await db.prepare(sql).bind(...v).first()) || null : null }
    export async function executar(db, sql, ...v) { return db ? db.prepare(sql).bind(...v).run() : null }
  `),
}
registerHooks({
  resolve(especificador, contexto, proximo) {
    if (falsos[especificador]) return { shortCircuit: true, url: falsos[especificador] }
    if (especificador.startsWith('@/')) {
      return { shortCircuit: true, url: pathToFileURL(resolve(especificador.slice(2) + '.js')).href }
    }
    return proximo(especificador, contexto)
  },
})

const { criarToken, usarToken } = await import('../../lib/clientes.js')

class D1Local {
  constructor(banco) {
    this.banco = banco
  }
  prepare(sql) {
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novos) {
        valores = novos
        return this
      },
      async first() {
        return preparada.get(...valores) || null
      },
      async all() {
        return { results: preparada.all(...valores) }
      },
      async run() {
        return { meta: { changes: Number(preparada.run(...valores).changes || 0) } }
      },
    }
  }
}

function montar() {
  const b = new DatabaseSync(':memory:')
  b.exec(readFileSync('migrations/0000_esquema_atual.sql', 'utf8'))
  b.exec("INSERT INTO clientes (id, email, nome) VALUES (1, 'ana@example.com', 'Ana')")
  globalThis.__db = new D1Local(b)
  return b
}

test('o link vale uma vez só', async () => {
  montar()
  const token = await criarToken({ clienteId: 1, tipo: 'criar_senha', horas: 72 })
  const primeira = await usarToken({ token, tipo: 'criar_senha' })
  assert.equal(primeira.email, 'ana@example.com')
  assert.equal(await usarToken({ token, tipo: 'criar_senha' }), null)
})

test('link vencido é recusado', async () => {
  const b = montar()
  const token = await criarToken({ clienteId: 1, tipo: 'criar_senha', horas: 72 })
  b.exec("UPDATE tokens SET expira_em = datetime('now', '-1 minute')")
  assert.equal(await usarToken({ token, tipo: 'criar_senha' }), null)
})

test('link de outro tipo não serve para criar senha', async () => {
  montar()
  const token = await criarToken({ clienteId: 1, tipo: 'recuperar', horas: 1 })
  assert.equal(await usarToken({ token, tipo: 'criar_senha' }), null)
})
