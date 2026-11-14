import test from 'node:test'
import assert from 'node:assert/strict'
import { consultarClientesCsv } from '../../lib/gestao/clientes.js'
import { consultarPeriodoCsv } from '../../lib/gestao/periodo.js'
import { consultarLeadsCsv } from '../../lib/gestao/leads.js'
import { consultarRecuperacaoCsv } from '../../lib/gestao/recuperacao.js'

function bancoSimulado() {
  const consultas = []
  return {
    consultas,
    prepare(sql) {
      consultas.push(sql)
      return {
        bind() { return this },
        async all() { return { results: Array.from({ length: 5001 }, () => ({})) } },
      }
    },
  }
}

test('os quatro CSVs consultam a linha 5001 para detectar arquivo incompleto', async () => {
  const periodo = { inicioUtc: '2026-10-01 03:00:00', fimUtc: '2026-11-01 03:00:00' }
  const casos = [
    (db) => consultarClientesCsv(db, ''),
    (db) => consultarPeriodoCsv(db, periodo),
    (db) => consultarLeadsCsv(db, periodo),
    (db) => consultarRecuperacaoCsv(db),
  ]
  for (const consultar of casos) {
    const db = bancoSimulado()
    assert.equal((await consultar(db)).length, 5001)
    assert.match(db.consultas[0], /LIMIT 5001/)
  }
})
