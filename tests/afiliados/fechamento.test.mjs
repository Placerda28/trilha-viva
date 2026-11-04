import test from 'node:test'
import assert from 'node:assert/strict'
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { estornarVenda, gravarComissaoBase } from '../../lib/afiliados/comissao.js'
import { statusDoMes } from '../../lib/afiliados/status.js'
import { FECHA, NOV, contar, novaVenda, novoAfiliado, novoDb, vendas } from './_base.mjs'

const BONUS = "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE tipo = 'bonus_nivel'"

test('fechamento rodado 2x não duplica lançamento nem fechamento', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 20)
  const a = await fecharMes(db, '2026-11', FECHA)
  const b = await fecharMes(db, '2026-11', FECHA)
  assert.equal(a.fechados.length, 1)
  assert.equal(b.fechados.length, 0)
  assert.equal(contar(db, 'SELECT COUNT(*) n FROM afiliados_fechamentos'), 1)
  assert.equal(contar(db, BONUS), 1)
  const f = db.banco.prepare('SELECT * FROM afiliados_fechamentos').get()
  assert.equal(f.total_centavos, 40000)
  assert.equal(f.bonus_centavos, 10000)
  assert.equal(JSON.parse(f.niveis_snapshot).niveis.length, 3)
})

test('20 vendas - 1 reembolso antes do fechamento = 19 = Bronze, 28500', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const ids = await vendas(db, af, 20)
  assert.equal((await estornarVenda(db, ids[0], new Date('2026-11-20T12:00:00Z'))).acao, 'cancelada')
  await fecharMes(db, '2026-11', FECHA)
  const f = db.banco.prepare('SELECT * FROM afiliados_fechamentos').get()
  assert.equal(f.vendas_validas, 19)
  assert.equal(f.vendas_reembolsadas, 1)
  assert.equal(f.total_centavos, 28500)
  assert.equal(f.bonus_centavos, 0)
  assert.equal(contar(db, BONUS), 0)
  const s = await statusDoMes(db, af.id, '2026-11', FECHA)
  assert.equal(s.nivel.nome, 'Bronze')
  assert.equal(s.saldos.disponivel, 28500)
})

test('estorno depois do fechamento vira lançamento negativo; nível fechado não muda', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const ids = await vendas(db, af, 20)
  await fecharMes(db, '2026-11', FECHA)
  const antes = await statusDoMes(db, af.id, '2026-11', FECHA)
  assert.equal(antes.saldos.disponivel, 20 * 1500 + 10000)

  const depois = new Date('2026-12-15T12:00:00Z')
  assert.equal((await estornarVenda(db, ids[0], depois)).acao, 'estorno')
  const rep = await estornarVenda(db, ids[0], depois)
  assert.equal(rep.criado, false)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE tipo = 'estorno'"), 1)

  const s = await statusDoMes(db, af.id, '2026-11', depois)
  assert.equal(s.nivel.nome, 'Prata')
  assert.equal(s.vendasValidas, 20)
  assert.equal(s.totalPrevisto, 40000)
  assert.equal(s.saldos.disponivel, 20 * 1500 + 10000 - 1500)
  const est = db.banco.prepare("SELECT valor_centavos v, status FROM afiliados_lancamentos WHERE tipo = 'estorno'").get()
  assert.equal(est.v, -1500)
  assert.equal(est.status, 'pendente')
})

test('comissão base repetida para a mesma compra não duplica', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const id = await novaVenda(db, af)
  const r = await gravarComissaoBase(db, { afiliadoId: af.id, compraId: id, aprovadoEm: NOV })
  assert.equal(r.criado, false)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE tipo = 'venda'"), 1)
})

test('base libera só após 7 dias; bônus disponível na hora do fechamento', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 20)
  const dia6 = new Date('2026-11-16T14:00:00Z')
  const dia7 = new Date('2026-11-17T15:00:00Z')
  let s = await statusDoMes(db, af.id, '2026-11', dia6)
  assert.equal(s.saldos.disponivel, 0)
  assert.equal(s.saldos.liberando, 30000)
  assert.equal(s.saldos.proximaLiberacao, '2026-11-17 15:00:00')
  s = await statusDoMes(db, af.id, '2026-11', dia7)
  assert.equal(s.saldos.disponivel, 30000)
  assert.equal(s.saldos.liberando, 0)

  // Fecha antes de a base liberar: o bônus já está disponível, a base não.
  await fecharMes(db, '2026-11', dia6)
  s = await statusDoMes(db, af.id, '2026-11', dia6)
  assert.equal(s.saldos.disponivel, 10000)
  assert.equal(s.saldos.liberando, 30000)
})
