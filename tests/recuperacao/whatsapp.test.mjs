import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import {
  compararSegredoEmTempoConstante,
  lerMensagemRecebida,
  pedidoDeSaida,
} from '../../lib/whatsapp-saida.js'
import {
  dentroDoHorario,
  enviarWhatsapp,
  montarWhatsapp,
} from '../../workers/recuperacao-carrinho/whatsapp.js'
import {
  executarRodada,
  executarWhatsapp,
} from '../../workers/recuperacao-carrinho/index.js'

class D1Local {
  constructor(banco) {
    this.banco = banco
  }

  prepare(sql) {
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novosValores) {
        valores = novosValores
        return this
      },
      async all() {
        return { results: preparada.all(...valores) }
      },
      async first() {
        return preparada.get(...valores) || null
      },
      async run() {
        const resultado = preparada.run(...valores)
        return { meta: { changes: resultado.changes } }
      },
    }
  }
}

function bancoWhatsapp() {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0000_esquema_atual.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0004_carrinhos.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0005_recuperacao_v2.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0006_whatsapp.sql', 'utf8'))
  return banco
}

function inserirCarrinho(
  banco,
  id,
  email,
  telefone,
  modificador = '-25 hours',
  extras = {}
) {
  banco.prepare(`
    INSERT INTO carrinhos
      (id, email, nome, telefone, criado_em, status, finalizado_em,
       whatsapp_enviado_em, whatsapp_falhou_em)
    VALUES (?, ?, ?, ?, datetime('now', ?), ?, ?, ?, ?)
  `).run(
    id,
    email,
    extras.nome || null,
    telefone,
    modificador,
    extras.status || 'aberto',
    extras.finalizado_em || null,
    extras.whatsapp_enviado_em || null,
    extras.whatsapp_falhou_em || null
  )
}

function ambiente(db, extras = {}) {
  return {
    DB: db,
    MODO: 'ativo',
    TESTE_PARA: 'email-teste@example.com',
    LEMBRETE_BCC: 'bcc@example.com',
    EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>',
    EMAIL_REPLY_TO: 'contato@trilhaviva.org',
    SITE_URL: 'https://trilhaviva.org',
    TETO_DIA: '40',
    TETO_MES: '1100',
    RESEND_API_KEY: 'resend_teste',
    LEMBRETE_SEGREDO: 'segredo_teste',
    MODO_WHATSAPP: 'ativo',
    WHATSAPP_PROVEDOR: 'zapi',
    WHATSAPP_TESTE_PARA: '11999990000',
    WHATSAPP_TETO_DIA: '20',
    ZAPI_INSTANCIA: 'instancia',
    ZAPI_TOKEN: 'token',
    ZAPI_CLIENT_TOKEN: 'cliente',
    ...extras,
  }
}

const meioDoDia = new Date('2026-01-15T15:00:00Z')
const loggerMudo = { log() {}, error() {} }
const envioOk = async () => new Response('{}', { status: 200 })

test('migração 0006 contém exatamente a alteração aditiva especificada', () => {
  assert.equal(
    readFileSync('migrations/0006_whatsapp.sql', 'utf8').trim(),
    `ALTER TABLE carrinhos ADD COLUMN whatsapp_falhou_em TEXT;   -- tentativa que falhou (não tenta de novo)
CREATE INDEX IF NOT EXISTS idx_carrinhos_telefone ON carrinhos (telefone);`
  )
})

test('montarWhatsapp mantém as três variações estáveis, primeiro nome, link e SAIR', () => {
  const env = { SITE_URL: 'https://trilhaviva.org/' }
  const casos = [
    ['c', 'Oi, Ana!', 'Vi que você começou'],
    ['a', 'Olá, Ana, tudo bem?', 'Seu acesso ao acervo'],
    ['b', 'Oi, Ana! Passando', 'pagamento único'],
  ]
  for (const [id, saudacao, trecho] of casos) {
    const carrinho = { id, nome: `Ana${String.fromCharCode(9)}Maria` }
    const primeira = montarWhatsapp(carrinho, env)
    assert.equal(montarWhatsapp(carrinho, env), primeira)
    assert.match(primeira, new RegExp(saudacao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(primeira, new RegExp(trecho))
    assert.match(
      primeira,
      new RegExp(`https://trilhaviva.org/assinar\\?r=${id}&utm_source=whatsapp&utm_medium=lembrete&utm_campaign=carrinho`)
    )
    assert.match(primeira, /SAIR\.$/)
    assert.doesNotMatch(primeira, /Maria/)
  }

  assert.match(montarWhatsapp({ id: 'c', nome: '' }, env), /^Oi! Aqui é da Trilha Viva/)
  assert.match(montarWhatsapp({ id: 'a' }, env), /^Olá, tudo bem\? É da Trilha Viva/)
  assert.match(montarWhatsapp({ id: 'b', nome: null }, env), /^Oi! Passando/)
})

test('enviarWhatsapp monta URL, cabeçalhos e corpo para Z-API e Evolution', async () => {
  const pedidos = []
  const fetchImpl = async (url, opcoes) => {
    pedidos.push({ url, opcoes })
    return new Response('{}', { status: 200 })
  }

  await enviarWhatsapp(
    { telefone: '11999990000', texto: 'Mensagem' },
    {
      WHATSAPP_PROVEDOR: 'zapi',
      ZAPI_INSTANCIA: 'abc',
      ZAPI_TOKEN: 'tok',
      ZAPI_CLIENT_TOKEN: 'cliente',
    },
    fetchImpl
  )
  await enviarWhatsapp(
    { telefone: '11888880000', texto: 'Outra' },
    {
      WHATSAPP_PROVEDOR: 'evolution',
      EVOLUTION_URL: 'https://evolution.example.com/',
      EVOLUTION_INSTANCIA: 'Minha Instância',
      EVOLUTION_APIKEY: 'chave',
    },
    fetchImpl
  )

  assert.equal(pedidos[0].url, 'https://api.z-api.io/instances/abc/token/tok/send-text')
  assert.deepEqual(pedidos[0].opcoes.headers, {
    'Client-Token': 'cliente',
    'Content-Type': 'application/json',
  })
  assert.deepEqual(JSON.parse(pedidos[0].opcoes.body), {
    phone: '5511999990000',
    message: 'Mensagem',
  })
  assert.equal(
    pedidos[1].url,
    'https://evolution.example.com/message/sendText/Minha%20Inst%C3%A2ncia'
  )
  assert.deepEqual(pedidos[1].opcoes.headers, {
    apikey: 'chave',
    'Content-Type': 'application/json',
  })
  assert.deepEqual(JSON.parse(pedidos[1].opcoes.body), {
    number: '5511888880000',
    text: 'Outra',
  })

  await assert.rejects(
    enviarWhatsapp(
      { telefone: '11999990000', texto: 'Falha' },
      {
        WHATSAPP_PROVEDOR: 'zapi',
        ZAPI_INSTANCIA: 'abc',
        ZAPI_TOKEN: 'tok',
        ZAPI_CLIENT_TOKEN: 'cliente',
      },
      async () => new Response('{}', { status: 503 })
    ),
    /HTTP 503/
  )
})

test('dentroDoHorario respeita os quatro limites de Brasília', () => {
  assert.equal(dentroDoHorario(new Date('2026-01-15T11:59:00Z')), false)
  assert.equal(dentroDoHorario(new Date('2026-01-15T12:00:00Z')), true)
  assert.equal(dentroDoHorario(new Date('2026-01-15T22:59:00Z')), true)
  assert.equal(dentroDoHorario(new Date('2026-01-15T23:00:00Z')), false)
})

test('saída interpreta Z-API e Evolution e ignora grupo, fromMe e texto vazio', () => {
  assert.deepEqual(
    lerMensagemRecebida({
      phone: '5511999990000',
      fromMe: false,
      isGroup: false,
      text: { message: 'SAIR' },
    }),
    { telefone: '11999990000', texto: 'SAIR' }
  )
  assert.deepEqual(
    lerMensagemRecebida({
      event: 'messages.upsert',
      data: {
        key: { remoteJid: '5511888880000@s.whatsapp.net', fromMe: false },
        message: { extendedTextMessage: { text: 'pare!' } },
      },
    }),
    { telefone: '11888880000', texto: 'pare!' }
  )
  assert.equal(
    lerMensagemRecebida({
      event: 'messages.upsert',
      data: {
        key: { remoteJid: '5511999990000@g.us', fromMe: false },
        message: { conversation: 'sair' },
      },
    }),
    null
  )
  assert.equal(
    lerMensagemRecebida({ phone: '5511999990000', fromMe: true, text: { message: 'sair' } }),
    null
  )
  assert.equal(lerMensagemRecebida({ phone: '5511999990000', text: { message: '' } }), null)
})

test('pedidoDeSaida aceita somente os pedidos definidos e segredo é comparado por resumo', async () => {
  for (const texto of [' SAIR! ', 'parar.', 'PARE', 'stop', 'cancelar', 'descadastrar', 'remover']) {
    assert.equal(pedidoDeSaida(texto), true)
  }
  assert.equal(pedidoDeSaida('quero sair agora'), false)
  assert.equal(pedidoDeSaida('saída'), false)
  assert.equal(await compararSegredoEmTempoConstante('segredo', 'segredo'), true)
  assert.equal(await compararSegredoEmTempoConstante('segredo', 'outro'), false)
})

test('WhatsApp desligado não consulta o banco e configuração ausente também não consulta', async () => {
  const dbProibido = { prepare() { throw new Error('não deveria consultar') } }
  assert.deepEqual(
    await executarWhatsapp({ DB: dbProibido, MODO_WHATSAPP: 'desligado' }),
    { enviados: 0, ignorados: 0, apenasLog: 0 }
  )
  assert.deepEqual(
    await executarWhatsapp(
      { DB: dbProibido, MODO_WHATSAPP: 'ativo', WHATSAPP_PROVEDOR: 'zapi' },
      { agora: meioDoDia, logger: loggerMudo }
    ),
    { enviados: 0, ignorados: 0, apenasLog: 0 }
  )
})

test('modo teste envia só ao número autorizado e mascara os demais', async () => {
  const banco = bancoWhatsapp()
  inserirCarrinho(banco, 'outro', 'outro@example.com', '11888880000', '-30 hours')
  inserirCarrinho(banco, 'teste', 'teste@example.com', '11999990000', '-25 hours')
  const logs = []
  let envios = 0
  const resultado = await executarWhatsapp(
    ambiente(new D1Local(banco), { MODO_WHATSAPP: 'teste' }),
    {
      agora: meioDoDia,
      logger: { log: (mensagem) => logs.push(mensagem), error() {} },
      fetchImpl: async () => { envios += 1; return envioOk() },
    }
  )

  assert.deepEqual(resultado, { enviados: 1, ignorados: 0, apenasLog: 1 })
  assert.equal(envios, 1)
  assert.match(logs[0], /11\*{5}0000/)
  assert.doesNotMatch(logs[0], /11888880000/)
  assert.equal(
    banco.prepare("SELECT whatsapp_enviado_em IS NULL AS vazio FROM carrinhos WHERE id = 'outro'").get().vazio,
    1
  )
})

test('teto diário impede envio e cada rodada envia no máximo três', async () => {
  const bancoTeto = bancoWhatsapp()
  inserirCarrinho(bancoTeto, 'anterior', 'anterior@example.com', '11777770000', '-80 hours', {
    status: 'ignorado',
    whatsapp_enviado_em: '2026-01-01 10:00:00',
  })
  bancoTeto.exec(`
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em)
    VALUES ('anterior', 'whatsapp', 1, datetime('now'))
  `)
  inserirCarrinho(bancoTeto, 'espera', 'espera@example.com', '11666660000')
  let chamadas = 0
  const noTeto = await executarWhatsapp(
    ambiente(new D1Local(bancoTeto), { WHATSAPP_TETO_DIA: '1' }),
    { agora: meioDoDia, logger: loggerMudo, fetchImpl: async () => { chamadas += 1; return envioOk() } }
  )
  assert.equal(noTeto.enviados, 0)
  assert.equal(chamadas, 0)

  const bancoTres = bancoWhatsapp()
  for (let indice = 0; indice < 4; indice += 1) {
    inserirCarrinho(
      bancoTres,
      `c${indice}`,
      `c${indice}@example.com`,
      `1199999000${indice}`
    )
  }
  const tres = await executarWhatsapp(
    ambiente(new D1Local(bancoTres)),
    { agora: meioDoDia, logger: loggerMudo, fetchImpl: envioOk }
  )
  assert.equal(tres.enviados, 3)
  assert.equal(
    bancoTres.prepare('SELECT COUNT(*) AS total FROM carrinhos WHERE whatsapp_enviado_em IS NOT NULL').get().total,
    3
  )
})

test('janela aceita somente carrinhos entre 24 e 72 horas', async () => {
  const banco = bancoWhatsapp()
  inserirCarrinho(banco, 'novo', 'novo@example.com', '11111110000', '-23 hours')
  inserirCarrinho(banco, 'inicio', 'inicio@example.com', '11222220000', '-25 hours')
  inserirCarrinho(banco, 'fim', 'fim@example.com', '11333330000', '-71 hours')
  inserirCarrinho(banco, 'antigo', 'antigo@example.com', '11444440000', '-73 hours')
  const resultado = await executarWhatsapp(
    ambiente(new D1Local(banco)),
    { agora: meioDoDia, logger: loggerMudo, fetchImpl: envioOk }
  )
  assert.equal(resultado.enviados, 2)
  assert.deepEqual(
    banco.prepare(`
      SELECT id FROM carrinhos WHERE whatsapp_enviado_em IS NOT NULL ORDER BY id
    `).all().map((linha) => linha.id),
    ['fim', 'inicio']
  )
})

test('compra, descadastro e envio anterior bloqueiam e marcam a tentativa', async () => {
  const banco = bancoWhatsapp()
  inserirCarrinho(banco, 'comprou', 'comprou@example.com', '11111110000')
  inserirCarrinho(banco, 'saiu', 'saiu@example.com', '11222220000')
  inserirCarrinho(banco, 'anterior', 'anterior@example.com', '11333330000', '-80 hours', {
    status: 'ignorado',
    whatsapp_enviado_em: '2026-01-01 10:00:00',
  })
  inserirCarrinho(banco, 'repetido', 'outro@example.com', '11333330000')
  banco.exec(`
    INSERT INTO clientes (email) VALUES ('comprou@example.com');
    INSERT INTO compras (cliente_id, stripe_session_id, status)
      VALUES (last_insert_rowid(), 'mp_whatsapp', 'pago');
    INSERT INTO descadastros (email, canal) VALUES ('saiu@example.com', 'email');
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em)
      VALUES ('anterior', 'whatsapp', 1, '2026-01-01 10:00:00');
  `)
  let chamadas = 0
  const resultado = await executarWhatsapp(
    ambiente(new D1Local(banco)),
    { agora: meioDoDia, logger: loggerMudo, fetchImpl: async () => { chamadas += 1; return envioOk() } }
  )
  assert.deepEqual(resultado, { enviados: 0, ignorados: 3, apenasLog: 0 })
  assert.equal(chamadas, 0)
  assert.equal(
    banco.prepare(`
      SELECT COUNT(*) AS total
        FROM carrinhos
       WHERE id IN ('comprou', 'saiu', 'repetido')
         AND whatsapp_falhou_em IS NOT NULL
    `).get().total,
    3
  )
})

test('falha de envio é marcada e nunca tentada novamente', async () => {
  const banco = bancoWhatsapp()
  inserirCarrinho(banco, 'falha', 'falha@example.com', '11999990000')
  let chamadas = 0
  const opcoes = {
    agora: meioDoDia,
    logger: loggerMudo,
    fetchImpl: async () => { chamadas += 1; return new Response('{}', { status: 500 }) },
  }
  await executarWhatsapp(ambiente(new D1Local(banco)), opcoes)
  await executarWhatsapp(ambiente(new D1Local(banco)), opcoes)

  assert.equal(chamadas, 1)
  assert.equal(
    banco.prepare("SELECT whatsapp_falhou_em IS NOT NULL AS falhou FROM carrinhos WHERE id = 'falha'").get().falhou,
    1
  )
  assert.equal(
    banco.prepare("SELECT COUNT(*) AS total FROM lembretes_enviados WHERE canal = 'whatsapp'").get().total,
    0
  )
})

test('erro no WhatsApp não altera o resultado nem o registro do e-mail', async () => {
  const banco = bancoWhatsapp()
  inserirCarrinho(banco, 'dois-canais', 'dois@example.com', '11999990000', '-25 hours')
  let emails = 0
  const resultado = await executarRodada(ambiente(new D1Local(banco)), {
    agora: meioDoDia,
    logger: loggerMudo,
    fetchImpl: async (url) => {
      if (url === 'https://api.resend.com/emails') {
        emails += 1
        return envioOk()
      }
      return new Response('{}', { status: 500 })
    },
  })

  assert.equal(emails, 1)
  assert.equal(resultado.enviados, 1)
  assert.deepEqual(resultado.whatsapp, { enviados: 0, ignorados: 0, apenasLog: 0 })
  assert.deepEqual(
    { ...banco.prepare(`
      SELECT status, email_enviado_em IS NOT NULL AS email_ok,
             whatsapp_falhou_em IS NOT NULL AS whatsapp_falhou
        FROM carrinhos WHERE id = 'dois-canais'
    `).get() },
    { status: 'lembrado', email_ok: 1, whatsapp_falhou: 1 }
  )
})
