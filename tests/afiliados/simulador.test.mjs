import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularNivel, niveisDoMes } from '../../lib/afiliados/niveis.js'
import { MAX_VENDAS_SIMULADOR, NIVEIS_PUBLICOS, moeda, moedaCurta, saltos, simular, tabelaDoSimulador } from '../../lib/afiliados-simulador.js'
import { novoDb } from './_base.mjs'

const LIMITES = [
  [0, 0, 0, null, 1],
  [1, 1, 1500, 'Bronze', 19],
  [19, 1, 28500, 'Bronze', 1],
  [20, 2, 40000, 'Prata', 30],
  [49, 2, 98000, 'Prata', 1],
  [50, 3, 150000, 'Ouro', 0],
  [51, 3, 153000, 'Ouro', 0],
  [100, 3, 300000, 'Ouro', 0],
]

test('simulador: limites 0, 1, 19, 20, 49, 50, 51 e 100', () => {
  for (const [n, grau, total, nivel, faltam] of LIMITES) {
    const s = simular(n)
    assert.equal(s.total, total, `${n} vendas: total`)
    assert.equal(s.grau, grau, `${n} vendas: grau`)
    assert.equal(s.nivel, nivel, `${n} vendas: nível`)
    assert.equal(s.faltam, faltam, `${n} vendas: faltam`)
    assert.equal(s.base + s.bonus, s.total)
    assert.equal(s.base, n * 1500)
  }
})

test('simulador: a tabela dá o mesmo resultado que calcularNivel, linha a linha', () => {
  const tabela = tabelaDoSimulador()
  assert.equal(tabela.length, MAX_VENDAS_SIMULADOR + 1)
  tabela.forEach(([grau, base, bonus, total, faltam], n) => {
    const c = calcularNivel(n, NIVEIS_PUBLICOS)
    assert.deepEqual([base, bonus, total, faltam], [c.base, c.bonus, c.total, c.faltam], `${n} vendas`)
    assert.equal(grau, c.nivel ? NIVEIS_PUBLICOS.findIndex((x) => x.nome === c.nivel.nome) + 1 : 0)
  })
})

test('simulador: entrada fora do intervalo é contida', () => {
  assert.equal(simular(-5).vendas, 0)
  assert.equal(simular(250).vendas, 100)
  assert.equal(simular('abc').vendas, 0)
  assert.equal(simular(19.9).vendas, 19)
})

test('simulador: saltos de 19 para 20 e de 49 para 50', () => {
  const [prata, ouro] = saltos()
  assert.deepEqual([prata.de, prata.deTotal, prata.para, prata.paraTotal, prata.diferenca], [19, 28500, 20, 40000, 11500])
  assert.deepEqual([ouro.de, ouro.deTotal, ouro.para, ouro.paraTotal, ouro.diferenca], [49, 98000, 50, 150000, 52000])
})

test('simulador: formatação em reais', () => {
  assert.equal(moeda(40000), 'R$ 400,00')
  assert.equal(moeda(150000), 'R$ 1.500,00')
  assert.equal(moeda(0), 'R$ 0,00')
  assert.equal(moedaCurta(3000), 'R$ 30')
  assert.equal(moedaCurta(1550), 'R$ 15,50')
})

test('a escada pública espelha o seed do banco (o banco é a fonte da verdade)', async () => {
  const doBanco = await niveisDoMes(novoDb(), '2026-11')
  const chave = (l) => l.map((n) => [n.nome, n.vendas_minimas, n.valor_por_venda_centavos, n.cor])
  assert.deepEqual(chave(NIVEIS_PUBLICOS), chave(doBanco))
})
