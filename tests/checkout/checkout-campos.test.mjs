import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHAVE_CHECKOUT,
  celularValido,
  digitosCelular,
  escolherInicial,
  esquecer,
  guardar,
  lerGuardado,
  mascaraCelular,
  valoresDoEnvio,
} from '../../lib/checkout-campos.js'

class Memoria {
  constructor() {
    this.dados = new Map()
  }
  getItem(k) {
    return this.dados.has(k) ? this.dados.get(k) : null
  }
  setItem(k, v) {
    this.dados.set(k, String(v))
  }
  removeItem(k) {
    this.dados.delete(k)
  }
}

// Como a aba anônima do Safari antigo ou um bloqueio de site: tudo dá erro.
const bloqueado = {
  getItem() {
    throw new Error('SecurityError')
  },
  setItem() {
    throw new Error('QuotaExceededError')
  },
  removeItem() {
    throw new Error('SecurityError')
  },
}

// O formulário como o navegador o enxerga: campos achados pelo name.
function formCom(valores) {
  return { elements: { namedItem: (nome) => (nome in valores ? { value: valores[nome] } : null) } }
}

test('máscara aceita os jeitos que o preenchimento automático cola o número', () => {
  for (const entrada of ['+55 27 99999-8888', '5527999998888', '27999998888', '(27) 99999-8888', '+55 (27) 99999-8888', '027 99999-8888']) {
    assert.equal(mascaraCelular(entrada), '(27) 99999-8888', entrada)
    assert.equal(digitosCelular(entrada), '27999998888', entrada)
    assert.ok(celularValido(digitosCelular(entrada)), entrada)
  }
})

test('número fixo ou sem o 9 (10 dígitos) também passa, com e sem +55', () => {
  assert.equal(mascaraCelular('+55 27 9999-8888'), '(27) 9999-8888')
  assert.equal(mascaraCelular('2799998888'), '(27) 9999-8888')
  assert.ok(celularValido(digitosCelular('552799998888')))
})

test('máscara não trava nem corta enquanto a pessoa digita', () => {
  let campo = ''
  for (const tecla of '27999998888') campo = mascaraCelular(campo + tecla)
  assert.equal(campo, '(27) 99999-8888')
  // Apagar até o fim também funciona.
  for (let i = 0; campo && i < 20; i++) campo = mascaraCelular(campo.slice(0, -1))
  assert.equal(campo, '')
})

test('preenchido de uma vez pelo navegador sem avisar o React: o envio leva os três valores', () => {
  const estadoVazio = { nome: '', email: '', telefone: '' }
  const form = formCom({ name: ' Maria Silva ', email: 'maria@gmail.com', tel: '+55 27 99999-8888' })
  const v = valoresDoEnvio(estadoVazio, form)
  assert.deepEqual(v, { nome: 'Maria Silva', email: 'maria@gmail.com', telefone: '+55 27 99999-8888' })
  assert.equal(digitosCelular(v.telefone), '27999998888')
})

test('com o estado preenchido, vale o estado', () => {
  const v = valoresDoEnvio({ nome: 'Ana', email: 'ana@x.com', telefone: '(27) 99999-8888' }, formCom({ name: 'outro', email: 'o@x.com', tel: '1' }))
  assert.deepEqual(v, { nome: 'Ana', email: 'ana@x.com', telefone: '(27) 99999-8888' })
})

test('prioridade: carrinho do lembrete > guardado no aparelho > vazio', () => {
  const carrinho = { nome: 'Do Lembrete', email: 'lembrete@x.com', telefone: '27911112222' }
  const guardado = { nome: 'Guardado', email: 'guardado@x.com', telefone: '27933334444' }
  assert.deepEqual(escolherInicial(carrinho, guardado), {
    nome: 'Do Lembrete', email: 'lembrete@x.com', telefone: '(27) 91111-2222', lembrado: false,
  })
  // Campo que falta no carrinho vem do guardado, e aí mostra o "Limpar".
  assert.deepEqual(escolherInicial({ nome: 'Do Lembrete', email: 'lembrete@x.com' }, guardado), {
    nome: 'Do Lembrete', email: 'lembrete@x.com', telefone: '(27) 93333-4444', lembrado: true,
  })
  assert.deepEqual(escolherInicial(null, guardado), {
    nome: 'Guardado', email: 'guardado@x.com', telefone: '(27) 93333-4444', lembrado: true,
  })
  assert.deepEqual(escolherInicial(null, null), { nome: '', email: '', telefone: '', lembrado: false })
})

test('guardar, ler e "Limpar" apagam de verdade a chave tv_checkout', () => {
  const m = new Memoria()
  guardar({ nome: 'Maria', email: 'maria@gmail.com', telefone: '27999998888' }, m)
  assert.equal(CHAVE_CHECKOUT, 'tv_checkout')
  assert.deepEqual(JSON.parse(m.getItem('tv_checkout')), { nome: 'Maria', email: 'maria@gmail.com', telefone: '27999998888' })
  assert.deepEqual(lerGuardado(m), { nome: 'Maria', email: 'maria@gmail.com', telefone: '27999998888' })
  esquecer(m)
  assert.equal(m.getItem('tv_checkout'), null)
  assert.equal(lerGuardado(m), null)
  assert.deepEqual(escolherInicial(null, lerGuardado(m)), { nome: '', email: '', telefone: '', lembrado: false })
})

test('armazenamento bloqueado ou ausente não quebra nada', () => {
  assert.doesNotThrow(() => guardar({ nome: 'a', email: 'b', telefone: 'c' }, bloqueado))
  assert.equal(lerGuardado(bloqueado), null)
  assert.doesNotThrow(() => esquecer(bloqueado))
  assert.equal(lerGuardado(null), null)
  // Sem window (servidor/Node): também não quebra.
  assert.equal(lerGuardado(), null)
  assert.doesNotThrow(() => guardar({ nome: 'a' }))
  assert.doesNotThrow(() => esquecer())
})

test('conteúdo estragado na chave é ignorado', () => {
  const m = new Memoria()
  m.setItem('tv_checkout', '{quebrado')
  assert.equal(lerGuardado(m), null)
  m.setItem('tv_checkout', JSON.stringify({ nome: 42, email: ['x'] }))
  assert.equal(lerGuardado(m), null)
})
