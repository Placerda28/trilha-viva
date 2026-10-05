import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'
import {
  assinaturaValida,
  pedidoDeSaida,
  pedidoModelo,
  primeiroNome,
  telefoneSemPais,
} from '../../lib/whatsapp-meta.js'
import {
  atenderWebhook,
  dentroDoHorario,
  executarWhatsapp,
} from '../../workers/recuperacao-carrinho/whatsapp.js'
import { executarRodada } from '../../workers/recuperacao-carrinho/index.js'
import {
  acaoDeEstadoValida,
  consultarConversas,
  lerEstadoWhatsapp,
  mudarEstadoWhatsapp,
  responderConversa,
  totaisWhatsapp,
  validarResposta,
} from '../../lib/gestao/whatsapp.js'

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

function banco() {
  const b = new DatabaseSync(':memory:')
  for (const arquivo of [
    '0000_esquema_atual',
    '0004_carrinhos',
    '0005_recuperacao_v2',
    '0006_whatsapp',
    '0007_whatsapp_semanal',
    '0008_whatsapp_meta',
    '0009_whatsapp_estado',
    '0010_whatsapp_sequencia',
  ]) {
    b.exec(readFileSync(`migrations/${arquivo}.sql`, 'utf8'))
  }
  // Os testes de envio partem do WhatsApp já ligado há tempo (sem o freio dos
  // 3 primeiros dias). Os testes do fluxo de ligação mudam o estado.
  b.exec(`UPDATE whatsapp_estado SET estado = 'ativo', ligado_em = datetime('now', '-30 days')`)
  return b
}

const AGORA_SQL = '2026-01-15 15:00:00' // meioDoDia, no formato do banco

function carrinho(b, id, email, telefone, idade = '-4 hours', extras = {}) {
  b.prepare(`
    INSERT INTO carrinhos (id, email, nome, telefone, criado_em, status, whatsapp_enviado_em)
    VALUES (?, ?, ?, ?, datetime(?, ?), ?, ?)`).run(
    id,
    email,
    extras.nome ?? 'Maria Clara',
    telefone,
    AGORA_SQL,
    idade,
    extras.status || 'aberto',
    extras.whatsapp_enviado_em || null
  )
}

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
    WA_VERIFY_TOKEN: 'frase-de-verificacao',
    WA_ENCAMINHAR_PARA: 'suporte@example.com',
    RESEND_API_KEY: 'resend-teste',
    EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>',
    ...extras,
  }
}

const meioDoDia = new Date('2026-01-15T15:00:00Z') // 12h em Brasília
const mudo = { log() {}, error() {} }

// Finge a Meta e o Resend: guarda cada pedido e responde como eles.
function falsoServidor({ metaFalha = false } = {}) {
  const pedidos = []
  let numero = 0
  const fetchImpl = async (url, opcoes) => {
    const corpo = JSON.parse(opcoes.body)
    pedidos.push({ url, corpo, headers: opcoes.headers })
    if (String(url).includes('graph.facebook.com')) {
      if (metaFalha) {
        return new Response(JSON.stringify({ error: { code: 131026, message: 'Message undeliverable' } }), { status: 400 })
      }
      numero += 1
      return new Response(JSON.stringify({ messages: [{ id: `wamid.${numero}` }] }), { status: 200 })
    }
    return new Response('{"id":"email"}', { status: 200 })
  }
  return {
    fetchImpl,
    pedidos,
    meta: () => pedidos.filter((p) => String(p.url).includes('graph.facebook.com')),
    emails: () => pedidos.filter((p) => String(p.url).includes('resend.com')),
  }
}

// ------------------------------------------------------------ peças ----

test('telefone: tira o 55 só quando sobra DDD + número (DDD 55 preservado)', () => {
  assert.equal(telefoneSemPais('5527999998888'), '27999998888')
  assert.equal(telefoneSemPais('552733334444'), '2733334444')
  assert.equal(telefoneSemPais('55999887766'), '55999887766')
  assert.equal(telefoneSemPais('+55 (27) 99999-8888'), '27999998888')
})

test('pedido do modelo: número com 55, primeiro nome, botão só com o código do carrinho', () => {
  const corpo = pedidoModelo(
    { telefone: '27999998888', nome: 'Maria Clara Souza', carrinhoId: 'abc-123' },
    { WA_TEMPLATE: 'carrinho_lembrete' }
  )
  assert.deepEqual(corpo, {
    messaging_product: 'whatsapp',
    to: '5527999998888',
    type: 'template',
    template: {
      name: 'carrinho_lembrete',
      language: { code: 'pt_BR' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: 'Maria' }] },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            { type: 'text', text: 'r=abc-123&utm_source=whatsapp&utm_medium=lembrete&utm_campaign=carrinho' },
          ],
        },
      ],
    },
  })
  const semNome = pedidoModelo({ telefone: '27999998888', nome: '', carrinhoId: 'x' }, {})
  assert.equal(semNome.template.components[0].parameters[0].text, 'tudo bem')
  assert.equal(JSON.stringify(corpo).includes('@'), false)
  assert.equal(primeiroNome('Ana\tPaula'), 'Ana')
})

test('pedido de saída: SAIR, Sair!, PARAR e o botão contam; frase comum não', () => {
  for (const t of ['SAIR', ' Sair! ', 'PARAR', 'cancelar', 'Não quero receber']) assert.equal(pedidoDeSaida(t), true, t)
  for (const t of ['quero sair da dúvida', 'oi', 'comprar']) assert.equal(pedidoDeSaida(t), false, t)
})

test('assinatura do webhook: válida passa; falsa, ausente e sem segredo não', async () => {
  const corpo = '{"a":1}'
  const certa = 'sha256=' + createHmac('sha256', 'segredo').update(corpo).digest('hex')
  assert.equal(await assinaturaValida(corpo, certa, 'segredo'), true)
  assert.equal(await assinaturaValida(corpo + ' ', certa, 'segredo'), false)
  assert.equal(await assinaturaValida(corpo, 'sha256=00', 'segredo'), false)
  assert.equal(await assinaturaValida(corpo, '', 'segredo'), false)
  assert.equal(await assinaturaValida(corpo, certa, ''), false)
})

test('horário: só das 9h às 19h59 de Brasília', () => {
  assert.equal(dentroDoHorario(new Date('2026-01-15T11:59:00Z')), false) // 8h59
  assert.equal(dentroDoHorario(new Date('2026-01-15T12:00:00Z')), true) // 9h00
  assert.equal(dentroDoHorario(new Date('2026-01-15T22:59:00Z')), true) // 19h59
  assert.equal(dentroDoHorario(new Date('2026-01-15T23:00:00Z')), false) // 20h00
})

// ------------------------------------------------------------ envio ----

test('janela de 3 h a 48 h: envia uma vez, grava o id e o status', async () => {
  const b = banco()
  carrinho(b, 'cedo', 'cedo@example.com', '27911110000', '-2 hours')
  carrinho(b, 'certo', 'certo@example.com', '27922220000', '-4 hours')
  carrinho(b, 'velho', 'velho@example.com', '27933330000', '-49 hours')
  const s = falsoServidor()
  const r = await executarWhatsapp(ambiente(new D1Local(b)), { agora: meioDoDia, logger: mudo, fetchImpl: s.fetchImpl })
  assert.deepEqual(r, { enviados: 1, ignorados: 0, falhas: 0 })
  assert.equal(s.meta().length, 1)
  assert.equal(s.meta()[0].url, 'https://graph.facebook.com/v23.0/123456/messages')
  assert.equal(s.meta()[0].headers.Authorization, 'Bearer token-teste')
  assert.equal(s.meta()[0].corpo.to, '5527922220000')
  const linha = b.prepare(`
    SELECT l.etapa, l.modelo, l.wa_msg_id, l.wa_status, c.whatsapp_etapa, c.proximo_whatsapp_em
      FROM lembretes_enviados l JOIN carrinhos c ON c.id = l.carrinho_id
     WHERE l.canal = 'whatsapp' AND c.id = 'certo'`).get()
  assert.deepEqual({ ...linha }, {
    etapa: 1, modelo: 'carrinho_lembrete', wa_msg_id: 'wamid.1', wa_status: 'sent',
    whatsapp_etapa: 1, proximo_whatsapp_em: '2026-01-22 15:00:00',
  })
  assert.equal(
    s.meta()[0].corpo.template.components[1].parameters[0].text,
    'r=certo&utm_source=whatsapp&utm_medium=lembrete&utm_campaign=carrinho&utm_content=semana0'
  )

  const r2 = await executarWhatsapp(ambiente(new D1Local(b)), { agora: meioDoDia, logger: mudo, fetchImpl: s.fetchImpl })
  assert.equal(r2.enviados, 0)
  assert.equal(s.meta().length, 1)
})

test('fora do horário, sem configuração ou modo inválido não envia nem consulta', async () => {
  const b = banco()
  carrinho(b, 'c1', 'c1@example.com', '27911110000')
  const s = falsoServidor()
  const db = new D1Local(b)
  await executarWhatsapp(ambiente(db), { agora: new Date('2026-01-15T05:00:00Z'), logger: mudo, fetchImpl: s.fetchImpl })
  await executarWhatsapp(ambiente(db, { WA_PHONE_NUMBER_ID: '' }), { agora: meioDoDia, logger: mudo, fetchImpl: s.fetchImpl })
  await executarWhatsapp(ambiente(db, { WA_TOKEN: '' }), { agora: meioDoDia, logger: mudo, fetchImpl: s.fetchImpl })
  await executarWhatsapp(ambiente(db, { WA_MODO: 'desligado' }), { agora: meioDoDia, logger: mudo, fetchImpl: s.fetchImpl })
  assert.equal(s.pedidos.length, 0)
})

test('modo teste: só o celular de teste, mesmo com carrinhos reais mais antigos', async () => {
  const b = banco()
  for (let i = 0; i < 25; i += 1) carrinho(b, `real${i}`, `real${i}@example.com`, `2791111${String(i).padStart(4, '0')}`, '-10 hours')
  carrinho(b, 'teste', 'paulo@example.com', '27999990000', '-4 hours')
  const s = falsoServidor()
  const r = await executarWhatsapp(ambiente(new D1Local(b), { WA_MODO: 'teste' }), { agora: meioDoDia, logger: mudo, fetchImpl: s.fetchImpl })
  assert.equal(r.enviados, 1)
  assert.deepEqual(s.meta().map((p) => p.corpo.to), ['5527999990000'])
  const sem = falsoServidor()
  await executarWhatsapp(ambiente(new D1Local(banco()), { WA_MODO: 'teste', WA_TESTE_PARA: '' }), { agora: meioDoDia, logger: mudo, fetchImpl: sem.fetchImpl })
  assert.equal(sem.pedidos.length, 0)
})

test('uma por telefone para sempre; compra e descadastro bloqueiam; ignorado pelo e-mail recebe', async () => {
  const b = banco()
  carrinho(b, 'antigo', 'a@example.com', '27911110000', '-30 days', { whatsapp_enviado_em: '2026-01-01 10:00:00', status: 'lembrado' })
  carrinho(b, 'mesmo-tel', 'b@example.com', '27911110000')
  carrinho(b, 'comprou', 'comprou@example.com', '27922220000')
  carrinho(b, 'saiu', 'saiu@example.com', '27933330000')
  carrinho(b, 'email-falhou', 'ok@example.com', '27944440000', '-4 hours', { status: 'ignorado' })
  carrinho(b, 'pago', 'pago@example.com', '27955550000', '-4 hours', { status: 'pago' })
  b.exec(`
    INSERT INTO clientes (email) VALUES ('comprou@example.com');
    INSERT INTO compras (cliente_id, stripe_session_id, status) SELECT id, 'mp_1', 'pago' FROM clientes;
    INSERT INTO descadastros (email, canal) VALUES ('saiu@example.com', 'email');
  `)
  const s = falsoServidor()
  const r = await executarWhatsapp(ambiente(new D1Local(b)), { agora: meioDoDia, logger: mudo, fetchImpl: s.fetchImpl })
  assert.deepEqual(r, { enviados: 1, ignorados: 3, falhas: 0 })
  assert.deepEqual(s.meta().map((p) => p.corpo.to), ['5527944440000'])
  const bloqueados = b.prepare(`SELECT id FROM carrinhos WHERE whatsapp_falhou_em IS NOT NULL ORDER BY id`).all().map((l) => l.id)
  assert.deepEqual(bloqueados, ['comprou', 'mesmo-tel', 'saiu'])
})

test('erro da Meta: marca, loga o código e não tenta de novo', async () => {
  const b = banco()
  carrinho(b, 'c1', 'c1@example.com', '27911110000')
  const erros = []
  const s = falsoServidor({ metaFalha: true })
  const db = new D1Local(b)
  const r = await executarWhatsapp(ambiente(db), { agora: meioDoDia, logger: { log() {}, error: (...a) => erros.push(a.join(' ')) }, fetchImpl: s.fetchImpl })
  assert.deepEqual(r, { enviados: 0, ignorados: 0, falhas: 1 })
  assert.match(erros[0], /131026/)
  assert.doesNotMatch(erros[0], /27911110000/)
  const linha = b.prepare(`SELECT whatsapp_enviado_em, whatsapp_falhou_em IS NOT NULL AS falhou, whatsapp_status FROM carrinhos`).get()
  assert.deepEqual({ ...linha }, { whatsapp_enviado_em: null, falhou: 1, whatsapp_status: 'failed' })
  assert.equal(b.prepare(`SELECT COUNT(*) AS n FROM lembretes_enviados WHERE canal = 'whatsapp'`).get().n, 0)
  await executarWhatsapp(ambiente(db), { agora: meioDoDia, logger: mudo, fetchImpl: s.fetchImpl })
  assert.equal(s.meta().length, 1)
})

test('teto do dia', async () => {
  const b = banco()
  for (let i = 0; i < 5; i += 1) carrinho(b, `c${i}`, `c${i}@example.com`, `2791111000${i}`)
  const s = falsoServidor()
  const r = await executarWhatsapp(ambiente(new D1Local(b), { WA_TETO_DIA: '2' }), { agora: meioDoDia, logger: mudo, fetchImpl: s.fetchImpl })
  assert.equal(r.enviados, 2)
  assert.equal(s.meta().length, 2)
})

test('rodada: erro no e-mail não impede o WhatsApp', async () => {
  const b = banco()
  carrinho(b, 'c1', 'c1@example.com', '27911110000')
  const s = falsoServidor()
  // Sem RESEND_API_KEY / LEMBRETE_SEGREDO o e-mail recusa a rodada.
  const env = ambiente(new D1Local(b), { RESEND_API_KEY: '', LEMBRETE_SEGREDO: '' })
  await assert.rejects(executarRodada(env, { agora: meioDoDia, logger: mudo, fetchImpl: s.fetchImpl }))
  assert.equal(s.meta().length, 1)
})

// ---------------------------------------------------------- webhook ----

function assinado(corpo, segredo = 'segredo-do-app') {
  const texto = JSON.stringify(corpo)
  return new Request('https://robo.example/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=' + createHmac('sha256', segredo).update(texto).digest('hex') },
    body: texto,
  })
}

function aviso({ mensagens = [], status = [], nome = 'Maria', numeroId = '123456', waId = '5527911110000' } = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'waba',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '15550000000', phone_number_id: numeroId },
          contacts: [{ wa_id: waId, profile: { name: nome } }],
          messages: mensagens,
          statuses: status,
        },
      }],
    }],
  }
}

test('webhook GET: verificação da Meta com a frase certa; errada ou outro caminho = 404', async () => {
  const env = ambiente(new D1Local(banco()))
  const ok = await atenderWebhook(new Request('https://robo.example/whatsapp?hub.mode=subscribe&hub.verify_token=frase-de-verificacao&hub.challenge=987'), env)
  assert.equal(ok.status, 200)
  assert.equal(await ok.text(), '987')
  const errada = await atenderWebhook(new Request('https://robo.example/whatsapp?hub.mode=subscribe&hub.verify_token=outra&hub.challenge=987'), env)
  assert.equal(errada.status, 404)
  assert.equal((await atenderWebhook(new Request('https://robo.example/'), env)).status, 404)
  assert.equal((await atenderWebhook(new Request('https://robo.example/whatsapp'), ambiente(null, { WA_VERIFY_TOKEN: '' }))).status, 404)
})

test('webhook POST: assinatura falsa = 401 e nada gravado', async () => {
  const b = banco()
  const s = falsoServidor()
  const corpo = aviso({ mensagens: [{ from: '5527911110000', id: 'wamid.in1', type: 'text', text: { body: 'oi' } }] })
  const r = await atenderWebhook(assinado(corpo, 'segredo-errado'), ambiente(new D1Local(b)), { fetchImpl: s.fetchImpl, logger: mudo })
  assert.equal(r.status, 401)
  assert.equal(b.prepare('SELECT COUNT(*) AS n FROM whatsapp_mensagens').get().n, 0)
  assert.equal(s.pedidos.length, 0)
})

test('mensagem comum: grava, encaminha por e-mail uma vez só (aviso repetido não duplica)', async () => {
  const b = banco()
  carrinho(b, 'c1', 'maria@example.com', '27911110000')
  const s = falsoServidor()
  const env = ambiente(new D1Local(b))
  const corpo = aviso({ mensagens: [{ from: '5527911110000', id: 'wamid.in1', type: 'text', text: { body: 'Tem desconto? <b>' } }] })
  assert.equal((await atenderWebhook(assinado(corpo), env, { fetchImpl: s.fetchImpl, logger: mudo })).status, 200)
  assert.equal((await atenderWebhook(assinado(corpo), env, { fetchImpl: s.fetchImpl, logger: mudo })).status, 200)
  const linhas = b.prepare('SELECT telefone, nome_perfil, direcao, texto FROM whatsapp_mensagens').all().map((l) => ({ ...l }))
  assert.deepEqual(linhas, [{ telefone: '27911110000', nome_perfil: 'Maria', direcao: 'entrada', texto: 'Tem desconto? <b>' }])
  assert.equal(s.emails().length, 1)
  assert.equal(s.emails()[0].corpo.to[0], 'suporte@example.com')
  assert.equal(s.emails()[0].corpo.subject, 'WhatsApp de Maria (27911110000)')
  assert.equal(s.emails()[0].corpo.html.includes('<b>'), false)
  assert.equal(s.meta().length, 0)
})

test('aviso de outro número da Meta (ex.: botão "Teste" do painel) é ignorado', async () => {
  const b = banco()
  const s = falsoServidor()
  const corpo = aviso({ numeroId: '123456123', mensagens: [{ from: '5527911110000', id: 'wamid.x1', type: 'text', text: { body: 'oi' } }] })
  const r = await atenderWebhook(assinado(corpo), ambiente(new D1Local(b)), { fetchImpl: s.fetchImpl, logger: mudo })
  assert.equal(r.status, 200)
  assert.equal(b.prepare('SELECT COUNT(*) AS n FROM whatsapp_mensagens').get().n, 0)
  assert.equal(s.pedidos.length, 0)
})

test('número de fora do Brasil: só encaminha por e-mail com +DDI, sem gravar na gestão', async () => {
  const b = banco()
  const s = falsoServidor()
  const corpo = aviso({ waId: '16315551181', nome: 'Fulano', mensagens: [{ from: '16315551181', id: 'wamid.us1', type: 'text', text: { body: 'hello' } }] })
  const r = await atenderWebhook(assinado(corpo), ambiente(new D1Local(b)), { fetchImpl: s.fetchImpl, logger: mudo })
  assert.equal(r.status, 200)
  assert.equal(b.prepare('SELECT COUNT(*) AS n FROM whatsapp_mensagens').get().n, 0)
  assert.equal(s.meta().length, 0)
  assert.equal(s.emails().length, 1)
  assert.equal(s.emails()[0].corpo.subject, 'WhatsApp de Fulano (+16315551181)')
  assert.equal(s.emails()[0].corpo.text.includes('fora do Brasil'), true)
})

test('SAIR e o botão "Não quero receber": descadastram o e-mail do telefone e confirmam', async () => {
  for (const mensagem of [
    { from: '5527911110000', id: 'wamid.s1', type: 'text', text: { body: 'SAIR' } },
    { from: '5527911110000', id: 'wamid.s2', type: 'button', button: { text: 'Não quero receber', payload: 'Não quero receber' } },
  ]) {
    const b = banco()
    carrinho(b, 'c1', 'maria@example.com', '27911110000')
    const s = falsoServidor()
    const env = ambiente(new D1Local(b))
    await atenderWebhook(assinado(aviso({ mensagens: [mensagem] })), env, { fetchImpl: s.fetchImpl, logger: mudo })
    await atenderWebhook(assinado(aviso({ mensagens: [mensagem] })), env, { fetchImpl: s.fetchImpl, logger: mudo })
    assert.deepEqual({ ...b.prepare('SELECT email, canal FROM descadastros').get() }, { email: 'maria@example.com', canal: 'whatsapp' })
    assert.equal(s.meta().length, 1, 'uma confirmação só')
    assert.equal(s.meta()[0].corpo.text.body, 'Pronto, você não vai mais receber lembretes.')
    assert.equal(s.emails().length, 0)
  }
})

test('status: sent → delivered → read, sem regredir; failed só antes de entregar', async () => {
  const b = banco()
  carrinho(b, 'c1', 'maria@example.com', '27911110000')
  b.exec(`
    UPDATE carrinhos SET whatsapp_enviado_em = datetime('now'), whatsapp_etapa = 1;
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, wa_msg_id, wa_status) VALUES ('c1', 'whatsapp', 1, 'wamid.x', 'sent');
  `)
  const env = ambiente(new D1Local(b))
  const status = (s, timestamp) => atenderWebhook(assinado(aviso({ status: [{ id: 'wamid.x', status: s, timestamp }] })), env, { logger: mudo })
  const atual = () => b.prepare('SELECT wa_status AS s FROM lembretes_enviados').get().s
  await status('delivered')
  assert.equal(atual(), 'delivered')
  await status('read', '1768489320') // 2026-01-15 15:02:00 UTC
  assert.equal(atual(), 'read')
  assert.equal(b.prepare('SELECT wa_status_em AS em FROM lembretes_enviados').get().em, '2026-01-15 15:02:00')
  await status('delivered')
  assert.equal(atual(), 'read')
  await status('failed')
  assert.equal(atual(), 'read')
})

// ----------------------------------------------------------- gestão ----

test('gestão: conversas com janela de 24 h, totais e custo estimado', async () => {
  const b = banco()
  carrinho(b, 'c1', 'maria@example.com', '27911110000', '-4 hours', { nome: 'Maria Clara' })
  b.exec(`
    UPDATE carrinhos SET whatsapp_enviado_em = datetime('now', '-1 hour'), whatsapp_etapa = 1;
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em, wa_status) VALUES ('c1', 'whatsapp', 1, datetime('now', '-1 hour'), 'read');
    INSERT INTO whatsapp_mensagens (wa_msg_id, telefone, nome_perfil, direcao, texto, criado_em)
      VALUES ('a', '27911110000', 'Maria', 'entrada', 'oi', datetime('now', '-2 hours')),
             ('b', '27922220000', 'João', 'entrada', 'antiga', datetime('now', '-30 hours'));
  `)
  const db = new D1Local(b)
  const conversas = await consultarConversas(db)
  assert.deepEqual(conversas.map((c) => [c.telefone, c.janela_aberta, c.nome]), [
    ['27911110000', true, 'Maria Clara'],
    ['27922220000', false, 'João'],
  ])
  assert.equal(conversas[0].mensagens[0].texto, 'oi')
  const t = await totaisWhatsapp(db)
  assert.deepEqual(t, { enviados: 1, pessoas: 1, entregues: 1, lidos: 1, falharam: 0, recuperados: 0, custo_estimado_centavos: 32 })
})

test('gestão: responder só dentro da janela; fora dela recusa sem chamar a Meta', async () => {
  const b = banco()
  b.exec(`
    INSERT INTO whatsapp_mensagens (wa_msg_id, telefone, direcao, texto, criado_em)
      VALUES ('a', '27911110000', 'entrada', 'oi', datetime('now', '-2 hours')),
             ('b', '27922220000', 'entrada', 'oi', datetime('now', '-25 hours'));
  `)
  const db = new D1Local(b)
  const s = falsoServidor()
  const env = { WA_TOKEN: 't', WA_PHONE_NUMBER_ID: '123456' }
  const fechada = await responderConversa(db, env, { telefone: '27922220000', texto: 'olá', quem: 'p@example.com' }, s.fetchImpl)
  assert.equal(fechada.ok, false)
  assert.equal(fechada.status, 409)
  assert.equal(s.meta().length, 0)
  const aberta = await responderConversa(db, env, { telefone: '27911110000', texto: 'olá', quem: 'p@example.com' }, s.fetchImpl)
  assert.equal(aberta.ok, true)
  assert.equal(s.meta()[0].corpo.to, '5527911110000')
  assert.equal(s.meta()[0].corpo.text.body, 'olá')
  const saida = b.prepare(`SELECT direcao, texto, enviado_por FROM whatsapp_mensagens WHERE direcao = 'saida'`).get()
  assert.deepEqual({ ...saida }, { direcao: 'saida', texto: 'olá', enviado_por: 'p@example.com' })
  assert.equal(validarResposta({ telefone: '27911110000', texto: '  ' }).ok, false)
  assert.equal(validarResposta({ telefone: '123', texto: 'oi' }).ok, false)
  assert.equal(validarResposta({ telefone: '27911110000', texto: 'x'.repeat(1001) }).ok, false)
})

// ------------------------------------------------- ligar sem deploy ----

const comLink = { WA_WABA_ID: '999', WA_LINK_SEGREDO: 'segredo-dos-links', WA_LINK_BASE: 'https://robo.example' }

function aguardando(b) {
  b.exec(`UPDATE whatsapp_estado SET estado = 'aguardando_modelo', ligado_em = NULL`)
}

const estadoAtual = (b) => ({ ...b.prepare('SELECT * FROM whatsapp_estado WHERE id = 1').get() })

// Finge a Meta (modelo + envio) e o Resend.
function metaFalsa({ status = 'PENDING', motivo = '', erroEnvio = null } = {}) {
  const pedidos = []
  let numero = 0
  const fetchImpl = async (url, opcoes = {}) => {
    const corpo = opcoes.body ? JSON.parse(opcoes.body) : null
    pedidos.push({ url: String(url), corpo, metodo: opcoes.method || 'GET' })
    if (String(url).includes('/message_templates')) {
      return new Response(JSON.stringify({ data: [{ name: 'carrinho_lembrete', language: 'pt_BR', status, rejected_reason: motivo }] }), { status: 200 })
    }
    if (String(url).includes('graph.facebook.com')) {
      if (erroEnvio) return new Response(JSON.stringify({ error: { code: erroEnvio, message: 'falhou' } }), { status: 400 })
      numero += 1
      return new Response(JSON.stringify({ messages: [{ id: `wamid.t${numero}` }] }), { status: 200 })
    }
    return new Response('{"id":"email"}', { status: 200 })
  }
  return {
    fetchImpl,
    pedidos,
    consultas: () => pedidos.filter((p) => p.url.includes('/message_templates')),
    envios: () => pedidos.filter((p) => p.url.endsWith('/messages')),
    emails: () => pedidos.filter((p) => p.url.includes('resend.com')),
  }
}

const rodada = (b, m, extras = {}, agora = meioDoDia) =>
  executarWhatsapp(ambiente(new D1Local(b), { ...comLink, ...extras }), { agora, logger: mudo, fetchImpl: m.fetchImpl })

test('ligação: modelo em análise → consulta no máx. a cada 30 min e não manda nada a ninguém', async () => {
  const b = banco()
  aguardando(b)
  carrinho(b, 'cliente', 'cliente@example.com', '27911110000')
  const m = metaFalsa({ status: 'PENDING' })
  await rodada(b, m)
  await rodada(b, m)
  assert.equal(m.consultas().length, 1)
  assert.equal(m.consultas()[0].url, 'https://graph.facebook.com/v23.0/999/message_templates?name=carrinho_lembrete&fields=name,status,language,rejected_reason')
  assert.equal(m.envios().length, 0)
  assert.equal(m.emails().length, 0)
  assert.equal(estadoAtual(b).estado, 'aguardando_modelo')
  assert.equal(estadoAtual(b).modelo_status, 'PENDING')
  b.exec(`UPDATE whatsapp_estado SET modelo_conferido_em = datetime('now', '-31 minutes')`)
  await rodada(b, m)
  assert.equal(m.consultas().length, 2)
})

test('ligação: modelo recusado → e-mail com o motivo uma vez só e continua esperando', async () => {
  const b = banco()
  aguardando(b)
  const m = metaFalsa({ status: 'REJECTED', motivo: 'INCORRECT_CATEGORY' })
  await rodada(b, m)
  b.exec(`UPDATE whatsapp_estado SET modelo_conferido_em = datetime('now', '-31 minutes')`)
  await rodada(b, m)
  assert.equal(m.consultas().length, 2)
  assert.equal(m.emails().length, 1)
  assert.equal(m.emails()[0].corpo.to[0], 'suporte@example.com')
  assert.ok(m.emails()[0].corpo.text.startsWith('Modelo recusado: INCORRECT_CATEGORY'))
  assert.equal(m.envios().length, 0)
  assert.equal(estadoAtual(b).estado, 'aguardando_modelo')
})

test('ligação: aprovado → teste só para o Paulo, botão de teste sem dados pessoais, e-mail com LIGAR/PAUSAR', async () => {
  const b = banco()
  aguardando(b)
  carrinho(b, 'cliente', 'cliente@example.com', '27911110000')
  carrinho(b, 'do-paulo', 'paulo@example.com', '27999990000', '-1 hours')
  const m = metaFalsa({ status: 'APPROVED' })
  await rodada(b, m)
  assert.equal(m.envios().length, 1)
  const pedido = m.envios()[0].corpo
  assert.equal(pedido.to, '5527999990000')
  assert.equal(pedido.template.name, 'carrinho_lembrete')
  assert.equal(pedido.template.components[0].parameters[0].text, 'Paulo')
  assert.equal(pedido.template.components[1].parameters[0].text, 'r=do-paulo&utm_source=whatsapp&utm_medium=teste&utm_campaign=aprovacao')
  const e = estadoAtual(b)
  assert.equal(e.estado, 'teste_enviado')
  assert.equal(e.teste_msg_id, 'wamid.t1')
  assert.match(e.link_nonce, /^[0-9a-f]{32}$/)
  assert.equal(m.emails().length, 1)
  const texto = m.emails()[0].corpo.text
  assert.ok(texto.startsWith('O lembrete do WhatsApp foi aprovado. Confira a mensagem no seu celular e toque em LIGAR se estiver tudo certo.'))
  assert.match(texto, /LIGAR: https:\/\/robo\.example\/whatsapp\/ligar\?acao=ligar&n=[0-9a-f]{32}&t=[0-9a-f]{64}/)
  assert.match(texto, /PAUSAR: https:\/\/robo\.example\/whatsapp\/ligar\?acao=pausar&n=/)
  // Na rodada seguinte, ainda sem o LIGAR, nenhum cliente recebe.
  await rodada(b, m)
  assert.equal(m.envios().length, 1)
  assert.equal(b.prepare(`SELECT whatsapp_enviado_em FROM carrinhos WHERE id = 'cliente'`).get().whatsapp_enviado_em, null)
})

test('ligação: aprovado fora do horário não manda o teste; falta de configuração não consulta', async () => {
  const b = banco()
  aguardando(b)
  const m = metaFalsa({ status: 'APPROVED' })
  await rodada(b, m, {}, new Date('2026-01-15T05:00:00Z'))
  assert.equal(m.consultas().length, 1)
  assert.equal(m.envios().length, 0)
  const sem = metaFalsa({ status: 'APPROVED' })
  await rodada(banco(), sem, { WA_LINK_SEGREDO: '' })
  const b2 = banco()
  aguardando(b2)
  await rodada(b2, sem, { WA_LINK_SEGREDO: '' })
  assert.equal(sem.pedidos.length, 0)
})

test('ligação: erro no envio do teste → e-mail explicando, continua esperando, tenta de novo só depois de 6 h', async () => {
  const b = banco()
  aguardando(b)
  const m = metaFalsa({ status: 'APPROVED', erroEnvio: 131042 })
  await rodada(b, m)
  assert.equal(m.envios().length, 1)
  assert.equal(estadoAtual(b).estado, 'aguardando_modelo')
  assert.equal(m.emails().length, 1)
  assert.ok(m.emails()[0].corpo.text.includes('Problema de pagamento'))
  assert.ok(m.emails()[0].corpo.text.includes('código 131042'))
  b.exec(`UPDATE whatsapp_estado SET modelo_conferido_em = datetime('now', '-31 minutes')`)
  await rodada(b, m)
  assert.equal(m.envios().length, 1, 'não tenta antes de 6 h')
  b.exec(`UPDATE whatsapp_estado SET teste_tentado_em = datetime('now', '-7 hours')`)
  await rodada(b, m)
  assert.equal(m.envios().length, 2)
})

test('ligação: a Meta aceita o teste mas avisa depois que não entregou → volta a esperar e avisa', async () => {
  const b = banco()
  aguardando(b)
  const m = metaFalsa({ status: 'APPROVED' })
  await rodada(b, m)
  assert.equal(estadoAtual(b).estado, 'teste_enviado')
  const env = ambiente(new D1Local(b), comLink)
  const r = await atenderWebhook(assinado(aviso({ status: [{ id: 'wamid.t1', status: 'failed', errors: [{ code: 130497, title: 'restricted' }] }] })), env, { fetchImpl: m.fetchImpl, logger: mudo })
  assert.equal(r.status, 200)
  const e = estadoAtual(b)
  assert.equal(e.estado, 'aguardando_modelo')
  assert.equal(e.link_nonce, null)
  assert.equal(m.emails().length, 2)
  assert.ok(m.emails()[1].corpo.text.includes('código 130497'))
})

async function linksDoEmail(b) {
  aguardando(b)
  const m = metaFalsa({ status: 'APPROVED' })
  await rodada(b, m)
  const texto = m.emails()[0].corpo.text
  return {
    ligar: texto.match(/LIGAR: (\S+)/)[1],
    pausar: texto.match(/PAUSAR: (\S+)/)[1],
  }
}

const abrir = (b, link) => atenderWebhook(new Request(link), ambiente(new D1Local(b), comLink), { logger: mudo })
function confirmar(b, link) {
  const u = new URL(link)
  return atenderWebhook(
    new Request(u.origin + u.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: u.searchParams.toString(),
    }),
    ambiente(new D1Local(b), comLink),
    { logger: mudo }
  )
}

test('link LIGAR: abrir só mostra o botão; confirmar liga; usar de novo é recusado', async () => {
  const b = banco()
  const { ligar, pausar } = await linksDoEmail(b)
  const pagina = await abrir(b, ligar)
  assert.equal(pagina.status, 200)
  assert.ok((await pagina.text()).includes('<form method="post">'))
  assert.equal(estadoAtual(b).estado, 'teste_enviado', 'abrir o link não muda nada')
  const feito = await confirmar(b, ligar)
  assert.equal(feito.status, 200)
  assert.ok((await feito.text()).includes('WhatsApp ligado'))
  const e = estadoAtual(b)
  assert.equal(e.estado, 'ativo')
  assert.ok(e.ligado_em)
  assert.equal(e.atualizado_por, 'link do e-mail')
  assert.equal((await confirmar(b, ligar)).status, 410)
  assert.equal((await abrir(b, ligar)).status, 410)
  assert.equal((await confirmar(b, pausar)).status, 410, 'o outro link morre junto')
})

test('link PAUSAR: confirmar pausa e ninguém recebe', async () => {
  const b = banco()
  const { pausar } = await linksDoEmail(b)
  carrinho(b, 'cliente', 'cliente@example.com', '27911110000')
  assert.equal((await confirmar(b, pausar)).status, 200)
  assert.equal(estadoAtual(b).estado, 'pausado')
  const m = metaFalsa({ status: 'APPROVED' })
  await rodada(b, m)
  assert.equal(m.pedidos.length, 0)
})

test('link falso, trocado ou vencido é recusado', async () => {
  const b = banco()
  const { ligar } = await linksDoEmail(b)
  const u = new URL(ligar)
  const t = u.searchParams.get('t')
  const trocado = ligar.replace(t, (t[0] === 'a' ? 'b' : 'a') + t.slice(1))
  assert.equal((await confirmar(b, trocado)).status, 410)
  assert.equal((await confirmar(b, ligar.replace('acao=ligar', 'acao=pausar'))).status, 410, 'assinatura é da ação')
  assert.equal((await abrir(b, 'https://robo.example/whatsapp/ligar?acao=ligar&n=x&t=y')).status, 410)
  b.exec(`UPDATE whatsapp_estado SET link_expira_em = datetime('now', '-1 minute')`)
  assert.equal((await confirmar(b, ligar)).status, 410)
  assert.equal(estadoAtual(b).estado, 'teste_enviado')
})

test('ligado: no máximo 10 por dia nos 3 primeiros dias; depois volta ao teto normal', async () => {
  const b = banco()
  b.exec(`UPDATE whatsapp_estado SET ligado_em = datetime('now', '-1 hours')`)
  for (let i = 0; i < 12; i += 1) carrinho(b, `c${i}`, `c${i}@example.com`, `2791111${String(i).padStart(4, '0')}`)
  const m = metaFalsa()
  const r = await rodada(b, m)
  assert.equal(r.enviados, 10)
  b.exec(`UPDATE whatsapp_estado SET ligado_em = datetime('now', '-4 days')`)
  const r2 = await rodada(b, m)
  assert.equal(r2.enviados, 2)
})

test('ligado: carrinho que esperou a aprovação só recebe se ainda estiver dentro das 48 h', async () => {
  const b = banco()
  carrinho(b, 'antigo', 'antigo@example.com', '27911110000', '-60 hours')
  carrinho(b, 'recente', 'recente@example.com', '27922220000', '-5 hours')
  const m = metaFalsa()
  await rodada(b, m)
  assert.deepEqual(m.envios().map((p) => p.corpo.to), ['5527922220000'])
})

test('resumo do dia: uma vez depois das 20h, com enviados, entregues, lidos, recusas e compras', async () => {
  const b = banco()
  b.exec(`
    INSERT INTO carrinhos (id, email, telefone, status, criado_em, whatsapp_enviado_em, whatsapp_etapa) VALUES
      ('a', 'a@example.com', '27911110001', 'aberto', '2026-01-15 10:00:00', '2026-01-15 14:00:00', 1),
      ('b', 'b@example.com', '27911110002', 'aberto', '2026-01-15 10:00:00', '2026-01-15 15:00:00', 1),
      ('c', 'c@example.com', '27911110003', 'aberto', '2026-01-15 10:00:00', '2026-01-14 15:00:00', 1);
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em, wa_status) VALUES
      ('a', 'whatsapp', 1, '2026-01-15 14:00:00', 'read'),
      ('b', 'whatsapp', 1, '2026-01-15 15:00:00', 'delivered'),
      ('c', 'whatsapp', 1, '2026-01-14 15:00:00', 'read');
    INSERT INTO carrinhos (id, email, telefone, status, criado_em, whatsapp_falhou_em, whatsapp_status, whatsapp_erro) VALUES
      ('d', 'd@example.com', '27911110004', 'aberto', '2026-01-15 10:00:00', '2026-01-15 16:00:00', 'failed', '131026');
    INSERT INTO carrinhos (id, email, status, criado_em, pago_em) VALUES
      ('a2', 'a@example.com', 'pago', '2026-01-15 17:00:00', '2026-01-15 17:30:00');
  `)
  const db = new D1Local(b)
  const m = metaFalsa()
  const noite = new Date('2026-01-16T00:30:00Z') // 21h30 de 15/01 em Brasília
  await executarWhatsapp(ambiente(db, comLink), { agora: new Date('2026-01-15T22:00:00Z'), logger: mudo, fetchImpl: m.fetchImpl }) // 19h
  assert.equal(m.emails().length, 0)
  await executarWhatsapp(ambiente(db, comLink), { agora: noite, logger: mudo, fetchImpl: m.fetchImpl })
  await executarWhatsapp(ambiente(db, comLink), { agora: noite, logger: mudo, fetchImpl: m.fetchImpl })
  assert.equal(m.emails().length, 1)
  const { subject, text } = m.emails()[0].corpo
  assert.equal(subject, 'WhatsApp: resumo de 15/01')
  assert.ok(text.includes('Enviadas: 2\nEntregues: 2\nLidas: 1\nRecusadas: 1\nVoltaram ao checkout pelo botão: 0\nCompraram hoje depois de um WhatsApp: 1'), text)
  assert.ok(text.includes('Por mensagem da sequência:\n- 1ª: 2 enviadas, 2 entregues, 1 lidas'), text)
  assert.ok(text.includes('1 × A mensagem não pôde ser entregue'))
  assert.equal(m.envios().length, 0, 'fora do horário não envia lembrete')
})

test('gestão: pausar, retomar e ligar só a partir do estado certo; ação estranha é recusada', async () => {
  const b = banco()
  const db = new D1Local(b)
  assert.equal(acaoDeEstadoValida('apagar'), null)
  assert.equal(acaoDeEstadoValida('constructor'), null)
  assert.equal((await mudarEstadoWhatsapp(db, 'apagar', 'p@example.com')).status, 400)

  assert.equal((await lerEstadoWhatsapp(db)).estado, 'ativo')
  const pausou = await mudarEstadoWhatsapp(db, 'pausar', 'p@example.com')
  assert.equal(pausou.ok, true)
  assert.equal(pausou.estado.estado, 'pausado')
  assert.equal(pausou.estado.atualizado_por, 'p@example.com')
  assert.equal((await mudarEstadoWhatsapp(db, 'pausar', 'p@example.com')).status, 409)
  assert.equal((await mudarEstadoWhatsapp(db, 'ligar', 'p@example.com')).status, 409, 'ligar só depois do teste')
  assert.equal((await mudarEstadoWhatsapp(db, 'retomar', 'p@example.com')).estado.estado, 'ativo')

  b.exec(`UPDATE whatsapp_estado SET estado = 'aguardando_modelo', ligado_em = NULL`)
  assert.equal((await mudarEstadoWhatsapp(db, 'pausar', 'p@example.com')).status, 409, 'nada a pausar antes do teste')
  b.exec(`UPDATE whatsapp_estado SET estado = 'teste_enviado', link_nonce = 'abc'`)
  const ligou = await mudarEstadoWhatsapp(db, 'ligar', 'p@example.com')
  assert.equal(ligou.estado.estado, 'ativo')
  assert.ok(ligou.estado.ligado_em)
  const linha = b.prepare('SELECT link_nonce FROM whatsapp_estado').get()
  assert.equal(linha.link_nonce, null, 'o link do e-mail morre quando liga pela gestão')
})

test('WA_MODO=ativo + aguardando_modelo: com vários clientes prontos, a única chamada é a consulta do modelo', async () => {
  const b = banco()
  aguardando(b)
  for (let i = 0; i < 5; i += 1) carrinho(b, `cli${i}`, `cli${i}@example.com`, `2793333${String(i).padStart(4, '0')}`, '-5 hours')
  carrinho(b, 'do-paulo', 'paulo@example.com', '27999990000', '-5 hours')
  for (const status of ['PENDING', 'REJECTED', 'NAO_ENCONTRADO']) {
    b.exec(`UPDATE whatsapp_estado SET modelo_conferido_em = NULL, recusa_avisada = 'x'`)
    const m = metaFalsa({ status, motivo: 'x' })
    await rodada(b, m, { WA_MODO: 'ativo' })
    assert.deepEqual(m.pedidos.map((p) => [p.metodo, p.url.includes('/message_templates')]), [['GET', true]], status)
  }
  const marcados = b.prepare(`SELECT COUNT(*) AS n FROM carrinhos WHERE whatsapp_enviado_em IS NOT NULL OR whatsapp_falhou_em IS NOT NULL`).get().n
  assert.equal(marcados, 0)
  assert.equal(b.prepare(`SELECT COUNT(*) AS n FROM lembretes_enviados WHERE canal = 'whatsapp'`).get().n, 0)
  assert.equal(estadoAtual(b).estado, 'aguardando_modelo')
})
