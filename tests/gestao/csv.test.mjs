import test from 'node:test'
import assert from 'node:assert/strict'
import {
  celulaCsv,
  formatarDataBrasilia,
  formatarReais,
  gerarCsv,
  linhaClienteCsv,
  protegerFormula,
} from '../../lib/gestao/csv.js'

test('CSV tem BOM, ponto e vírgula e fim de linha do Excel', () => {
  assert.equal(gerarCsv(['Nome', 'Valor'], [['Paulo', '197,00']]), '\uFEFFNome;Valor\r\nPaulo;197,00\r\n')
})

test('aspas seguem RFC 4180', () => {
  assert.equal(celulaCsv('Nome; com separador'), '"Nome; com separador"')
  assert.equal(celulaCsv('Ele disse "oi"'), '"Ele disse ""oi"""')
  assert.equal(celulaCsv('linha 1\nlinha 2'), '"linha 1\nlinha 2"')
})

test('protege todas as fórmulas perigosas', () => {
  for (const valor of ['=1+1', '+1', '-1', '@soma', '\tab', '\rcd']) {
    assert.equal(protegerFormula(valor), `'${valor}`)
  }
  assert.equal(protegerFormula('texto normal'), 'texto normal')
})

test('formata centavos e horário de Brasília', () => {
  assert.equal(formatarReais(19700), '197,00')
  assert.equal(formatarReais(199), '1,99')
  assert.equal(formatarDataBrasilia('2026-09-24 03:15:00'), '24/09/2026 00:15')
})

test('linha de cliente mantém a ordem pedida', () => {
  assert.deepEqual(
    linhaClienteCsv({
      nome: 'Ana',
      email: 'ana@example.com',
      compra_em: '2026-09-24 15:30:00',
      compra_valor_centavos: 19700,
      compra_forma: 'pix',
      compra_cupom: 'LOUVOR20',
      supabase_id: 'abc',
      downloads: 2,
      compras: 3,
      bloqueado: 0,
    }),
    ['Ana', 'ana@example.com', '24/09/2026 12:30', '197,00', 'Pix', 'LOUVOR20', 'Sim', 2, 3, 'Não']
  )
})
