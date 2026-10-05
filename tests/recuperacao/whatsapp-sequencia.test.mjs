import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'
import {
  ajustarHorario,
  baseDaSeguinte,
  diasDeEmail,
  escolherModelo,
  paradaPelaEntrega,
} from '../../lib/whatsapp-sequencia.js'
import { atenderWebhook, executarWhatsapp } from '../../workers/recuperacao-carrinho/whatsapp.js'
import { consultarSequencias, mudarSequencia, validarAcaoSequencia } from '../../lib/gestao/whatsapp.js'

// Sequência do WhatsApp (plano A): 1ª 3 h depois do carrinho, depois 1 por
// semana até 9. Nada aqui chama a Meta de verdade: metaFalsa responde como
// ela (modelos aprovados ou não, envio aceito ou recusado) e os avisos de
// entregue/lido/falhou entram pelo webhook assinado, como em produção.

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

const MIGRACOES = [
  '0000_esquema_atual',
  '0004_carrinhos',
  '0005_recuperacao_v2',
  '0006_whatsapp',
  '0007_whatsapp_semanal',
  '0008_whatsapp_meta',
  '0009_whatsapp_estado',
  '0010_whatsapp_sequencia',
]

function banco(ate = MIGRACOES.length) {
  const b = new DatabaseSync(':memory:')
  for (const arquivo of MIGRACOES.slice(0, ate)) b.exec(readFileSync(`migrations/${arquivo}.sql`, 'utf8'))
  if (ate >= 8) b.exec(`UPDATE whatsapp_estado SET estado = 'ativo', ligado_em = datetime('now', '-30 days')`)
  return b
}

const mudo = { log() {}, error() {} }

// Relógio dos testes: 15/01/2026 15:00 UTC = 12h em Brasília.
const T0 = '2026-01-15 15:00:00'
const em = (sql) => new Date(sql.replace(' ', 'T') + 'Z')

function ambiente(db, extras = {}) {
  return {
    DB: db,
    WA_MODO: 'ativo',
    WA_TESTE_PARA: '27999990000',
    WA_TETO_DIA: '30',
    WA_PHONE_NUMBER_ID: '123456',
    WA_GRAPH_VERSION: 'v23.0',
    WA_TEMPLATE: 'carrinho_lembrete',
    WA_TOKEN: 'token-teste',
    WA_APP_SECRET: 'segredo-do-app',
    WA_WABA_ID: '999',
    WA_LINK_SEGREDO: 'segredo-dos-links',
    WA_LINK_BASE: 'https://robo.example',
    WA_ENCAMINHAR_PARA: 'suporte@example.com',
    RESEND_API_KEY: 'resend-teste',
    EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>',
    ...extras,
  }
}

// A Meta de mentira: modelos com o status pedido; envio aceito, ou recusado
// com o código pedido (erros: lista consumida um por envio).
function metaFalsa({ modelos = { carrinho_lembrete: 'APPROVED', carrinho_preco: 'APPROVED', carrinho_acervo: 'APPROVED' }, erros = [] } = {}) {
  const pedidos = []
  let numero = 0
  const fila = [...erros]
  const fetchImpl = async (url, opcoes = {}) => {
    const corpo = opcoes.body ? JSON.parse(opcoes.body) : null
    pedidos.push({ url: String(url), corpo })
    if (String(url).includes('/message_templates')) {
      const data = Object.entries(modelos).map(([name, status]) => ({
        name,
        status,
        language: 'pt_BR',
        components: [
          { type: 'BODY', text: 'Oi {{1}}' },
          { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Finalizar compra' }, { type: 'QUICK_REPLY', text: 'Não quero receber' }] },
        ],
      }))
      return new Response(JSON.stringify({ data }), { status: 200 })
    }
    if (String(url).endsWith('/messages')) {
      const erro = fila.shift()
      if (erro) return new Response(JSON.stringify({ error: { code: erro, message: 'falhou' } }), { status: 400 })
      numero += 1
      return new Response(JSON.stringify({ messages: [{ id: `wamid.${numero}` }] }), { status: 200 })
    }
    return new Response('{"id":"email"}', { status: 200 })
  }
  return {
    fetchImpl,
    envios: () => pedidos.filter((p) => p.url.endsWith('/messages')),
    consultas: () => pedidos.filter((p) => p.url.includes('/message_templates')),
  }
}

const rodada = (b, meta, agora, extras = {}) =>
  executarWhatsapp(ambiente(new D1Local(b), extras), { agora: em(agora), logger: mudo, fetchImpl: meta.fetchImpl })

// Pessoa que já recebeu a 1ª em `inicio`.
function emSequencia(b, id, { telefone = '27911110000', email = `${id}@example.com`, inicio = '2026-01-08 15:00:00', etapa = 1, proximo, mensagens } = {}) {
  b.prepare(`
    INSERT INTO carrinhos (id, email, nome, telefone, criado_em, status, whatsapp_enviado_em, whatsapp_etapa, proximo_whatsapp_em)
    VALUES (?, ?, 'Maria Clara', ?, datetime(?, '-4 hours'), 'aberto', ?, ?, ?)`).run(
    id, email, telefone, inicio, inicio, etapa, proximo || T0
  )
  const lista = mensagens || Array.from({ length: etapa }, (_, i) => ({ status: 'read' }))
  lista.forEach((m, i) => {
    b.prepare(`
      INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em, modelo, wa_msg_id, wa_status)
      VALUES (?, 'whatsapp', ?, datetime(?, ?), 'carrinho_lembrete', ?, ?)`).run(
      id, i + 1, inicio, `+${7 * i} days`, `wamid.antigo.${id}.${i + 1}`, m.status
    )
  })
}

const estadoDe = (b, id) => ({
  ...b.prepare(`SELECT whatsapp_etapa AS etapa, proximo_whatsapp_em AS proximo, whatsapp_encerrado_em IS NOT NULL AS encerrado, whatsapp_motivo AS motivo FROM carrinhos WHERE id = ?`).get(id),
})

function assinado(corpo) {
  const texto = JSON.stringify(corpo)
  return new Request('https://robo.example/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=' + createHmac('sha256', 'segredo-do-app').update(texto).digest('hex') },
    body: texto,
  })
}

function aviso({ mensagens = [], status = [], waId = '5527911110000' } = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'waba', changes: [{ field: 'messages', value: {
      messaging_product: 'whatsapp',
      metadata: { phone_number_id: '123456' },
      contacts: [{ wa_id: waId, profile: { name: 'Maria' } }],
      messages: mensagens,
      statuses: status,
    } }] }],
  }
}

// ------------------------------------------------------------- regras ----

test('horário: só das 9h às 19h59 de Brasília; fora disso espera o próximo horário', () => {
  const brt = (d) => new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 16).replace('T', ' ')
  assert.equal(brt(ajustarHorario(em('2026-01-15 15:00:00'))), '2026-01-15 12:00') // 12h fica
  assert.equal(brt(ajustarHorario(em('2026-01-15 10:00:00'))), '2026-01-15 09:00') // 7h → 9h
  assert.equal(brt(ajustarHorario(em('2026-01-15 22:59:00'))), '2026-01-15 19:59') // 19h59 fica
  assert.equal(brt(ajustarHorario(em('2026-01-15 23:00:00'))), '2026-01-16 09:00') // 20h → amanhã 9h
  assert.equal(brt(ajustarHorario(em('2026-01-16 01:00:00'))), '2026-01-16 09:00') // 22h → 9h
})

test('dia de e-mail: empurra para as 9h do dia seguinte (e de novo, se também tiver e-mail)', () => {
  const brt = (d) => new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 16).replace('T', ' ')
  // Exemplo real (Guilherme): 1ª em 04/10 15:00; e-mail 2º em 11/10 08:00 → WhatsApp 2º em 12/10 09:00.
  const base = baseDaSeguinte(em('2026-10-04 18:00:19'), 1, em('2026-10-04 18:00:19'))
  assert.equal(brt(base), '2026-10-11 15:00')
  assert.equal(brt(ajustarHorario(base, diasDeEmail(['2026-10-11 11:00:16']))), '2026-10-12 09:00')
  assert.equal(brt(ajustarHorario(base, diasDeEmail(['2026-10-11 11:00:16', '2026-10-12 20:00:00']))), '2026-10-13 09:00')
  // E-mail às 22h de Brasília cai no dia de Brasília, não no UTC.
  assert.deepEqual(diasDeEmail(['2026-10-12 01:00:00']), ['2026-10-11'])
})

test('rodízio: 1ª lembrete; depois preço → acervo → lembrete; pula modelo não aprovado', () => {
  const todos = new Set(['carrinho_lembrete', 'carrinho_preco', 'carrinho_acervo'])
  assert.deepEqual(
    Array.from({ length: 9 }, (_, i) => escolherModelo(i + 1, todos)),
    ['carrinho_lembrete', 'carrinho_preco', 'carrinho_acervo', 'carrinho_lembrete', 'carrinho_preco',
      'carrinho_acervo', 'carrinho_lembrete', 'carrinho_preco', 'carrinho_acervo']
  )
  const semPreco = new Set(['carrinho_lembrete', 'carrinho_acervo'])
  assert.equal(escolherModelo(2, semPreco), 'carrinho_acervo')
  assert.equal(escolherModelo(5, semPreco), 'carrinho_acervo')
  assert.equal(escolherModelo(2, new Set(['carrinho_lembrete'])), 'carrinho_lembrete')
  assert.equal(escolherModelo(3, new Set()), 'carrinho_lembrete')
})

test('parada pela entrega: 2 últimas não entregues; 3 últimas entregues e não lidas; com 24 h de carência', () => {
  const agora = em('2026-02-01 12:00:00')
  const msg = (numero, status, enviado = '2026-01-20 12:00:00') => ({ numero, status, enviado_em: em(enviado) })
  assert.equal(paradaPelaEntrega([msg(1, 'failed'), msg(2, 'failed')], agora), 'nao_entregue')
  assert.equal(paradaPelaEntrega([msg(1, 'read'), msg(2, 'sent'), msg(3, 'failed')], agora), 'nao_entregue')
  assert.equal(paradaPelaEntrega([msg(1, 'failed'), msg(2, 'delivered')], agora), null)
  assert.equal(paradaPelaEntrega([msg(1, 'failed')], agora), null)
  assert.equal(paradaPelaEntrega([msg(1, 'delivered'), msg(2, 'delivered'), msg(3, 'delivered')], agora), 'nao_le')
  assert.equal(paradaPelaEntrega([msg(1, 'read'), msg(2, 'delivered'), msg(3, 'delivered')], agora), null)
  // Enviada há 2 h, ainda sem aviso: não conta como não entregue.
  assert.equal(paradaPelaEntrega([msg(1, 'failed'), msg(2, 'sent', '2026-02-01 10:00:00')], agora), null)
})

// -------------------------------------------------------------- robô ----

test('sequência completa: 1ª 3 h depois, 1 por semana, 9 no máximo, rodízio de modelos e utm por semana', async () => {
  const b = banco()
  b.prepare(`INSERT INTO carrinhos (id, email, nome, telefone, criado_em) VALUES ('c', 'maria@example.com', 'Maria Clara', '27911110000', '2026-01-15 11:00:00')`).run()
  const meta = metaFalsa()
  // 2 h depois do carrinho: ainda não.
  await rodada(b, meta, '2026-01-15 13:00:00')
  assert.equal(meta.envios().length, 0)

  let agora = T0
  const enviados = []
  for (let semana = 0; semana < 12; semana += 1) {
    await rodada(b, meta, agora)
    b.exec(`UPDATE lembretes_enviados SET wa_status = 'read' WHERE canal = 'whatsapp'`)
    const e = estadoDe(b, 'c')
    if (!e.proximo) break
    agora = e.proximo
  }
  for (const p of meta.envios()) enviados.push([p.corpo.template.name, p.corpo.template.components[1].parameters[0].text.split('utm_content=')[1]])
  assert.equal(enviados.length, 9)
  assert.deepEqual(enviados.map(([n]) => n), [
    'carrinho_lembrete', 'carrinho_preco', 'carrinho_acervo', 'carrinho_lembrete', 'carrinho_preco',
    'carrinho_acervo', 'carrinho_lembrete', 'carrinho_preco', 'carrinho_acervo',
  ])
  assert.deepEqual(enviados.map(([, c]) => c), Array.from({ length: 9 }, (_, i) => `semana${i}`))
  const datas = b.prepare(`SELECT etapa, enviado_em FROM lembretes_enviados WHERE canal = 'whatsapp' ORDER BY etapa`).all()
  assert.deepEqual(datas.map((l) => l.enviado_em), Array.from({ length: 9 }, (_, i) => {
    const d = new Date(em(T0).getTime() + i * 7 * 86400000)
    return d.toISOString().slice(0, 19).replace('T', ' ')
  }))
  assert.equal(datas[8].enviado_em, '2026-03-12 15:00:00', 'a 9ª sai 8 semanas depois da 1ª')
  assert.deepEqual(estadoDe(b, 'c'), { etapa: 9, proximo: null, encerrado: 1, motivo: 'fim' })
  // Depois da 9ª, nada mais.
  await rodada(b, meta, '2026-04-20 15:00:00')
  assert.equal(meta.envios().length, 9)
})

test('carrinho às 22h: a 1ª espera as 9h do dia seguinte', async () => {
  const b = banco()
  // 22h de 14/01 em Brasília = 01:00 UTC de 15/01.
  b.prepare(`INSERT INTO carrinhos (id, email, telefone, criado_em) VALUES ('noite', 'n@example.com', '27911110000', '2026-01-15 01:00:00')`).run()
  const meta = metaFalsa()
  await rodada(b, meta, '2026-01-15 04:10:00') // 01h10 em Brasília
  await rodada(b, meta, '2026-01-15 11:50:00') // 08h50
  assert.equal(meta.envios().length, 0)
  await rodada(b, meta, '2026-01-15 12:00:00') // 09h00
  assert.equal(meta.envios().length, 1)
})

test('parada por compra: compra com o mesmo telefone (outro e-mail) ou o mesmo e-mail para na hora', async () => {
  const b = banco()
  emSequencia(b, 'pelo-tel', { telefone: '27911110000', proximo: '2026-02-01 15:00:00' })
  emSequencia(b, 'pelo-email', { telefone: '27922220000', email: 'cliente@example.com', proximo: '2026-02-01 15:00:00' })
  b.exec(`
    INSERT INTO carrinhos (id, email, telefone, criado_em, status, pago_em) VALUES ('pago', 'outro@example.com', '27911110000', '2026-01-15 10:00:00', 'pago', '2026-01-15 10:30:00');
    INSERT INTO clientes (email) VALUES ('cliente@example.com');
    INSERT INTO compras (cliente_id, stripe_session_id, status) SELECT id, 'mp_1', 'pago' FROM clientes;
  `)
  const meta = metaFalsa()
  // A próxima nem venceu: a varredura da rodada já encerra.
  await rodada(b, meta, T0)
  assert.equal(meta.envios().length, 0)
  assert.equal(estadoDe(b, 'pelo-tel').motivo, 'comprou')
  assert.equal(estadoDe(b, 'pelo-email').motivo, 'comprou')
})

test('parada por descadastro: "Não quero receber" no WhatsApp para na hora; descadastro por e-mail também', async () => {
  const b = banco()
  emSequencia(b, 'botao', { telefone: '27911110000', email: 'maria@example.com' })
  emSequencia(b, 'por-email', { telefone: '27922220000', email: 'saiu@example.com' })
  const env = ambiente(new D1Local(b))
  const meta = metaFalsa()
  const botao = { from: '5527911110000', id: 'wamid.in1', type: 'button', button: { text: 'Não quero receber', payload: 'Não quero receber' } }
  await atenderWebhook(assinado(aviso({ mensagens: [botao] })), env, { fetchImpl: meta.fetchImpl, logger: mudo })
  assert.equal(estadoDe(b, 'botao').motivo, 'descadastro')
  b.exec(`INSERT INTO descadastros (email, canal) VALUES ('saiu@example.com', 'email')`)
  const antes = meta.envios().length // a confirmação "Pronto, você não vai mais receber"
  await rodada(b, meta, T0)
  assert.equal(meta.envios().length, antes, 'nenhum lembrete')
  assert.equal(estadoDe(b, 'por-email').motivo, 'descadastro')
})

test('parada por não entregue: as 2 últimas falharam → encerra sem enviar', async () => {
  const b = banco()
  emSequencia(b, 'c', { etapa: 2, mensagens: [{ status: 'failed' }, { status: 'failed' }] })
  const meta = metaFalsa()
  await rodada(b, meta, T0)
  assert.equal(meta.envios().length, 0)
  assert.equal(estadoDe(b, 'c').motivo, 'nao_entregue')
})

test('parada por não ler: as 3 últimas entregues e não lidas → encerra sem enviar', async () => {
  const b = banco()
  emSequencia(b, 'c', { etapa: 3, inicio: '2025-12-25 15:00:00', mensagens: [{ status: 'delivered' }, { status: 'delivered' }, { status: 'delivered' }] })
  const meta = metaFalsa()
  await rodada(b, meta, T0)
  assert.equal(meta.envios().length, 0)
  assert.equal(estadoDe(b, 'c').motivo, 'nao_le')
})

test('parada por resposta: qualquer resposta pausa na hora; avisos de entregue/lido/falhou atualizam a mensagem', async () => {
  const b = banco()
  emSequencia(b, 'c', { etapa: 1, mensagens: [{ status: 'sent' }] })
  const env = ambiente(new D1Local(b))
  const meta = metaFalsa()
  const status = (s, timestamp) => atenderWebhook(assinado(aviso({ status: [{ id: 'wamid.antigo.c.1', status: s, timestamp }] })), env, { logger: mudo })
  await status('delivered', String(Date.UTC(2026, 0, 8, 15, 1) / 1000))
  await status('read', String(Date.UTC(2026, 0, 8, 15, 2) / 1000))
  await status('failed')
  assert.deepEqual({ ...b.prepare(`SELECT wa_status, wa_status_em FROM lembretes_enviados`).get() }, { wa_status: 'read', wa_status_em: '2026-01-08 15:02:00' })

  const pergunta = { from: '5527911110000', id: 'wamid.in2', type: 'text', text: { body: 'Quanto custa no cartão?' } }
  await atenderWebhook(assinado(aviso({ mensagens: [pergunta] })), env, { fetchImpl: meta.fetchImpl, logger: mudo })
  assert.equal(estadoDe(b, 'c').motivo, 'respondeu')
  await rodada(b, meta, T0)
  assert.equal(meta.envios().length, 0, 'conversa humana: o robô não insiste')
})

test('nunca no mesmo dia de um e-mail: previsto ou já enviado hoje → amanhã às 9h', async () => {
  const b = banco()
  emSequencia(b, 'previsto', { telefone: '27911110000', email: 'p@example.com' })
  emSequencia(b, 'enviado', { telefone: '27922220000', email: 'e@example.com' })
  // 'previsto': o 2º e-mail sai hoje às 20h de Brasília (23:00 UTC).
  b.exec(`
    UPDATE carrinhos SET status = 'lembrado', etapa_email = 1, proximo_email_em = '2026-01-15 23:00:00' WHERE id = 'previsto';
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em) VALUES ('enviado', 'email', 2, '2026-01-15 11:00:00');
  `)
  const meta = metaFalsa()
  await rodada(b, meta, T0)
  assert.equal(meta.envios().length, 0)
  assert.equal(estadoDe(b, 'previsto').proximo, '2026-01-16 12:00:00')
  assert.equal(estadoDe(b, 'enviado').proximo, '2026-01-16 12:00:00')
  await rodada(b, meta, '2026-01-16 12:00:00')
  assert.equal(meta.envios().length, 2)
})

test('rodízio na prática: preço em análise → a 2ª vai com o acervo; modelos consultados no máx. a cada 30 min', async () => {
  const b = banco()
  emSequencia(b, 'a', { telefone: '27911110000' })
  emSequencia(b, 'b', { telefone: '27922220000' })
  const meta = metaFalsa({ modelos: { carrinho_lembrete: 'APPROVED', carrinho_preco: 'PENDING', carrinho_acervo: 'APPROVED' } })
  await rodada(b, meta, T0)
  assert.deepEqual(meta.envios().map((p) => p.corpo.template.name), ['carrinho_acervo', 'carrinho_acervo'])
  assert.equal(meta.envios()[0].corpo.template.components[1].index, '0')
  assert.equal(meta.consultas().length, 1)
  emSequencia(b, 'c', { telefone: '27933330000' })
  await rodada(b, meta, T0)
  assert.equal(meta.consultas().length, 1, 'não consulta de novo em 30 min')
  const soLembrete = metaFalsa({ modelos: { carrinho_lembrete: 'APPROVED', carrinho_preco: 'REJECTED' } })
  const b2 = banco()
  emSequencia(b2, 'x')
  await rodada(b2, soLembrete, T0)
  assert.deepEqual(soLembrete.envios().map((p) => p.corpo.template.name), ['carrinho_lembrete'])
})

test('carrinho de mais de 48 h não entra na sequência ao ligar (nada de enxurrada)', async () => {
  const b = banco()
  b.exec(`
    INSERT INTO carrinhos (id, email, telefone, criado_em) VALUES
      ('velho', 'v@example.com', '27911110000', '2026-01-13 14:00:00'),
      ('novo', 'n@example.com', '27922220000', '2026-01-15 10:00:00');
  `)
  const meta = metaFalsa()
  await rodada(b, meta, T0)
  assert.deepEqual(meta.envios().map((p) => p.corpo.to), ['5527922220000'])
})

test('teto do dia conta toda a sequência; quem sobrou sai primeiro no dia seguinte', async () => {
  const b = banco()
  emSequencia(b, 's1', { telefone: '27911110001', proximo: '2026-01-15 12:00:00' })
  emSequencia(b, 's2', { telefone: '27911110002', proximo: '2026-01-15 13:00:00' })
  b.exec(`INSERT INTO carrinhos (id, email, telefone, criado_em) VALUES ('p1', 'p1@example.com', '27911110003', '2026-01-15 08:30:00')`)
  // p1 venceu às 11:30 (3 h): fila = s1 (12:00)... não, p1 (11:30), s1 (12:00), s2 (13:00).
  const meta = metaFalsa()
  await rodada(b, meta, T0, { WA_TETO_DIA: '2' })
  assert.deepEqual(meta.envios().map((p) => p.corpo.to), ['5527911110003', '5527911110001'])
  b.exec(`INSERT INTO carrinhos (id, email, telefone, criado_em) VALUES ('p2', 'p2@example.com', '27911110004', '2026-01-16 08:00:00')`)
  await rodada(b, meta, '2026-01-16 12:00:00', { WA_TETO_DIA: '2' })
  assert.deepEqual(meta.envios().slice(2).map((p) => p.corpo.to), ['5527911110002', '5527911110004'], 's2 (de ontem) antes do carrinho novo')
})

test('mesmo telefone em vários carrinhos = uma sequência; nova só 60 dias depois de encerrada', async () => {
  const b = banco()
  b.exec(`
    INSERT INTO carrinhos (id, email, telefone, criado_em) VALUES
      ('a', 'a@example.com', '27911110000', '2026-01-15 10:00:00'),
      ('b', 'b@example.com', '27911110000', '2026-01-15 11:00:00');
  `)
  const meta = metaFalsa()
  await rodada(b, meta, T0)
  assert.equal(meta.envios().length, 1)
  assert.equal(b.prepare(`SELECT COUNT(*) AS n FROM carrinhos WHERE whatsapp_enviado_em IS NOT NULL`).get().n, 1)

  // Sequência encerrada há 30 dias: carrinho novo do mesmo telefone não recomeça.
  const c = banco()
  emSequencia(c, 'antiga', { telefone: '27911110000', inicio: '2025-11-01 15:00:00' })
  c.exec(`UPDATE carrinhos SET whatsapp_encerrado_em = '2025-12-16 15:00:00', whatsapp_motivo = 'nao_le', proximo_whatsapp_em = NULL`)
  c.exec(`INSERT INTO carrinhos (id, email, telefone, criado_em) VALUES ('nova', 'nova@example.com', '27911110000', '2026-01-15 10:00:00')`)
  await rodada(c, meta, T0)
  assert.equal(meta.envios().length, 1)
  // Encerrada há 61 dias: recomeça do 1.
  c.exec(`UPDATE carrinhos SET whatsapp_encerrado_em = '2025-11-15 14:00:00' WHERE id = 'antiga'`)
  c.exec(`UPDATE carrinhos SET whatsapp_falhou_em = NULL WHERE id = 'nova'`)
  await rodada(c, meta, T0)
  assert.equal(meta.envios().length, 2)
  assert.equal(estadoDe(c, 'nova').etapa, 1)
})

test('erro da conta (cartão) não prejudica a pessoa: fica para amanhã e a rodada para; erro do número conta como não entregue', async () => {
  const b = banco()
  emSequencia(b, 'a', { telefone: '27911110001' })
  emSequencia(b, 'b', { telefone: '27911110002' })
  const cartao = metaFalsa({ erros: [131042] })
  await rodada(b, cartao, T0)
  assert.equal(cartao.envios().length, 1, 'parou na 1ª falha da conta')
  assert.deepEqual(estadoDe(b, 'a'), { etapa: 1, proximo: '2026-01-16 15:00:00', encerrado: 0, motivo: null })
  assert.equal(b.prepare(`SELECT COUNT(*) AS n FROM lembretes_enviados WHERE carrinho_id = 'a'`).get().n, 1)

  const numero = metaFalsa({ erros: [131026] })
  await rodada(b, numero, T0)
  const falha = b.prepare(`SELECT etapa, wa_status, wa_erro FROM lembretes_enviados WHERE carrinho_id = 'b' AND etapa = 2`).get()
  assert.deepEqual({ ...falha }, { etapa: 2, wa_status: 'failed', wa_erro: '131026' })
  assert.equal(estadoDe(b, 'b').etapa, 2)
})

test('migração 0010: quem já recebeu a 1ª vira "1 de 9", com id e status, e a 2ª uma semana depois', () => {
  const b = banco(7) // até a 0009
  b.exec(`
    INSERT INTO carrinhos (id, email, nome, telefone, criado_em, status, whatsapp_enviado_em, whatsapp_msg_id, whatsapp_status)
      VALUES ('g', 'g@example.com', 'Guilherme', '61911115908', '2026-10-04 09:51:02', 'lembrado', '2026-10-04 18:00:19', 'wamid.g', 'read');
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em) VALUES
      ('g', 'email', 1, '2026-10-04 11:00:16'), ('g', 'whatsapp', 1, '2026-10-04 18:00:19');
  `)
  b.exec(readFileSync('migrations/0010_whatsapp_sequencia.sql', 'utf8'))
  assert.deepEqual(estadoDe(b, 'g'), { etapa: 1, proximo: '2026-10-11 18:00:19', encerrado: 0, motivo: null })
  const l = b.prepare(`SELECT etapa, modelo, wa_msg_id, wa_status FROM lembretes_enviados WHERE canal = 'whatsapp'`).get()
  assert.deepEqual({ ...l }, { etapa: 1, modelo: 'carrinho_lembrete', wa_msg_id: 'wamid.g', wa_status: 'read' })
  assert.equal(b.prepare(`SELECT COUNT(*) AS n FROM lembretes_enviados WHERE canal = 'email'`).get().n, 1)
})

// ------------------------------------------------------------- gestão ----

test('gestão: lista de sequências com "X de 9", próxima e motivo; parar e retomar só quando faz sentido', async () => {
  const b = banco()
  emSequencia(b, 'rodando', { telefone: '27911110000', proximo: '2026-01-22 15:00:00' })
  emSequencia(b, 'respondeu', { telefone: '27922220000', etapa: 2, inicio: '2026-01-01 15:00:00' })
  b.exec(`UPDATE carrinhos SET whatsapp_encerrado_em = '2026-01-09 10:00:00', whatsapp_motivo = 'respondeu', proximo_whatsapp_em = NULL WHERE id = 'respondeu'`)
  const db = new D1Local(b)
  const agora = em(T0)
  let lista = await consultarSequencias(db, agora)
  assert.deepEqual(lista.map((s) => [s.telefone, s.enviadas, s.total, s.proximo_numero, s.proximo_em, s.motivo, s.pode_parar, s.pode_retomar]), [
    ['27911110000', 1, 9, 2, '2026-01-22T15:00:00Z', null, true, false],
    ['27922220000', 2, 9, null, null, 'respondeu', false, true],
  ])

  assert.equal(validarAcaoSequencia({ telefone: '27911110000', acao: 'apagar' }).ok, false)
  assert.equal(validarAcaoSequencia({ telefone: '123', acao: 'parar' }).ok, false)

  assert.equal((await mudarSequencia(db, { telefone: '27911110000', acao: 'parar' }, agora)).ok, true)
  assert.equal(estadoDe(b, 'rodando').motivo, 'gestao')
  assert.equal((await mudarSequencia(db, { telefone: '27911110000', acao: 'parar' }, agora)).status, 409)
  assert.equal((await mudarSequencia(db, { telefone: '27911110000', acao: 'retomar' }, agora)).status, 409, 'parada pela gestão não retoma')

  // Retomar: a 3ª vai para a semana dela (01/01 + 14 dias), ou agora se já passou.
  assert.equal((await mudarSequencia(db, { telefone: '27922220000', acao: 'retomar' }, agora)).ok, true)
  assert.deepEqual(estadoDe(b, 'respondeu'), { etapa: 2, proximo: '2026-01-15 15:00:00', encerrado: 0, motivo: null })
  const meta = metaFalsa()
  await rodada(b, meta, T0)
  assert.deepEqual(meta.envios().map((p) => p.corpo.to), ['5527922220000'])
  lista = await consultarSequencias(db, agora)
  assert.equal(lista.find((s) => s.telefone === '27922220000').enviadas, 3)
})
