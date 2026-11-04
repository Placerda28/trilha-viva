import test from 'node:test'
import assert from 'node:assert/strict'
import { montarCorpoPreferencia, resumirPagamento } from '../../lib/mercadopago.js'

const REF = '6f1c2b8e-3a4d-4e5f-9a7b-1c2d3e4f5a6b'
const base = { email: 'ana@example.com', nome: 'Ana', referencia: REF, origem: 'https://trilhaviva.org', titulo: 'Pacote', descricao: 'Acervo', valorCentavos: 8990 }
const doCheckout = (extra = {}) => {
  const corpo = montarCorpoPreferencia({ ...base, afiliado: 'AFI1XX' })
  return { id: 123456789, status: 'approved', external_reference: REF, transaction_amount: 89.9, metadata: corpo.metadata, ...extra }
}

test('o código do afiliado vai na metadata do pagamento e o preço não muda', () => {
  const com = montarCorpoPreferencia({ ...base, afiliado: 'AFI1XX' })
  const sem = montarCorpoPreferencia(base)
  assert.equal(com.metadata.afiliado, 'AFI1XX')
  assert.equal(sem.metadata.afiliado, '')
  assert.equal(com.items[0].unit_price, 89.9)
  assert.equal(com.items[0].unit_price, sem.items[0].unit_price)
})

test('resumirPagamento lê o afiliado da metadata, ignora formato inválido e lê taxa e líquido', () => {
  assert.equal(resumirPagamento(doCheckout()).afiliado, 'AFI1XX')
  const falso = doCheckout()
  falso.metadata = { ...falso.metadata, afiliado: 'x; DROP' }
  assert.equal(resumirPagamento(falso).afiliado, null)
  const r = resumirPagamento(doCheckout({
    fee_details: [{ amount: 4.5 }, { amount: 0.55 }],
    transaction_details: { net_received_amount: 84.85 },
  }))
  assert.deepEqual(r.financeiro, { brutoCentavos: 8990, taxaCentavos: 505, liquidoCentavos: 8485 })
  const vazio = resumirPagamento(doCheckout()).financeiro
  assert.equal(vazio.taxaCentavos, null)
  assert.equal(vazio.liquidoCentavos, null)
})

test('refunded, charged_back e in_mediation viram "revertido"; rejected e cancelled seguem "failed"', () => {
  const casos = { refunded: 'reembolsado', charged_back: 'contestado', in_mediation: 'em_mediacao' }
  for (const [status, estado] of Object.entries(casos)) {
    const r = resumirPagamento(doCheckout({ status }))
    assert.equal(r.status, 'revertido')
    assert.equal(r.estadoCompra, estado)
  }
  for (const status of ['rejected', 'cancelled']) {
    const r = resumirPagamento(doCheckout({ status }))
    assert.equal(r.status, 'failed')
    assert.equal(r.estadoCompra, null)
  }
  assert.equal(resumirPagamento(doCheckout({ status: 'approved', transaction_amount_refunded: 10 })).status, 'paid')
  assert.equal(resumirPagamento({ id: 1, status: 'refunded', transaction_amount: 1 }).status, 'alheio')
})
