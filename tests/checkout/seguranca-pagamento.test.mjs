// Achados da revisão de segurança de 19/10/2026 (relatório privado em
// ~/tv-backups/seguranca/2026-10-19-baseline.md): M-1, M-2 e M-3.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chaveDaCompraNoPrazo, montarCorpoPreferencia, resumirPagamento } from '../../lib/mercadopago.js'

const REF = '6f1c2b8e-3a4d-4e5f-9a7b-1c2d3e4f5a6b'

function doCheckout(extra = {}) {
  const corpo = montarCorpoPreferencia({
    email: 'ana@example.com', nome: 'Ana', referencia: REF, origem: 'https://trilhaviva.org',
    titulo: 'Pacote', descricao: 'Acervo', valorCentavos: 8990,
  })
  return { id: 123456789, status: 'approved', external_reference: corpo.external_reference, transaction_amount: 89.9, metadata: corpo.metadata, ...extra }
}

test('M-1: pagamento aprovado que nasceu no nosso checkout libera o acesso', () => {
  assert.equal(resumirPagamento(doCheckout()).status, 'paid')
})

test('M-1: Pix ou transferência direto na conta (sem a referência do checkout) não libera nada', () => {
  // Pagamento de outra coisa: sem external_reference nem metadata nossa.
  assert.equal(resumirPagamento({ id: 555555555, status: 'approved', transaction_amount: 1, payer: { email: 'x@example.com' } }).status, 'alheio')
  // Link de pagamento avulso com uma referência qualquer.
  assert.equal(resumirPagamento({ id: 555555556, status: 'approved', external_reference: 'pedido-42', transaction_amount: 1 }).status, 'alheio')
  // Referência com cara de UUID, mas sem a metadata que só o nosso servidor grava.
  assert.equal(resumirPagamento({ id: 555555557, status: 'approved', external_reference: REF, transaction_amount: 1 }).status, 'alheio')
  // Metadata de outra referência.
  assert.equal(resumirPagamento(doCheckout({ external_reference: '11111111-1111-4111-8111-111111111111' })).status, 'alheio')
  // Pendente e de fora: também não mexe em reserva de cupom.
  assert.equal(resumirPagamento({ id: 555555558, status: 'pending', transaction_amount: 1 }).status, 'alheio')
})

test('M-1: a confirmação da /sucesso trata pagamento alheio como link inválido', () => {
  const fonte = readFileSync('lib/confirmar.js', 'utf8')
  assert.match(fonte, /r\.status === 'alheio'/)
})

test('M-2: o endereço de volta do pagamento é sempre o do site, nunca o cabeçalho Origin', () => {
  const rota = readFileSync('app/api/checkout/route.js', 'utf8')
  assert.doesNotMatch(rota, /headers\.get\(['"]origin['"]\)/i)
})

test('M-3: a chave da compra só cria a senha nas primeiras 24 horas depois do pagamento', () => {
  const agora = Date.parse('2026-10-19T12:00:00Z')
  assert.equal(chaveDaCompraNoPrazo('2026-10-19T08:00:00.000-03:00', agora), true) // 1 h antes
  assert.equal(chaveDaCompraNoPrazo('2026-10-18T10:00:00.000-03:00', agora), true) // 23 h antes
  assert.equal(chaveDaCompraNoPrazo('2026-10-18T08:00:00.000-03:00', agora), false) // 25 h antes
  assert.equal(chaveDaCompraNoPrazo('', agora), false)
  assert.equal(chaveDaCompraNoPrazo('não é data', agora), false)
  assert.ok('aprovadoEm' in resumirPagamento(doCheckout({ date_approved: '2026-10-19T08:00:00.000-03:00' })))
  assert.match(readFileSync('app/api/conta/criar/route.js', 'utf8'), /chaveDaCompraNoPrazo\(/)
})

test('M-3: a Meta não recebe a referência secreta (nem como id do evento nem como pedido)', () => {
  const rota = readFileSync('app/api/mercadopago/webhook/route.js', 'utf8')
  assert.doesNotMatch(rota, /id: r\.referencia/)
  assert.doesNotMatch(rota, /referencia: r\.referencia \|\| r\.compraId/)
})

test('M-3: o Pixel não carrega na /sucesso (o endereço dela traz a chave da compra)', () => {
  const pixel = readFileSync('components/MetaPixel.jsx', 'utf8')
  assert.match(pixel, /pathname === '\/sucesso'/)
})
