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
  banco.exec(readFileSync('migrations/0007_whatsapp_semanal.sql', 'utf8'))
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
       whatsapp_enviado_em, whatsapp_falhou_em, whatsapp_etapa,
       proximo_whatsapp_em)
    VALUES (?, ?, ?, ?, datetime('now', ?), ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    email,
    extras.nome || null,
    telefone,
    modificador,
    extras.status || 'aberto',
    extras.finalizado_em || null,
    extras.whatsapp_enviado_em || null,
    extras.whatsapp_falhou_em || null,
    extras.whatsapp_etapa || 0,
    extras.proximo_whatsapp_em || null
  )
}

function inserirSequenciaWhatsapp(banco, id, email, telefone, etapa, proximo = "datetime('now', '-1 minute')") {
  banco.exec(`
    INSERT INTO carrinhos
      (id, email, telefone, criado_em, status, whatsapp_enviado_em,
       whatsapp_etapa, proximo_whatsapp_em)
    VALUES (
      '${id}', '${email}', '${telefone}', datetime('now', '-30 days'), 'aberto',
      datetime('now', '-20 days'), ${etapa}, ${proximo}
    )
  `)
  const inserir = banco.prepare(`
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em)
    VALUES (?, 'whatsapp', ?, datetime('now', ?))
  `)
  for (let numero = 1; numero <= etapa; numero += 1) {
    inserir.run(id, numero, `-${21 - numero * 2} days`)
  }
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
    readFileSync('migrations/0006_whatsapp.sql', 'utf8')
      .split(String.fromCharCode(13)).join('').trim(),
    `ALTER TABLE carrinhos ADD COLUMN whatsapp_falhou_em TEXT;   -- tentativa que falhou (não tenta de novo)
CREATE INDEX IF NOT EXISTS idx_carrinhos_telefone ON carrinhos (telefone);`
  )
})

test('migração 0007 preserva dados, aceita etapa 8 e recusa etapa 9', () => {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0000_esquema_atual.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0004_carrinhos.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0005_recuperacao_v2.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0006_whatsapp.sql', 'utf8'))
  banco.exec(`
    INSERT INTO carrinhos (id, email, telefone, criado_em, status)
    VALUES ('preservado', 'preservado@example.com', '11999990000', datetime('now'), 'aberto');
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em)
    VALUES ('preservado', 'email', 4, '2026-01-01 10:00:00')
  `)

  banco.exec(readFileSync('migrations/0007_whatsapp_semanal.sql', 'utf8'))
  assert.deepEqual(
    { ...banco.prepare(`
      SELECT carrinho_id, canal, etapa, enviado_em FROM lembretes_enviados
    `).get() },
    {
      carrinho_id: 'preservado',
      canal: 'email',
      etapa: 4,
      enviado_em: '2026-01-01 10:00:00',
    }
  )
  banco.exec(`
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa)
    VALUES ('preservado', 'whatsapp', 8)
  `)
  assert.throws(
    () => banco.exec(`
      INSERT INTO lembretes_enviados (carrinho_id, canal, etapa)
      VALUES ('preservado', 'whatsapp', 9)
    `),
    /constraint failed/i
  )
})

test('montarWhatsapp cobre todas as etapas, variações, nomes, links e saída', async () => {
  const env = {
    SITE_URL: 'https://trilhaviva.org/',
    LEMBRETE_SEGREDO: 'segredo_teste',
  }
  const casos = [
    ['c', 'Oi, Ana!', 'Vi que você começou'],
    ['a', 'Olá, Ana, tudo bem?', 'Seu acesso ao acervo'],
    ['b', 'Oi, Ana! Passando', 'pagamento único'],
  ]
  for (const [id, saudacao, trecho] of casos) {
    const carrinho = {
      id,
      email: 'ana@example.com',
      nome: `Ana${String.fromCharCode(9)}Maria`,
    }
    const primeira = await montarWhatsapp(carrinho, env, 1)
    assert.equal(await montarWhatsapp(carrinho, env, 1), primeira)
    assert.ok(primeira.includes(saudacao))
    assert.ok(primeira.includes(trecho))
    assert.ok(primeira.includes(`utm_campaign=carrinho-wa-1`))
    assert.ok(primeira.includes('responda SAIR ou toque aqui:'))
    assert.match(primeira, new RegExp('api/descadastrar[?]e=ana%40example.com&t=[0-9a-f]{64}$'))
    assert.equal(primeira.includes('Maria'), false)
  }

  const seguimentos = [
    'Aqui é da Trilha Viva de novo.',
    'Uma dica rápida da Trilha Viva:',
    'Passando para saber se ficou alguma dúvida',
    'Aqui é da Trilha Viva de novo.',
    'Uma dica rápida da Trilha Viva:',
    'Passando para saber se ficou alguma dúvida',
  ]
  for (let etapa = 2; etapa <= 7; etapa += 1) {
    const texto = await montarWhatsapp(
      { id: 'seguimento', email: 'pessoa@example.com', nome: 'Paulo' },
      env,
      etapa
    )
    assert.ok(texto.includes(seguimentos[etapa - 2]))
    assert.ok(texto.includes(`utm_campaign=carrinho-wa-${etapa}`))
    assert.ok(texto.includes('responda SAIR ou toque aqui:'))
  }

  const ultima = await montarWhatsapp(
    { id: 'ultima', email: 'pessoa@example.com', nome: 'Paulo' },
    env,
    8
  )
  assert.ok(ultima.startsWith('Oi, Paulo! Esta é a última mensagem'))
  assert.ok(ultima.includes('utm_campaign=carrinho-wa-8'))
  assert.ok(ultima.includes('responda SAIR ou toque aqui:'))

  assert.ok((await montarWhatsapp({ id: 'c', email: 'a@b.com' }, env, 1)).startsWith('Oi! Aqui'))
  assert.ok((await montarWhatsapp({ id: 'x', email: 'a@b.com' }, env, 2)).startsWith('Oi! Aqui'))
  assert.ok((await montarWhatsapp({ id: 'x', email: 'a@b.com' }, env, 3)).startsWith('Olá! Uma'))
  assert.ok((await montarWhatsapp({ id: 'x', email: 'a@b.com' }, env, 4)).startsWith('Oi, tudo bem?'))
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
  assert.deepEqual(
    { ...banco.prepare(`
      SELECT whatsapp_etapa,
             proximo_whatsapp_em IS NOT NULL AS tem_proximo
        FROM carrinhos WHERE id = 'teste'
    `).get() },
    { whatsapp_etapa: 1, tem_proximo: 1 }
  )

  const bancoSeguimento = bancoWhatsapp()
  inserirSequenciaWhatsapp(
    bancoSeguimento,
    'seguimento-teste',
    'seguimento@example.com',
    '11999990000',
    2
  )
  inserirSequenciaWhatsapp(
    bancoSeguimento,
    'seguimento-outro',
    'outro-seguimento@example.com',
    '11888880000',
    2
  )
  const resultadoSeguimento = await executarWhatsapp(
    ambiente(new D1Local(bancoSeguimento), { MODO_WHATSAPP: 'teste' }),
    { agora: meioDoDia, logger: loggerMudo, fetchImpl: envioOk }
  )
  assert.deepEqual(resultadoSeguimento, { enviados: 1, ignorados: 0, apenasLog: 1 })
  assert.equal(
    bancoSeguimento.prepare(`
      SELECT whatsapp_etapa FROM carrinhos WHERE id = 'seguimento-teste'
    `).get().whatsapp_etapa,
    3
  )
  assert.equal(
    bancoSeguimento.prepare(`
      SELECT whatsapp_etapa FROM carrinhos WHERE id = 'seguimento-outro'
    `).get().whatsapp_etapa,
    2
  )
})

test('sequência avança semanalmente da etapa 1 até a 8 e para no final', async () => {
  const banco = bancoWhatsapp()
  inserirCarrinho(banco, 'sequencia', 'sequencia@example.com', '11999990000')
  const db = new D1Local(banco)
  let chamadas = 0
  const opcoes = {
    agora: meioDoDia,
    logger: loggerMudo,
    fetchImpl: async () => {
      chamadas += 1
      return envioOk()
    },
  }

  for (let etapa = 1; etapa <= 8; etapa += 1) {
    if (etapa > 1) {
      banco.exec(`
        UPDATE carrinhos SET proximo_whatsapp_em = datetime('now', '-1 minute')
         WHERE id = 'sequencia'
      `)
    }
    const resultado = await executarWhatsapp(ambiente(db), opcoes)
    assert.equal(resultado.enviados, 1)
    const linha = banco.prepare(`
      SELECT whatsapp_etapa, proximo_whatsapp_em,
             ROUND(julianday(proximo_whatsapp_em) - julianday('now'), 3) AS dias
        FROM carrinhos WHERE id = 'sequencia'
    `).get()
    assert.equal(linha.whatsapp_etapa, etapa)
    if (etapa < 8) assert.equal(linha.dias, 7)
    else assert.equal(linha.proximo_whatsapp_em, null)
  }

  assert.equal(chamadas, 8)
  assert.equal(
    banco.prepare(`
      SELECT COUNT(*) AS total FROM lembretes_enviados
       WHERE carrinho_id = 'sequencia' AND canal = 'whatsapp'
    `).get().total,
    8
  )
  assert.equal((await executarWhatsapp(ambiente(db), opcoes)).enviados, 0)
  assert.equal(chamadas, 8)
})

test('compra ou descadastro no meio para a sequência sem enviar', async () => {
  const banco = bancoWhatsapp()
  inserirSequenciaWhatsapp(banco, 'comprou-meio', 'comprou-meio@example.com', '11111110000', 3)
  inserirSequenciaWhatsapp(banco, 'saiu-meio', 'saiu-meio@example.com', '11222220000', 4)
  banco.exec(`
    INSERT INTO clientes (email) VALUES ('comprou-meio@example.com');
    INSERT INTO compras (cliente_id, stripe_session_id, status)
      VALUES (last_insert_rowid(), 'mp_comprou_meio', 'pago');
    INSERT INTO descadastros (email, canal)
      VALUES ('saiu-meio@example.com', 'whatsapp');
  `)
  let chamadas = 0
  const resultado = await executarWhatsapp(ambiente(new D1Local(banco)), {
    agora: meioDoDia,
    logger: loggerMudo,
    fetchImpl: async () => {
      chamadas += 1
      return envioOk()
    },
  })

  assert.deepEqual(resultado, { enviados: 0, ignorados: 2, apenasLog: 0 })
  assert.equal(chamadas, 0)
  assert.equal(
    banco.prepare(`
      SELECT COUNT(*) AS total FROM carrinhos
       WHERE id IN ('comprou-meio', 'saiu-meio') AND proximo_whatsapp_em IS NULL
    `).get().total,
    2
  )
})

test('falha em seguimento para sem repetir e mantém as etapas anteriores', async () => {
  const banco = bancoWhatsapp()
  inserirSequenciaWhatsapp(banco, 'falha-meio', 'falha-meio@example.com', '11999990000', 3)
  let chamadas = 0
  const opcoes = {
    agora: meioDoDia,
    logger: loggerMudo,
    fetchImpl: async () => {
      chamadas += 1
      return new Response('{}', { status: 500 })
    },
  }
  const db = new D1Local(banco)
  await executarWhatsapp(ambiente(db), opcoes)
  await executarWhatsapp(ambiente(db), opcoes)

  assert.equal(chamadas, 1)
  assert.deepEqual(
    { ...banco.prepare(`
      SELECT whatsapp_etapa, proximo_whatsapp_em,
             whatsapp_falhou_em IS NOT NULL AS falhou
        FROM carrinhos WHERE id = 'falha-meio'
    `).get() },
    { whatsapp_etapa: 3, proximo_whatsapp_em: null, falhou: 1 }
  )
  assert.equal(
    banco.prepare(`
      SELECT COUNT(*) AS total FROM lembretes_enviados
       WHERE carrinho_id = 'falha-meio' AND canal = 'whatsapp'
    `).get().total,
    3
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

test('limite de três soma seguimentos primeiro e primeiras mensagens depois', async () => {
  const banco = bancoWhatsapp()
  inserirSequenciaWhatsapp(banco, 's1', 's1@example.com', '11111110000', 2)
  inserirSequenciaWhatsapp(banco, 's2', 's2@example.com', '11222220000', 3)
  inserirCarrinho(banco, 'p1', 'p1@example.com', '11333330000')
  inserirCarrinho(banco, 'p2', 'p2@example.com', '11444440000')
  const ordem = []
  const resultado = await executarWhatsapp(ambiente(new D1Local(banco)), {
    agora: meioDoDia,
    logger: loggerMudo,
    fetchImpl: async (_url, opcoes) => {
      ordem.push(JSON.parse(opcoes.body).message)
      return envioOk()
    },
  })

  assert.equal(resultado.enviados, 3)
  assert.equal(ordem.length, 3)
  assert.ok(ordem[0].includes('carrinho-wa-3'))
  assert.ok(ordem[1].includes('carrinho-wa-4'))
  assert.ok(ordem[2].includes('carrinho-wa-1'))
  assert.equal(
    banco.prepare(`
      SELECT COUNT(*) AS total FROM carrinhos
       WHERE id IN ('p1', 'p2') AND whatsapp_etapa = 1
    `).get().total,
    1
  )
})

test('janela aceita somente carrinhos entre 1 e 48 horas', async () => {
  const banco = bancoWhatsapp()
  inserirCarrinho(banco, 'novo', 'novo@example.com', '11111110000', '-59 minutes')
  inserirCarrinho(banco, 'inicio', 'inicio@example.com', '11222220000', '-61 minutes')
  inserirCarrinho(banco, 'fim', 'fim@example.com', '11333330000', '-47 hours')
  inserirCarrinho(banco, 'antigo', 'antigo@example.com', '11444440000', '-49 hours')
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
