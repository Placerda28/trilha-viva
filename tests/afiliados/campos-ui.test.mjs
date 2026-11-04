import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cpfValido, mascaraCpf, sugerirCodigo, limparCodigoDigitado, reais, linkDoAfiliado, voltaPermitida,
} from '../../lib/afiliados-campos.js'
import { refDoEndereco, cookieDoRef, codigoDoCookie, cookieDoRefApagado } from '../../lib/afiliados-ref.js'

test('CPF: dígitos verificadores e máscara', () => {
  assert.equal(cpfValido('529.982.247-25'), true)
  assert.equal(cpfValido('52998224725'), true)
  assert.equal(cpfValido('529.982.247-24'), false)
  assert.equal(cpfValido('111.111.111-11'), false)
  assert.equal(cpfValido('123'), false)
  assert.equal(mascaraCpf('52998224725'), '529.982.247-25')
  assert.equal(mascaraCpf('5299'), '529.9')
})

test('sugestão de código: primeiro nome sem acento + 2 dígitos, até 15', () => {
  assert.equal(sugerirCodigo('João da Silva', () => 0), 'JOAO10')
  assert.equal(sugerirCodigo('Ana', () => 0.999), 'ANA99')
  assert.equal(sugerirCodigo('Maximiliano-Bartolomeu', () => 0.5), 'MAXIMILIANOBA55')
  assert.equal(sugerirCodigo('A', () => 0), '')
  assert.equal(sugerirCodigo('', () => 0), '')
  assert.equal(limparCodigoDigitado('jo ão-27!'), 'JOAO27')
  assert.equal(limparCodigoDigitado('a'.repeat(30)).length, 15)
})

test('sugestão cabe sempre no formato de 4 a 15', () => {
  for (const nome of ['Zé', 'Lu', 'Maximiliano Gonçalves', 'Ana Paula']) {
    const s = sugerirCodigo(nome, () => 0.3)
    assert.match(s, /^[A-Z0-9]{4,15}$/, nome)
  }
})

test('dinheiro e link', () => {
  assert.equal(reais(3000), 'R$ 30')
  assert.equal(reais(1500), 'R$ 15')
  assert.equal(reais(3050), 'R$ 30,50')
  assert.equal(reais(150000), 'R$ 1.500')
  assert.equal(linkDoAfiliado('https://trilhaviva.org/', 'JOAO27'), 'https://trilhaviva.org/?ref=JOAO27')
})

test('?volta= só aceita a lista fechada', () => {
  assert.equal(voltaPermitida('/minha-conta/afiliado'), '/minha-conta/afiliado')
  for (const ruim of ['//evil.com', 'https://evil.com', '/\\evil.com', '/acervo', '/minha-conta/afiliado/../x', '/minha-conta/afiliado?x=1', '', null, undefined]) {
    assert.equal(voltaPermitida(ruim), '', String(ruim))
  }
})

test('?ref=: normaliza, confere formato, o último vale e leva as UTMs', () => {
  assert.deepEqual(refDoEndereco('?ref=joao27&utm_source=ig&utm_medium=story&utm_campaign=nov&utm_content=a'), {
    codigo: 'JOAO27', utm_source: 'ig', utm_medium: 'story', utm_campaign: 'nov', utm_content: 'a',
  })
  assert.equal(refDoEndereco('?ref=a&ref=maria10').codigo, 'MARIA10')
  assert.equal(refDoEndereco('?ref=ab'), null)
  assert.equal(refDoEndereco('?ref=com espaco'), null)
  assert.equal(refDoEndereco('?ref=AAAAAAAAAAAAAAAA'), null)
  assert.equal(refDoEndereco('?outra=1'), null)
  assert.equal(refDoEndereco(''), null)
})

test('cookie do ref: 30 dias, path /, Lax, Secure só em https', () => {
  assert.equal(cookieDoRef('JOAO27', true), 'tv_ref=JOAO27; Max-Age=2592000; Path=/; SameSite=Lax; Secure')
  assert.equal(cookieDoRef('JOAO27', false), 'tv_ref=JOAO27; Max-Age=2592000; Path=/; SameSite=Lax')
})

test('checkout: código do cookie tv_ref e cookie apagado', () => {
  assert.equal(codigoDoCookie('a=1; tv_ref=JOAO27; b=2'), 'JOAO27')
  assert.equal(codigoDoCookie('tv_ref=joao27'), 'JOAO27')
  assert.equal(codigoDoCookie('tv_ref=AB'), '')
  assert.equal(codigoDoCookie('tv_ref=JOAO-27'), '')
  assert.equal(codigoDoCookie('outro=JOAO27'), '')
  assert.equal(codigoDoCookie(''), '')
  assert.equal(limparCodigoDigitado(' joão-27 !abcdefghijklmnop'), 'JOAO27ABCDEFGHI')
  assert.match(cookieDoRefApagado(true), /^tv_ref=; Max-Age=0; Path=\/.*; Secure$/)
})
