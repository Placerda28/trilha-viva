import test from 'node:test'
import assert from 'node:assert/strict'
import { criarBanco, D1Local } from '../gestao/_d1local.mjs'
import { dataBrasilia, pedidosDoCliente, valorEmReais } from '../../lib/conta-pedidos.js'

test('pedidos: só do cliente, sem teste, recentes primeiro, sem dados privados e numa consulta', async () => {
  const banco = criarBanco()
  try {
    banco.exec(`INSERT INTO clientes (id, email) VALUES (911, 'um@exemplo.com'), (912, 'dois@exemplo.com');
      INSERT INTO compras (id, cliente_id, stripe_session_id, valor_centavos, status, forma_pagamento, criado_em, teste, cupom, utm_source) VALUES
      (1, 911, 'mp_1', 8990, 'pago', 'pix', '2026-09-12 15:00:00', 0, 'SEGREDO', 'ig'),
      (2, 911, 'mp_2', 8990, 'reembolsado', 'cartao', '2026-03-02 15:00:00', 0, NULL, NULL),
      (3, 911, 'mp_3', 100, 'pago', NULL, '2026-10-01 15:00:00', 1, NULL, NULL),
      (4, 911, 'mp_4', 8990, 'pendente', NULL, '2026-10-02 15:00:00', 0, NULL, NULL),
      (5, 912, 'mp_5', 8990, 'pago', 'pix', '2026-10-03 15:00:00', 0, NULL, NULL)`)
    const db = new D1Local(banco)
    const itens = await pedidosDoCliente(db, 911)
    assert.equal(db.consultas, 1)
    assert.deepEqual(itens, [
      { id: 1, criadoEm: '2026-09-12 15:00:00', valorCentavos: 8990, forma: 'pix', status: 'pago' },
      { id: 2, criadoEm: '2026-03-02 15:00:00', valorCentavos: 8990, forma: 'cartao', status: 'reembolsado' },
    ])
  } finally {
    banco.close()
  }
})

test('pedidos: data no dia de Brasília e valor em reais', () => {
  // 01:30 UTC ainda é o dia anterior em Brasília
  assert.equal(dataBrasilia('2026-09-13 01:30:00'), '12/09/2026')
  assert.equal(dataBrasilia(''), '')
  assert.equal(valorEmReais(8990), 'R$ 89,90')
  assert.equal(valorEmReais(123456), 'R$ 1.234,56')
})
