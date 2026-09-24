import test from 'node:test'
import assert from 'node:assert/strict'
import { formaDoMP } from '../../lib/gestao/forma.js'

test('identifica Pix pelo método', () => {
  assert.equal(formaDoMP({ payment_method_id: 'pix', payment_type_id: 'bank_transfer' }), 'pix')
  assert.equal(formaDoMP({ payment_type_id: 'bank_transfer' }), 'pix')
})

test('identifica cartões de crédito, débito e pré-pago', () => {
  assert.equal(formaDoMP({ payment_type_id: 'credit_card' }), 'cartao')
  assert.equal(formaDoMP({ payment_type_id: 'debit_card' }), 'cartao')
  assert.equal(formaDoMP({ payment_type_id: 'prepaid_card' }), 'cartao')
})

test('outras formas ficam como outro', () => {
  assert.equal(formaDoMP({ payment_method_id: 'bolbradesco', payment_type_id: 'ticket' }), 'outro')
  assert.equal(formaDoMP(null), 'outro')
})
