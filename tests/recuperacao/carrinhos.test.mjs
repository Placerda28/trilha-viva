import test from 'node:test'
import assert from 'node:assert/strict'
import { limparUtm, nomeValido, origemDoCarrinho } from '../../lib/carrinhos.js'

test('nome é obrigatório depois do trim e aceita até 80 caracteres', () => {
  assert.equal(nomeValido(' Ana '), true)
  assert.equal(nomeValido(''), false)
  assert.equal(nomeValido('   '), false)
  assert.equal(nomeValido('a'.repeat(80)), true)
  assert.equal(nomeValido('a'.repeat(81)), false)
})

test('utm fica em minúsculas, usa somente o alfabeto permitido e limita cada campo', () => {
  assert.deepEqual(
    limparUtm({
      source: ' E-mail! ',
      medium: 'Lembrete / Carrinho',
      campaign: 'A'.repeat(50) + '.final',
    }),
    {
      source: 'e-mail',
      medium: 'lembretecarrinho',
      campaign: 'a'.repeat(40),
    }
  )
  assert.deepEqual(limparUtm(null), { source: '', medium: '', campaign: '' })
})

test('origem reúne utm e cupom limpos sem ultrapassar 200 caracteres', () => {
  assert.equal(
    origemDoCarrinho({
      utm: { source: 'Email', medium: 'Lembrete', campaign: 'Carrinho' },
      cupom: ' louvor;20 ',
    }),
    'utm=email/lembrete/carrinho;cupom=LOUVOR20'
  )
  assert.equal(origemDoCarrinho({}), '')
  assert.ok(
    origemDoCarrinho({
      utm: {
        source: 'a'.repeat(100),
        medium: 'b'.repeat(100),
        campaign: 'c'.repeat(100),
      },
      cupom: 'd'.repeat(100),
    }).length <= 200
  )
})
