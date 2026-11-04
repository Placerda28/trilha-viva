import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LIMITE_DIAS, MAX_BYTES, conferirArquivo, quemPagou, tamanhoTexto, tempoMedio, textoEspera, tipoDoArquivo, urgente, valorParaCopiar,
} from '../../components/gestao/afiliados/saquesUtil.js'

test('espera: vermelho só depois de 3 dias', () => {
  assert.equal(LIMITE_DIAS, 3)
  assert.equal(urgente(3), false)
  assert.equal(urgente(4), true)
  assert.equal(urgente(null), false)
  assert.equal(textoEspera(0), 'Pedido de hoje')
  assert.equal(textoEspera(1), 'Esperando há 1 dia')
  assert.equal(textoEspera(5), 'Esperando há 5 dias')
})

test('tempo médio vem em horas e fica em horas até 48 h', () => {
  assert.equal(tempoMedio(null), '—')
  assert.equal(tempoMedio(0.4), 'menos de 1 hora')
  assert.equal(tempoMedio(1.2), '1 hora')
  assert.equal(tempoMedio(38.4), '38,4 horas')
  assert.equal(tempoMedio(72), '3 dias')
})

test('arquivo do comprovante: tipo e tamanho', () => {
  assert.equal(conferirArquivo({ name: 'pix.pdf', type: 'application/pdf', size: 1000 }), '')
  assert.equal(conferirArquivo({ name: 'foto.png', type: 'image/png', size: MAX_BYTES }), '')
  assert.match(conferirArquivo({ name: 'foto.png', type: 'image/png', size: MAX_BYTES + 1 }), /5 MB/)
  assert.match(conferirArquivo({ name: 'x.exe', type: 'application/x-msdownload', size: 10 }), /PDF, JPG ou PNG/)
  assert.match(conferirArquivo({ name: 'vazio.pdf', type: 'application/pdf', size: 0 }), /vazio/)
  // sem tipo informado pelo sistema, vale a extensão
  assert.equal(tipoDoArquivo({ name: 'COMPROVANTE.JPG', type: '', size: 5 }), 'JPG')
  assert.equal(tipoDoArquivo({ name: 'x.pdf', type: 'text/html', size: 5 }), '')
})

test('texto de tamanho, valor para copiar e situação', () => {
  assert.equal(tamanhoTexto(512), '512 B')
  assert.equal(tamanhoTexto(312 * 1024), '312 KB')
  assert.equal(tamanhoTexto(1.5 * 1024 * 1024), '1,5 MB')
  assert.equal(valorParaCopiar(24000), '240,00')
  assert.equal(valorParaCopiar(123456), '1234,56')
  assert.equal(quemPagou({ status: 'solicitado' }), 'pendente')
  assert.equal(quemPagou({ status: 'pago' }), 'pago')
  assert.equal(quemPagou({ status: 'recusado' }), 'recusado')
})
