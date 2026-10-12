import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { acompanharAcessoLiberado } from '../../workers/recuperacao-carrinho/acesso-liberado.js'

// O robô acompanha o modelo "acesso_liberado" na Meta. Nada aqui chama a
// Meta de verdade: metaFalsa responde como ela.

class D1Local {
  constructor(banco) {
    this.banco = banco
  }
  prepare(sql) {
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novos) {
        valores = novos
        return this
      },
      async all() {
        return { results: preparada.all(...valores) }
      },
      async first() {
        return preparada.get(...valores) || null
      },
      async run() {
        return { meta: { changes: preparada.run(...valores).changes } }
      },
    }
  }
}

const MIGRACOES = ['0000_esquema_atual', '0001_gestao_fase1', '0002_cupons', '0004_carrinhos', '0005_recuperacao_v2', '0006_whatsapp',
  '0007_whatsapp_semanal', '0008_whatsapp_meta', '0009_whatsapp_estado', '0010_whatsapp_sequencia', '0011_whatsapp_anexos', '0012_rastreio', '0013_testes']

function montar() {
  const b = new DatabaseSync(':memory:')
  for (const m of MIGRACOES) b.exec(readFileSync('migrations/' + m + '.sql', 'utf8'))
  b.exec(`
    INSERT INTO clientes (id, email, nome) VALUES (1, 'cliente@real.com', 'Real'), (2, 'trilhaviva.suporte@gmail.com', 'Suporte');
    INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, teste) VALUES
      (1, 'mp_1', 8990, 'pago', 0), (2, 'mp_60', 100, 'pago', 1);
  `)
  return b
}

const mudo = { log() {}, error() {} }
const env = { WA_WABA_ID: '999', WA_PHONE_NUMBER_ID: '123', WA_TOKEN: 'tok', WA_TESTE_PARA: '27996253839', WA_ENCAMINHAR_PARA: 'suporte@x.com', RESEND_API_KEY: 'k', EMAIL_FROM: 'a@b.c' }

function metaFalsa(status, motivo = 'NONE') {
  const chamadas = { modelos: 0, mensagens: [], emails: [] }
  const f = async (url, init = {}) => {
    if (url.includes('message_templates')) {
      chamadas.modelos += 1
      return { ok: true, status: 200, json: async () => ({ data: [{ name: 'acesso_liberado', language: 'pt_BR', status, rejected_reason: motivo }] }) }
    }
    if (url.includes('/messages')) {
      chamadas.mensagens.push(JSON.parse(init.body))
      return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.teste' }] }) }
    }
    if (url.includes('resend')) {
      chamadas.emails.push(JSON.parse(init.body))
      return { ok: true, status: 200, json: async () => ({}) }
    }
    throw new Error('endereço inesperado ' + url)
  }
  return { f, chamadas }
}

test('pendente: guarda o status, não avisa e não manda teste; consulta no máximo a cada 30 min', async () => {
  const b = montar()
  const { f, chamadas } = metaFalsa('PENDING')
  assert.equal(await acompanharAcessoLiberado(env, { db: new D1Local(b), fetchImpl: f, logger: mudo }), 'PENDING')
  assert.equal(await acompanharAcessoLiberado(env, { db: new D1Local(b), fetchImpl: f, logger: mudo }), null)
  assert.equal(chamadas.modelos, 1)
  assert.equal(chamadas.mensagens.length + chamadas.emails.length, 0)
})

test('recusado: guarda o motivo e avisa por e-mail uma vez', async () => {
  const b = montar()
  const { f, chamadas } = metaFalsa('REJECTED', 'INVALID_FORMAT')
  assert.equal(await acompanharAcessoLiberado(env, { db: new D1Local(b), fetchImpl: f, logger: mudo }), 'REJECTED: INVALID_FORMAT')
  assert.match(chamadas.emails[0].subject, /recusado/)
  assert.match(chamadas.emails[0].text, /INVALID_FORMAT/)
  assert.equal(chamadas.mensagens.length, 0)
})

test('aprovado: avisa e manda UM teste ao celular do Paulo com link de criar senha de compra de teste', async () => {
  const b = montar()
  const { f, chamadas } = metaFalsa('APPROVED')
  assert.equal(await acompanharAcessoLiberado(env, { db: new D1Local(b), fetchImpl: f, logger: mudo }), 'APPROVED')
  assert.match(chamadas.emails[0].subject, /APROVADO/)
  assert.equal(chamadas.mensagens.length, 1)
  const msg = chamadas.mensagens[0]
  assert.equal(msg.to, '5527996253839')
  assert.equal(msg.template.name, 'acesso_liberado')
  const token = msg.template.components[1].parameters[0].text
  const linha = b.prepare("SELECT cliente_id, tipo, usado_em, expira_em > datetime('now', '+71 hours') AS dura FROM tokens WHERE token_hash = ?")
    .get(createHash('sha256').update(token).digest('hex'))
  assert.deepEqual({ ...linha }, { cliente_id: 2, tipo: 'criar_senha', usado_em: null, dura: 1 })

  // Ciclo seguinte, mesmo depois de 30 min: nada de segundo teste.
  b.exec("UPDATE whatsapp_modelos SET conferido_em = datetime('now', '-31 minutes') WHERE nome = 'acesso_liberado'")
  await acompanharAcessoLiberado(env, { db: new D1Local(b), fetchImpl: f, logger: mudo })
  assert.equal(chamadas.mensagens.length, 1)
  assert.equal(chamadas.emails.length, 1)
  assert.match(b.prepare("SELECT status FROM whatsapp_modelos WHERE nome = 'acesso_liberado_teste'").get().status, /^ENVIADO wamid\.teste/)
})

test('sem chave da Meta não faz nada', async () => {
  const b = montar()
  const { f, chamadas } = metaFalsa('APPROVED')
  assert.equal(await acompanharAcessoLiberado({ ...env, WA_TOKEN: '' }, { db: new D1Local(b), fetchImpl: f, logger: mudo }), null)
  assert.equal(chamadas.modelos, 0)
})
