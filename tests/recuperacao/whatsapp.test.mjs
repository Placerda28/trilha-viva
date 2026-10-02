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
  consultarConversas,
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
  ]) {
    b.exec(readFileSync(`migrations/${arquivo}.sql`, 'utf8'))
  }
  return b
}

function carrinho(b, id, email, telefone, idade = '-4 hours', extras = {}) {
  b.prepare(`
    INSERT INTO carrinhos (id, email, nome, telefone, criado_em, status, whatsapp_enviado_em)
    VALUES (?, ?, ?, ?, datetime('now', ?), ?, ?)`).run(
    id,
    email,
    extras.nome ?? 'Maria Clara',
    telefone,
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
  const linha = b.prepare(`SELECT whatsapp_msg_id, whatsapp_status, whatsapp_enviado_em IS NOT NULL AS enviado FROM carrinhos WHERE id = 'certo'`).get()
  assert.deepEqual({ ...linha }, { whatsapp_msg_id: 'wamid.1', whatsapp_status: 'sent', enviado: 1 })

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

function aviso({ mensagens = [], status = [], nome = 'Maria' } = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'waba',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          contacts: [{ wa_id: '5527911110000', profile: { name: nome } }],
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
  b.exec(`UPDATE carrinhos SET whatsapp_msg_id = 'wamid.x', whatsapp_status = 'sent', whatsapp_enviado_em = datetime('now')`)
  const env = ambiente(new D1Local(b))
  const status = (s) => atenderWebhook(assinado(aviso({ status: [{ id: 'wamid.x', status: s }] })), env, { logger: mudo })
  const atual = () => b.prepare('SELECT whatsapp_status AS s FROM carrinhos').get().s
  await status('delivered')
  assert.equal(atual(), 'delivered')
  await status('read')
  assert.equal(atual(), 'read')
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
    UPDATE carrinhos SET whatsapp_enviado_em = datetime('now', '-1 hour'), whatsapp_status = 'read';
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
  assert.deepEqual(t, { enviados: 1, entregues: 1, lidos: 1, falharam: 0, recuperados: 0, custo_estimado_centavos: 32 })
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
