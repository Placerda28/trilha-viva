import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import {
  carrinhoParaPreencher,
  gravarCarrinho,
  limparTelefone,
  limparUtm,
  nomeValido,
  origemDoCarrinho,
  telefoneValido,
} from '../../lib/carrinhos.js'

class D1Local {
  constructor(banco) {
    this.banco = banco
  }

  prepare(sql) {
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novosValores) {
        valores = novosValores
        return this
      },
      async first() {
        return preparada.get(...valores) || null
      },
      async run() {
        const resultado = preparada.run(...valores)
        return { meta: { changes: resultado.changes } }
      },
    }
  }
}

test('celular guarda só dígitos, remove o 55 e exige DDD válido', () => {
  assert.equal(limparTelefone('(11) 98765-4321'), '11987654321')
  assert.equal(limparTelefone('+55 (11) 98765-4321'), '11987654321')
  assert.equal(limparTelefone('55 11 3456-7890'), '1134567890')
  assert.equal(limparTelefone('abc'), '')

  assert.equal(telefoneValido('(11) 98765-4321'), true)
  assert.equal(telefoneValido('1134567890'), true)
  assert.equal(telefoneValido('01198765432'), false)
  assert.equal(telefoneValido('119876543'), false)
  assert.equal(telefoneValido('551198765432100'), false)
  assert.equal(telefoneValido(''), false)
})

test('carrinho grava e devolve o celular limpo para preencher o checkout', async () => {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0004_carrinhos.sql', 'utf8'))
  const db = new D1Local(banco)
  await gravarCarrinho(db, {
    id: 'referencia',
    email: ' Pessoa@Example.com ',
    nome: 'Pessoa',
    telefone: '+55 (11) 98765-4321',
    origem: 'utm=email/lembrete/carrinho',
  })

  assert.deepEqual(
    { ...(await carrinhoParaPreencher(db, 'referencia')) },
    { nome: 'Pessoa', email: 'pessoa@example.com', telefone: '11987654321' }
  )
})

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
      content: '',
    }
  )
  assert.deepEqual(limparUtm(null), { source: '', medium: '', campaign: '', content: '' })
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
  assert.equal(
    origemDoCarrinho({ utm: { source: 'whatsapp', medium: 'lembrete', campaign: 'carrinho', content: 'semana2' } }),
    'utm=whatsapp/lembrete/carrinho/semana2'
  )
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
