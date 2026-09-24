import test from 'node:test'
import assert from 'node:assert/strict'
import { montarCorpoPreferencia, resumirPagamento } from '../../lib/mercadopago.js'

test('preferência usa preço em centavos, cupom no metadata e duas expirações', () => {
  const corpo = montarCorpoPreferencia({
    email: 'ana@example.com',
    nome: 'Ana',
    referencia: '11111111-1111-4111-8111-111111111111',
    origem: 'https://trilhaviva.org',
    titulo: 'Trilha Viva',
    descricao: 'Acervo',
    valorCentavos: 7192,
    cupom: 'LOUVOR20',
    expiraEmMin: 30,
    agora: Date.parse('2026-09-24T15:00:00Z'),
  })

  assert.equal(corpo.items[0].unit_price, 71.92)
  assert.equal(corpo.metadata.cupom, 'LOUVOR20')
  assert.equal(corpo.expiration_date_to, '2026-09-24T12:30:00.000-03:00')
  assert.equal(corpo.date_of_expiration, '2026-09-24T12:30:00.000-03:00')
})

test('resumo aceita o cupom apenas do metadata e o normaliza', () => {
  const resumo = resumirPagamento({
    id: 987654321,
    status: 'approved',
    external_reference: '11111111-1111-4111-8111-111111111111',
    transaction_amount: 71.92,
    currency_id: 'BRL',
    metadata: { email: 'ana@example.com', cupom: 'louvor20' },
    cupom: 'NAO_CONFIAR',
  })
  assert.equal(resumo.cupom, 'LOUVOR20')
  assert.equal(resumo.valorCentavos, 7192)
})

test('preferência recusa preço abaixo de R$ 1,00', () => {
  assert.throws(
    () => montarCorpoPreferencia({ valorCentavos: 99 }),
    /preço inválido/
  )
})
