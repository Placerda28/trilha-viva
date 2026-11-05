import test from 'node:test'
import assert from 'node:assert/strict'
import { marcarTeste } from '../../lib/gestao/testes.js'
import { statusDoMes } from '../../lib/afiliados/status.js'
import { novoAfiliado, novoDb, novaVenda, fechar, NOV } from './_base.mjs'

const emailDe = (db, clienteId) => db.banco.prepare('SELECT email FROM clientes WHERE id = ?').get(clienteId).email
const statusVenda = (db, compraId) =>
  db.banco.prepare("SELECT status FROM afiliados_lancamentos WHERE compra_id = ? AND tipo = 'venda'").get(compraId).status

test('marcar compra como teste cancela a comissão do mês aberto; desmarcar devolve', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const compra = await novaVenda(db, af)
  const email = emailDe(db, af.clienteId)

  await marcarTeste(db, { email, teste: true, quem: 'm@t.com' })
  assert.equal(statusVenda(db, compra), 'cancelada')
  assert.equal((await statusDoMes(db, af.id, '2026-11', NOV)).vendasValidas, 0)

  await marcarTeste(db, { email, teste: false, quem: 'm@t.com' })
  assert.equal(statusVenda(db, compra), 'pendente')
  assert.equal((await statusDoMes(db, af.id, '2026-11', NOV)).vendasValidas, 1)
})

test('desmarcar teste não ressuscita venda reembolsada nem mexe em mês fechado', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const reembolsada = await novaVenda(db, af)
  db.banco.prepare("UPDATE compras SET status = 'reembolsado' WHERE id = ?").run(reembolsada)
  db.banco.prepare("UPDATE afiliados_lancamentos SET status = 'cancelada' WHERE compra_id = ?").run(reembolsada)
  const email = emailDe(db, af.clienteId)
  await marcarTeste(db, { email, teste: false, quem: 'm@t.com' })
  assert.equal(statusVenda(db, reembolsada), 'cancelada')

  const af2 = novoAfiliado(db)
  const fechada = await novaVenda(db, af2)
  await fechar(db)
  await marcarTeste(db, { email: emailDe(db, af2.clienteId), teste: true, quem: 'm@t.com' })
  assert.equal(statusVenda(db, fechada), 'pendente')
})
