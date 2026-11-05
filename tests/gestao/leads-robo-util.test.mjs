import test from 'node:test'
import assert from 'node:assert/strict'
import { acoesDoLead, canaisDoLead, diaHora, passosDoFunil, proximoEnvio, situacao, TEXTO_FILA } from '../../components/gestao/leadsRobo.js'

const AGORA = Date.parse('2026-11-10T15:00:00Z')
const lead = (extra) => ({
  id: 7, nome: 'Ana', etapa_email: 3, total_emails: 8, etapa_whatsapp: 2, total_whatsapp: 4,
  proximo_email_em: '2026-11-12T12:00:00Z', proximo_whatsapp_em: '2026-11-11T13:00:00Z',
  whatsapp_parado_em: null, whatsapp_motivo: null, encerrado: false, encerrado_motivo: null, convertido: false, ...extra,
})

test('próximo envio sai em DD/MM HH:mm de Brasília; data passada vira fila do robô', () => {
  assert.equal(diaHora('2026-11-12T12:00:00Z'), '12/11 09:00')
  assert.deepEqual(proximoEnvio('2026-11-12T12:00:00Z', AGORA), { fila: false, texto: '12/11 09:00' })
  assert.deepEqual(proximoEnvio('2026-11-10T14:59:00Z', AGORA), { fila: true, texto: TEXTO_FILA })
  assert.equal(proximoEnvio(null, AGORA), null)
})

test('situação: andamento, encerrado com motivo e convertido', () => {
  assert.deepEqual(situacao(lead()), { id: 'andamento', rotulo: 'Em andamento', detalhe: '' })
  assert.deepEqual(situacao(lead({ encerrado: true, encerrado_motivo: 'parado' })), { id: 'encerrado', rotulo: 'Encerrado', detalhe: 'Parado pela Gestão' })
  assert.equal(situacao(lead({ encerrado: true, encerrado_motivo: 'descadastrou' })).detalhe, 'Pediu para sair')
  assert.deepEqual(situacao(lead({ convertido: true, encerrado: true, encerrado_motivo: 'comprou' })), { id: 'convertido', rotulo: 'Convertido', detalhe: '' })
  assert.equal(situacao(lead({ convertido: true })).id, 'convertido')
})

test('ações: encerrado não tem nenhuma; canal sem próximo envio ou já na fila some', () => {
  assert.deepEqual(acoesDoLead(lead(), new Set(), AGORA).map((a) => a.id), ['whatsapp', 'email', 'parar'])
  assert.deepEqual(acoesDoLead(lead({ encerrado: true }), new Set(), AGORA), [])
  assert.deepEqual(acoesDoLead(lead({ proximo_whatsapp_em: null }), new Set(), AGORA).map((a) => a.id), ['email', 'parar'])
  assert.deepEqual(acoesDoLead(lead(), new Set(['7:whatsapp']), AGORA).map((a) => a.id), ['email', 'parar'])
  assert.deepEqual(acoesDoLead(lead({ proximo_email_em: '2026-11-10T14:00:00Z' }), new Set(), AGORA).map((a) => a.id), ['whatsapp', 'parar'])
})

test('canais: etapa, próximo envio e motivo do WhatsApp parado', () => {
  const [email, zap] = canaisDoLead(lead(), new Set(), AGORA)
  assert.equal(`${email.rotulo} ${email.etapa}/${email.total}`, 'E-mail 3/8')
  assert.equal(zap.prox.texto, '11/11 10:00')
  const parado = canaisDoLead(lead({ proximo_whatsapp_em: null, whatsapp_parado_em: '2026-11-09T10:00:00Z', whatsapp_motivo: 'falhou' }), new Set(), AGORA)[1]
  assert.equal(parado.nota, 'Parado: número sem WhatsApp')
  assert.equal(parado.falha, true)
  const completo = canaisDoLead(lead({ etapa_whatsapp: 4, proximo_whatsapp_em: null }), new Set(), AGORA)[1]
  assert.equal(completo.nota, 'Sequência completa')
  assert.equal(canaisDoLead(lead(), new Set(['7:email']), AGORA)[0].prox.fila, true)
})

test('funil: percentuais sobre os cadastros e "clicaram" sem dado', () => {
  const g = passosDoFunil({
    cadastros: 40, baixaram: 30, compraram: 4, clicaram: null,
    whatsapp: [{ etapa: 1, enviadas: 40, entregues: 20, lidas: 10, falhas: 2 }],
    emails: [{ etapa: 1, receberam: 40 }],
  })
  assert.equal(g.entrada[1].pct, 75)
  assert.equal(g.whatsapp[0].pct, 50)
  assert.equal(g.whatsapp[0].pctLidas, 25)
  assert.equal(g.emails[0].pct, 100)
  assert.equal(g.resultado[0].valor, null)
  assert.equal(g.resultado[0].pct, null)
  assert.equal(g.resultado[1].pct, 10)
  assert.equal(passosDoFunil({ cadastros: 0, baixaram: 0, compraram: 0, whatsapp: [], emails: [] }).entrada[0].pct, 0)
})
