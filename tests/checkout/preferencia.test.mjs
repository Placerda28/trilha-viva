import test from 'node:test'
import assert from 'node:assert/strict'
import { montarCorpoPreferencia, resumirPagamento } from '../../lib/mercadopago.js'

const REF = '0f0e0d0c-0b0a-4908-8706-050403020100'

test('preferência sem cupom vence em 7 dias e grava o valor cobrado (auditoria B4 e B5)', () => {
  const agora = Date.parse('2026-11-08T12:00:00Z')
  const corpo = montarCorpoPreferencia({
    email: 'a@x.com', nome: 'A', referencia: REF, origem: 'https://trilhaviva.org',
    titulo: 'P', descricao: 'D', valorCentavos: 8990, expiraEmMin: 7 * 24 * 60, agora,
  })
  assert.equal(corpo.expires, true)
  assert.equal(corpo.expiration_date_to, '2026-11-15T09:00:00.000-03:00')
  assert.equal(corpo.metadata.valor_centavos, 8990)
})

test('pagamento só é do site se for em real e pelo menos o valor gravado (auditoria B5)', () => {
  const base = { id: 1, status: 'approved', external_reference: REF, currency_id: 'BRL', transaction_amount: 89.9,
    metadata: { referencia: REF, valor_centavos: 8990 } }
  assert.equal(resumirPagamento(base).status, 'paid')
  assert.equal(resumirPagamento({ ...base, transaction_amount: 1 }).status, 'alheio')
  assert.equal(resumirPagamento({ ...base, currency_id: 'USD' }).status, 'alheio')
  // preferência antiga, sem valor gravado: segue como antes
  assert.equal(resumirPagamento({ ...base, transaction_amount: 1, metadata: { referencia: REF } }).status, 'paid')
})

// Sem back_urls em https e auto_return, o Mercado Pago deixa a pessoa parada
// na tela dele depois de pagar.
test('a preferência volta sozinha para a /sucesso quando o pagamento é aprovado', () => {
  const corpo = montarCorpoPreferencia({
    email: 'ana@example.com',
    nome: 'Ana',
    referencia: '0f0e0d0c-0b0a-4908-8706-050403020100',
    origem: 'https://trilhaviva.org',
    titulo: 'Pacote',
    descricao: 'Acervo',
    valorCentavos: 8990,
  })
  assert.equal(corpo.auto_return, 'approved')
  assert.deepEqual(corpo.back_urls, {
    success: 'https://trilhaviva.org/sucesso',
    pending: 'https://trilhaviva.org/sucesso',
    failure: 'https://trilhaviva.org/assinar?cancelado=1',
  })
  for (const url of Object.values(corpo.back_urls)) assert.match(url, /^https:\/\//)
  assert.equal(corpo.external_reference, '0f0e0d0c-0b0a-4908-8706-050403020100')
})
