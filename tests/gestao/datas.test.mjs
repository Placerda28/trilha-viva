import test from 'node:test'
import assert from 'node:assert/strict'
import {
  diaBrasiliaDeUtc,
  montarSerie,
  segundaDaSemana,
  validarPeriodo,
} from '../../lib/gestao/datas.js'

test('00:00 a 02:59 UTC ainda pertence ao dia anterior em Brasília', () => {
  assert.equal(diaBrasiliaDeUtc('2026-09-24 00:00:00'), '2026-09-23')
  assert.equal(diaBrasiliaDeUtc('2026-09-24T02:59:59Z'), '2026-09-23')
  assert.equal(diaBrasiliaDeUtc('2026-09-24 03:00:00'), '2026-09-24')
})

test('intervalo de Brasília vira limites UTC inclusivo/exclusivo', () => {
  assert.deepEqual(validarPeriodo('2026-09-24', '2026-09-25'), {
    ok: true,
    de: '2026-09-24',
    ate: '2026-09-25',
    dias: 2,
    inicioUtc: '2026-09-24 03:00:00',
    fimUtc: '2026-09-26 03:00:00',
  })
})

test('rejeita formato, data impossível, ordem invertida e mais de 731 dias', () => {
  assert.equal(validarPeriodo('24/09/2026', '2026-09-25').ok, false)
  assert.equal(validarPeriodo('2026-02-30', '2026-03-01').ok, false)
  assert.equal(validarPeriodo('2026-09-25', '2026-09-24').ok, false)
  assert.equal(validarPeriodo('2024-01-01', '2025-12-31').ok, true)
  assert.equal(validarPeriodo('2024-01-01', '2026-01-01').ok, false)
})

test('semana começa na segunda-feira', () => {
  assert.equal(segundaDaSemana('2026-09-21'), '2026-09-21')
  assert.equal(segundaDaSemana('2026-09-27'), '2026-09-21')
  assert.equal(segundaDaSemana('2026-09-28'), '2026-09-28')
})

test('série diária inclui faixas vazias', () => {
  assert.deepEqual(
    montarSerie({
      de: '2026-09-24',
      ate: '2026-09-26',
      agrupar: 'dia',
      linhas: [{ chave: '2026-09-25', compras: 2, centavos: 39400 }],
    }),
    [
      { chave: '2026-09-24', rotulo: '24/09', compras: 0, centavos: 0 },
      { chave: '2026-09-25', rotulo: '25/09', compras: 2, centavos: 39400 },
      { chave: '2026-09-26', rotulo: '26/09', compras: 0, centavos: 0 },
    ]
  )
})

test('reagrupa por semana e soma os dias', () => {
  assert.deepEqual(
    montarSerie({
      de: '2026-09-20',
      ate: '2026-09-29',
      agrupar: 'semana',
      linhas: [
        { chave: '2026-09-20', compras: 1, centavos: 1000 },
        { chave: '2026-09-22', compras: 2, centavos: 2000 },
      ],
    }),
    [
      { chave: '2026-09-14', rotulo: 'sem 14/09', compras: 1, centavos: 1000 },
      { chave: '2026-09-21', rotulo: 'sem 21/09', compras: 2, centavos: 2000 },
      { chave: '2026-09-28', rotulo: 'sem 28/09', compras: 0, centavos: 0 },
    ]
  )
})

test('reagrupa por mês com rótulo curto em português', () => {
  assert.deepEqual(
    montarSerie({
      de: '2026-08-31',
      ate: '2026-10-01',
      agrupar: 'mes',
      linhas: [{ chave: '2026-09-24', compras: 3, centavos: 59100 }],
    }),
    [
      { chave: '2026-08', rotulo: 'ago/26', compras: 0, centavos: 0 },
      { chave: '2026-09', rotulo: 'set/26', compras: 3, centavos: 59100 },
      { chave: '2026-10', rotulo: 'out/26', compras: 0, centavos: 0 },
    ]
  )
})
