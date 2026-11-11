// Convite de afiliado no /acervo: quem vê o card (deveConvidarAfiliado).
import test from 'node:test'
import assert from 'node:assert/strict'
import { novoDb, novoAfiliado } from './_base.mjs'
import { deveConvidarAfiliado } from '../../lib/afiliados/conta.js'

const novoCliente = (db, email) => Number(db.banco.prepare('INSERT INTO clientes (email) VALUES (?) RETURNING id').get(email).id)

test('cliente que ainda não é afiliado, com o programa aberto, vê o convite', async () => {
  const db = novoDb()
  assert.equal(await deveConvidarAfiliado(db, novoCliente(db, 'novo@t.com')), true)
})

test('quem já é afiliado (em qualquer status) não vê o convite', async () => {
  const db = novoDb()
  for (const status of ['ativo', 'pendente', 'suspenso']) {
    const af = novoAfiliado(db, { pix: false, status })
    assert.equal(await deveConvidarAfiliado(db, af.clienteId), false, status)
  }
})

test('programa fechado esconde o convite', async () => {
  const db = novoDb()
  const id = novoCliente(db, 'fechado@t.com')
  db.banco.prepare('UPDATE afiliados_config SET programa_aberto = 0 WHERE id = 1').run()
  assert.equal(await deveConvidarAfiliado(db, id), false)
})

test('sem banco, sem cliente ou com erro na consulta: esconde e não estoura', async () => {
  assert.equal(await deveConvidarAfiliado(null, 1), false)
  assert.equal(await deveConvidarAfiliado(novoDb(), 0), false)
  const quebrado = { prepare: () => { throw new Error('no such table: afiliados_config') } }
  assert.equal(await deveConvidarAfiliado(quebrado, 1), false)
})
