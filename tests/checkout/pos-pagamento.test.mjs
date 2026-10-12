import test from 'node:test'
import assert from 'node:assert/strict'
import { TENTATIVAS_MAXIMAS, mascararEmail, proximoPasso } from '../../lib/pos-pagamento.js'

test('a espera dura 3 minutos, de 3 em 3 segundos', () => {
  assert.equal(TENTATIVAS_MAXIMAS, 60)
})

test('pendente → aprovado → criar senha', () => {
  assert.equal(proximoPasso({ status: 'pending' }, 0), 'esperar')
  assert.equal(proximoPasso({ status: 'pending' }, 59), 'esperar')
  assert.equal(proximoPasso({ status: 'paid', temConta: false }, 7), 'senha')
})

test('aprovado de quem já tem senha vai para a entrada', () => {
  assert.equal(proximoPasso({ status: 'paid', temConta: true }, 0), 'entrar')
})

test('tempo esgotado depois de 3 minutos pendente', () => {
  assert.equal(proximoPasso({ status: 'pending' }, 60), 'esgotado')
})

test('recusado e erro', () => {
  assert.equal(proximoPasso({ status: 'failed' }), 'recusado')
  assert.equal(proximoPasso({ status: 'invalid' }), 'erro')
  assert.equal(proximoPasso({}), 'erro')
})

test('e-mail mascarado mostra só a primeira letra e o domínio', () => {
  assert.equal(mascararEmail('paulo@gmail.com'), 'p***@gmail.com')
  assert.equal(mascararEmail('  x@a.com.br '), 'x***@a.com.br')
  assert.equal(mascararEmail(''), '')
  assert.equal(mascararEmail('semarroba'), '')
})
