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
    precisa_trocar_senha: false,
  })
  assert.equal(db.chamadas.length, 1)
  assert.match(db.chamadas[0].sql, /JOIN clientes/)
  assert.match(db.chamadas[0].sql, /LEFT JOIN equipe/)
  assert.match(db.chamadas[0].sql, /e\.ativo = 1/)
  assert.match(db.chamadas[0].sql, /c\.bloqueado = 0/)
  assert.match(db.chamadas[0].sql, /s\.expira_em > datetime\('now'\)/)
  assert.match(db.chamadas[0].sql, /LIMIT 1/)
  assert.equal(
    db.chamadas[0].valores[0],
    createHash('sha256').update('tok-master').digest('hex')
  )
})

test('membro ativo recebe o estado da troca de senha na mesma consulta', async () => {
  const db = bancoComCliente({
    id: 8,
    email: 'membro@example.com',
    nome: 'Membro',
    bloqueado: 0,
    equipe_id: 4,
    precisa_trocar_senha: 1,
  })
  assert.deepEqual(await adminPeloToken(db, 'tok-membro', 'master@example.com'), {
    papel: 'membro',
    cliente: { id: 8, email: 'membro@example.com', nome: 'Membro' },
    precisa_trocar_senha: true,
  })
  assert.equal(db.chamadas.length, 1)
})

test('master continua master mesmo se também existir na tabela equipe', async () => {
  const admin = await adminPeloToken(
    bancoComCliente({
      id: 7,
      email: 'master@example.com',
      nome: 'Master',
      bloqueado: 0,
      equipe_id: 5,
      precisa_trocar_senha: 1,
    }),
    'tok-master',
    'master@example.com'
  )
  assert.equal(admin.papel, 'master')
  assert.equal(admin.precisa_trocar_senha, false)
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

test('membro removido e e-mail apenas parecido com o master não passam', async () => {
  assert.equal(
    await papelPeloToken(
      bancoComCliente({
        id: 3,
        email: 'membro@example.com',
        nome: 'Removido',
        bloqueado: 0,
        equipe_id: null,
      }),
      'tok-removido',
      'master@example.com'
    ),
    null
  )
  assert.equal(
    await papelPeloToken(
      bancoComCliente({
        id: 4,
        email: 'master+parecido@example.com',
        nome: 'Parecido',
        bloqueado: 0,
        equipe_id: null,
      }),
      'tok-parecido',
      'master@example.com'
    ),
    null
  )
})

test('sem token ou sem banco falha fechado e não consulta', async () => {
  const db = bancoComCliente({ id: 1, email: 'master@example.com', bloqueado: 0 })
  assert.equal(await adminPeloToken(db, '', 'master@example.com'), null)
  assert.equal(await adminPeloToken(null, 'tok-master', 'master@example.com'), null)
  assert.equal(db.chamadas.length, 0)
})
