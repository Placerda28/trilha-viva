import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularNivel, niveisDoMes } from '../../lib/afiliados/niveis.js'
import { statusDoMes } from '../../lib/afiliados/status.js'
import { mesDe, mesParaFechar } from '../../lib/afiliados/datas.js'
import { FECHA, NOV, novoAfiliado, novoDb, vendas } from './_base.mjs'

const LIMITES = [[0, 0], [1, 1500], [19, 28500], [20, 40000], [49, 98000], [50, 150000], [51, 153000]]

test('regra pura: limites 0,1,19,20,49,50,51 (retroativa no mês)', async () => {
  const niveis = await niveisDoMes(novoDb(), '2026-11')
  for (const [n, esperado] of LIMITES) {
    const c = calcularNivel(n, niveis)
    assert.equal(c.total, esperado, `${n} vendas`)
    assert.equal(c.base + c.bonus, c.total)
  }
  const c19 = calcularNivel(19, niveis)
  assert.equal(c19.nivel.nome, 'Bronze')
  assert.equal(c19.proximo.nome, 'Prata')
  assert.equal(c19.faltam, 1)
  assert.equal(calcularNivel(50, niveis).proximo, null)
  assert.equal(calcularNivel(0, niveis).faltam, 1)
})

test('statusDoMes dá os mesmos totais lendo o banco', async () => {
  for (const [n, esperado] of LIMITES) {
    const db = novoDb()
    const af = novoAfiliado(db)
    await vendas(db, af, n)
    const s = await statusDoMes(db, af.id, '2026-11', NOV)
    assert.equal(s.vendasValidas, n)
    assert.equal(s.totalPrevisto, esperado, `${n} vendas`)
    assert.equal(s.garantido, n * 1500)
    assert.equal(s.bonusPrevisto, esperado - n * 1500)
  }
})

test('nível fixo sobrepõe a contagem', async () => {
  const db = novoDb()
  const ouro = db.banco.prepare("SELECT id FROM afiliados_niveis WHERE nome = 'Ouro'").get().id
  const af = novoAfiliado(db, { nivelFixoId: ouro })
  await vendas(db, af, 3)
  const s = await statusDoMes(db, af.id, '2026-11', NOV)
  assert.equal(s.nivel.nome, 'Ouro')
  assert.equal(s.totalPrevisto, 3 * 3000)
  assert.equal(s.bonusPrevisto, 3 * 1500)
})

test('mudança na tabela vale só a partir do mês seguinte', async () => {
  const db = novoDb()
  db.banco.exec(`INSERT INTO afiliados_niveis (nome, vendas_minimas, valor_por_venda_centavos, ordem, valido_desde_mes) VALUES
    ('Bronze', 1, 1800, 1, '2026-12'), ('Prata', 10, 2500, 2, '2026-12')`)
  assert.equal((await niveisDoMes(db, '2026-11')).length, 3)
  assert.equal((await niveisDoMes(db, '2026-12')).length, 2)
  const af = novoAfiliado(db)
  await vendas(db, af, 10, NOV)
  assert.equal((await statusDoMes(db, af.id, '2026-11', NOV)).totalPrevisto, 15000)
  await vendas(db, af, 10, new Date('2026-12-10T15:00:00Z'))
  const s = await statusDoMes(db, af.id, '2026-12', FECHA)
  assert.equal(s.totalPrevisto, 25000)
  assert.equal(s.garantido, 18000)
})

test('mês do negócio segue Brasília', () => {
  assert.equal(mesDe(new Date('2026-12-01T02:59:59Z')), '2026-11')
  assert.equal(mesDe(new Date('2026-12-01T03:00:00Z')), '2026-12')
  assert.equal(mesDe('2026-11-30 23:00:00'), '2026-11')
  assert.equal(mesParaFechar(new Date('2026-12-08T12:00:00Z'), 8), '2026-11')
  assert.equal(mesParaFechar(new Date('2026-12-07T12:00:00Z'), 8), '2026-10')
})
