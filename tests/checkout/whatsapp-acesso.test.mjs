import test from 'node:test'
import assert from 'node:assert/strict'
import { enviarAcessoLiberado, pedidoAcesso, textoAcesso } from '../../lib/whatsapp-acesso.js'

const ligado = { WA_ACESSO: 'ativo', WA_PHONE_NUMBER_ID: '123', WA_TOKEN: 'tok' }

function bancoFalso(estado = 'ativo') {
  const gravadas = []
  return {
    gravadas,
    prepare(sql) {
      let valores = []
      return {
        bind(...v) {
          valores = v
          return this
        },
        async first() {
          return sql.includes('whatsapp_estado') ? { estado } : null
        },
        async run() {
          gravadas.push(valores)
          return { meta: { changes: 1 } }
        },
      }
    },
  }
}

function metaFalsa(chamadas, ok = true) {
  return async (url, init) => {
    chamadas.push({ url, corpo: JSON.parse(init.body) })
    return {
      ok,
      status: ok ? 200 : 400,
      json: async () => (ok ? { messages: [{ id: 'wamid.1' }] } : { error: { code: 132001, message: 'modelo' } }),
    }
  }
}

test('desligado enquanto WA_ACESSO não for "ativo": não chama a Meta', async () => {
  const chamadas = []
  const r = await enviarAcessoLiberado({ ...ligado, WA_ACESSO: '' }, bancoFalso(), { telefone: '27999990000', nome: 'Ana', token: 't' }, metaFalsa(chamadas))
  assert.equal(r, 'desligado')
  assert.equal(chamadas.length, 0)
})

test('respeita a pausa geral do WhatsApp', async () => {
  const chamadas = []
  const r = await enviarAcessoLiberado(ligado, bancoFalso('pausado'), { telefone: '27999990000', nome: 'Ana', token: 't' }, metaFalsa(chamadas))
  assert.equal(r, 'pausado')
  assert.equal(chamadas.length, 0)
})

test('ligado: manda o modelo acesso_liberado com o código do link no botão', async () => {
  const chamadas = []
  const db = bancoFalso()
  const r = await enviarAcessoLiberado(ligado, db, { telefone: '5527999990000', nome: 'Ana Souza', token: 'abc' }, metaFalsa(chamadas))
  assert.equal(r, 'enviado')
  const corpo = chamadas[0].corpo
  assert.equal(corpo.to, '5527999990000')
  assert.equal(corpo.template.name, 'acesso_liberado')
  assert.equal(corpo.template.components[0].parameters[0].text, 'Ana')
  assert.equal(corpo.template.components[1].parameters[0].text, 'abc')
  assert.equal(db.gravadas[0][2], textoAcesso('Ana Souza'))
})

test('falha da Meta nunca estoura (o aviso do Mercado Pago segue)', async () => {
  const r = await enviarAcessoLiberado(ligado, bancoFalso(), { telefone: '27999990000', nome: 'Ana', token: 't' }, metaFalsa([], false))
  assert.equal(r, 'falhou')
})

test('sem telefone válido não envia', async () => {
  assert.equal(await enviarAcessoLiberado(ligado, bancoFalso(), { telefone: '123', nome: 'Ana', token: 't' }), 'sem_telefone')
  assert.equal(pedidoAcesso({ telefone: '27999990000', nome: '', token: 'x' }).template.components[0].parameters[0].text, 'tudo bem')
})
