import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { adminPeloToken, papelPeloToken } from '../../lib/gestao/sessao.js'

function bancoComCliente(cliente) {
  const chamadas = []
  return {
    chamadas,
    prepare(sql) {
      chamadas.push({ sql, valores: [] })
      const chamada = chamadas.at(-1)
      return {
        bind(...valores) {
          chamada.valores = valores
          return this
        },
        async first() {
          return cliente
        },
      }
    },
  }
}

test('sessão da gestão faz uma consulta pelo SHA-256 e devolve o master', async () => {
  const db = bancoComCliente({ id: 7, email: ' MASTER@example.com ', nome: 'Master', bloqueado: 0 })
  const admin = await adminPeloToken(db, 'tok-master', 'master@example.com')

  assert.deepEqual(admin, {
    papel: 'master',
    cliente: { id: 7, email: ' MASTER@example.com ', nome: 'Master' },
  })
  assert.equal(db.chamadas.length, 1)
  assert.match(db.chamadas[0].sql, /JOIN clientes/)
  assert.match(db.chamadas[0].sql, /s\.expira_em > datetime\('now'\)/)
  assert.match(db.chamadas[0].sql, /LIMIT 1/)
  assert.equal(
    db.chamadas[0].valores[0],
    createHash('sha256').update('tok-master').digest('hex')
  )
})

test('cliente comum, bloqueado ou sessão inexistente não ganha papel', async () => {
  assert.equal(
    await papelPeloToken(
      bancoComCliente({ id: 1, email: 'comum@example.com', nome: 'Comum', bloqueado: 0 }),
      'tok-comum',
      'master@example.com'
    ),
    null
  )
  assert.equal(
    await papelPeloToken(
      bancoComCliente({ id: 2, email: 'master@example.com', nome: 'Master', bloqueado: 1 }),
      'tok-bloq',
      'master@example.com'
    ),
    null
  )
  assert.equal(await papelPeloToken(bancoComCliente(null), 'tok-invalido', 'master@example.com'), null)
})

test('sem token ou sem banco falha fechado e não consulta', async () => {
  const db = bancoComCliente({ id: 1, email: 'master@example.com', bloqueado: 0 })
  assert.equal(await adminPeloToken(db, '', 'master@example.com'), null)
  assert.equal(await adminPeloToken(null, 'tok-master', 'master@example.com'), null)
  assert.equal(db.chamadas.length, 0)
})
