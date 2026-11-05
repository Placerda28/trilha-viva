import test from 'node:test'
import assert from 'node:assert/strict'
import { decidirPapel, ehMaster, mastersDe } from '../../lib/gestao/decidir.js'

const cliente = {
  id: 1,
  email: 'paulo@example.com',
  nome: 'Paulo',
  bloqueado: 0,
}

test('reconhece exatamente o admin master', () => {
  assert.equal(decidirPapel({ cliente, adminMaster: 'paulo@example.com' }), 'master')
})

test('reconhece membro ativo sem permitir que a tabela crie outro master', () => {
  assert.equal(
    decidirPapel({
      cliente: { ...cliente, email: 'membro@example.com', equipe_id: 9 },
      adminMaster: cliente.email,
    }),
    'membro'
  )
  assert.equal(
    decidirPapel({ cliente: { ...cliente, equipe_id: 9 }, adminMaster: cliente.email }),
    'master'
  )
})

test('membro removido não recebe papel na requisição seguinte', () => {
  assert.equal(
    decidirPapel({
      cliente: { ...cliente, email: 'membro@example.com', equipe_id: null },
      adminMaster: cliente.email,
    }),
    null
  )
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
  assert.equal(
    decidirPapel({
      cliente: { ...cliente, email: 'membro@example.com', bloqueado: 1, equipe_id: 9 },
      adminMaster: cliente.email,
    }),
    null
  )
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

test('ADMIN_MASTER aceita lista por vírgula, ponto e vírgula ou espaço, sem diferenciar maiúsculas', () => {
  assert.deepEqual(mastersDe(' A@x.com, b@y.com;c@z.com  d@w.com '), ['a@x.com', 'b@y.com', 'c@z.com', 'd@w.com'])
  assert.equal(decidirPapel({ cliente: { ...cliente, email: 'KAYLAN@y.com' }, adminMaster: 'paulo@x.com, kaylan@y.com' }), 'master')
  assert.equal(decidirPapel({ cliente: { ...cliente, email: 'paulo@x.com' }, adminMaster: 'paulo@x.com' }), 'master')
})

test('lista vazia, com lixo ou com item vazio não vira master de ninguém', () => {
  for (const v of ['', ' , ; ', ',', 'lixo', null, undefined, 42]) assert.deepEqual(mastersDe(v), [])
  assert.deepEqual(mastersDe('a@x.com,'), ['a@x.com'])
  assert.equal(ehMaster('', 'a@x.com,'), false)
  assert.equal(ehMaster('   ', ' , '), false)
  assert.equal(decidirPapel({ cliente: { ...cliente, email: '' }, adminMaster: 'a@x.com,' }), null)
})

test('master na lista que também está na equipe continua master; bloqueado é recusado', () => {
  assert.equal(decidirPapel({ cliente: { ...cliente, email: 'k@y.com', equipe_id: 3 }, adminMaster: 'p@x.com, k@y.com' }), 'master')
  assert.equal(decidirPapel({ cliente: { ...cliente, email: 'k@y.com', bloqueado: 1 }, adminMaster: 'p@x.com, k@y.com' }), null)
})
