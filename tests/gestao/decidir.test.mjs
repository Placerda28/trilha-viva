import test from 'node:test'
import assert from 'node:assert/strict'
import { decidirPapel } from '../../lib/gestao/decidir.js'

const cliente = {
  id: 1,
  email: 'paulo@example.com',
  nome: 'Paulo',
  bloqueado: 0,
}

test('reconhece exatamente o admin master', () => {
  assert.equal(decidirPapel({ cliente, adminMaster: 'paulo@example.com' }), 'master')
})

test('normaliza maiúsculas e espaços nos dois e-mails', () => {
  assert.equal(
    decidirPapel({
      cliente: { ...cliente, email: '  PAULO@EXAMPLE.COM ' },
      adminMaster: ' Paulo@Example.com ',
    }),
    'master'
  )
})

test('ADMIN_MASTER vazio não dá acesso a ninguém', () => {
  assert.equal(decidirPapel({ cliente, adminMaster: '   ' }), null)
  assert.equal(decidirPapel({ cliente, adminMaster: undefined }), null)
})

test('cliente bloqueado não é admin mesmo com o e-mail certo', () => {
  assert.equal(decidirPapel({ cliente: { ...cliente, bloqueado: 1 }, adminMaster: cliente.email }), null)
})

test('e-mail apenas parecido não passa', () => {
  assert.equal(
    decidirPapel({
      cliente: { ...cliente, email: 'paulohenrique_ls@hotmail.com.br' },
      adminMaster: 'paulohenrique.ls@hotmail.com.br',
    }),
    null
  )
})
