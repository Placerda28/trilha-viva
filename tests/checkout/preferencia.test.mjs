import test from 'node:test'
import assert from 'node:assert/strict'
import { montarCorpoPreferencia } from '../../lib/mercadopago.js'

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
