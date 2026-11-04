import test from 'node:test'
import assert from 'node:assert/strict'
import { validarCpf, limparCpf } from '../../lib/afiliados/cpf.js'

test('CPF: dígitos verificadores, máscara e sequências repetidas', () => {
  assert.equal(validarCpf('529.982.247-25'), true)
  assert.equal(validarCpf('52998224725'), true)
  assert.equal(validarCpf('529.982.247-24'), false)
  assert.equal(validarCpf('529.982.247-52'), false)
  for (let d = 0; d <= 9; d++) assert.equal(validarCpf(String(d).repeat(11)), false)
  assert.equal(validarCpf('1234567890'), false)
  assert.equal(validarCpf('529982247255'), false)
  assert.equal(validarCpf(''), false)
  assert.equal(validarCpf(null), false)
  assert.equal(limparCpf(' 529.982.247-25 '), '52998224725')
})
