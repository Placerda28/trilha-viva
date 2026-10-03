import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { assinaturaDescadastroValida } from '../../lib/lembrete-assinatura.js'
import {
  default as worker,
  executarRodada,
  mascararEmail,
  montarEmail,
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

function bancoRobo() {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0000_esquema_atual.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0004_carrinhos.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0005_recuperacao_v2.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0006_whatsapp.sql', 'utf8'))
  return banco
}

function carrinho(banco, id, email, modificador = '-2 hours', nome = null) {
  banco.prepare(`
    INSERT INTO carrinhos (id, email, nome, criado_em)
    VALUES (?, ?, ?, datetime('now', ?))`).run(id, email, nome, modificador)
}

function protocolo(banco, id, email, etapa = 1, modificador = '-1 minute') {
  banco.prepare(`
    INSERT INTO carrinhos
      (id, email, criado_em, status, email_enviado_em, etapa_email, proximo_email_em)
    VALUES (?, ?, datetime('now', '-40 days'), 'lembrado', datetime('now', '-39 days'), ?, datetime('now', ?))
  `).run(id, email, etapa, modificador)
  const inserir = banco.prepare(`
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em)
    VALUES (?, 'email', ?, datetime('now', ?))`)
  for (let numero = 1; numero <= etapa; numero += 1) {
    inserir.run(id, numero, `-${40 - numero} days`)
  }
}

function env(db, extras = {}) {
  return {
    DB: db,
    MODO: 'ativo',
    TESTE_PARA: 'teste@example.com',
    LEMBRETE_BCC: 'bcc@example.com',
    EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>',
    EMAIL_REPLY_TO: 'contato@trilhaviva.org',
    SITE_URL: 'https://trilhaviva.org',
    TETO_DIA: '40',
    TETO_MES: '1100',
    RESEND_API_KEY: 'resend_apenas_teste',
    LEMBRETE_SEGREDO: 'segredo-apenas-de-teste',
    ...extras,
  }
}

const loggerMudo = { log() {}, error() {} }
const envioOk = async () => new Response('{}', { status: 200 })

function diferencaDias(banco, id) {
  return banco.prepare(`
    SELECT ROUND(julianday(proximo_email_em) - julianday('now'), 3) AS dias
      FROM carrinhos WHERE id = ?`).get(id).dias
}

test('Worker expõe somente 404 e mantém cron, D1 e variáveis do contrato', async () => {
  // O robô só atende o webhook do WhatsApp (/whatsapp); o resto é 404.
  assert.equal((await worker.fetch(new Request('https://robo.example/'), {})).status, 404)
  assert.equal((await worker.fetch(new Request('https://robo.example/whatsapp'), {})).status, 404)

  const configuracao = JSON.parse(
    readFileSync('workers/recuperacao-carrinho/wrangler.jsonc', 'utf8')
  )
  assert.deepEqual(configuracao.triggers.crons, ['*/10 * * * *'])
  assert.equal(configuracao.observability.enabled, true)
  assert.equal(configuracao.d1_databases[0].binding, 'DB')
  assert.equal(configuracao.vars.TETO_DIA, '40')
  assert.equal(configuracao.vars.TETO_MES, '1100')
  assert.equal(configuracao.vars.WA_MODO, 'teste')
  assert.equal(configuracao.vars.WA_TETO_DIA, '30')
  assert.equal(configuracao.vars.WA_TEMPLATE, 'carrinho_lembrete')
  assert.equal(configuracao.vars.WA_PHONE_NUMBER_ID, '1463806263472529')
})

test('e-mail 1 mantém conteúdo, bloqueios e dados do envio atual', async () => {
  const banco = bancoRobo()
  carrinho(banco, 'elegivel', 'elegivel@example.com', '-5 hours', '<Ana & Bia>')
  carrinho(banco, 'comprou', 'comprou@example.com', '-4 hours')
  carrinho(banco, 'repetido', 'repetido@example.com', '-3 hours')
  carrinho(banco, 'descadastrado', 'fora@example.com', '-2 hours')
  protocolo(banco, 'anterior', 'repetido@example.com', 1, '+7 days')
  banco.exec(`
    INSERT INTO clientes (email, nome) VALUES ('comprou@example.com', 'Comprou');
    INSERT INTO compras (cliente_id, stripe_session_id, status)
      VALUES (last_insert_rowid(), 'mp_pago', 'pago');
    INSERT INTO descadastros (email) VALUES ('fora@example.com');
  `)

  const pedidos = []
  const resultado = await executarRodada(env(new D1Local(banco)), {
    logger: loggerMudo,
    fetchImpl: async (url, opcoes) => {
      pedidos.push({ url, opcoes })
      return envioOk()
    },
  })

  assert.deepEqual(resultado, {
    enviados: 1,
    ignorados: 3,
    apenasLog: 0,
    whatsapp: { enviados: 0, ignorados: 0, falhas: 0 },
  })
  assert.equal(pedidos.length, 1)
  assert.equal(pedidos[0].url, 'https://api.resend.com/emails')
  assert.equal(pedidos[0].opcoes.headers['Idempotency-Key'], 'elegivel:email:1')
  const corpo = JSON.parse(pedidos[0].opcoes.body)
  assert.equal(corpo.subject, 'Seu acesso à Trilha Viva ficou pela metade')
  assert.match(corpo.html, /Oi, &lt;Ana &amp; Bia&gt;!/)
  assert.match(corpo.text, /2\.000 multitracks gospel por R\$ 89,90/)
  assert.match(corpo.text, /utm_campaign=carrinho(?:\s|$)/)
  assert.equal(corpo.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  assert.equal(diferencaDias(banco, 'elegivel'), 7)

  const linkDescadastro = corpo.headers['List-Unsubscribe'].slice(1, -1)
  const urlDescadastro = new URL(linkDescadastro)
  assert.equal(
    await assinaturaDescadastroValida(
      urlDescadastro.searchParams.get('e'),
      urlDescadastro.searchParams.get('t'),
      'segredo-apenas-de-teste'
    ),
    true
  )
  for (const id of ['comprou', 'repetido', 'descadastrado']) {
    assert.equal(banco.prepare('SELECT status FROM carrinhos WHERE id = ?').get(id).status, 'ignorado')
  }
})

test('seguimento avança 2, 3 e 4 com os prazos certos e depois encerra', async () => {
  const banco = bancoRobo()
  carrinho(banco, 'sequencia', 'sequencia@example.com', '-2 hours')
  const db = new D1Local(banco)
  const pedidos = []
  const opcoes = {
    logger: loggerMudo,
    fetchImpl: async (_url, dados) => {
      pedidos.push(dados)
      return envioOk()
    },
  }

  await executarRodada(env(db), opcoes)
  assert.equal(banco.prepare("SELECT etapa_email FROM carrinhos WHERE id = 'sequencia'").get().etapa_email, 1)
  assert.equal(diferencaDias(banco, 'sequencia'), 7)

  const prazos = [[2, 15], [3, 30], [4, 30]]
  for (const [etapa, dias] of prazos) {
    banco.exec("UPDATE carrinhos SET proximo_email_em = datetime('now', '-1 minute') WHERE id = 'sequencia'")
    await executarRodada(env(db), opcoes)
    assert.equal(banco.prepare("SELECT etapa_email FROM carrinhos WHERE id = 'sequencia'").get().etapa_email, etapa)
    assert.equal(diferencaDias(banco, 'sequencia'), dias)
  }

  banco.exec("UPDATE carrinhos SET proximo_email_em = datetime('now', '-1 minute') WHERE id = 'sequencia'")
  await executarRodada(env(db), opcoes)
  assert.deepEqual(
    { ...banco.prepare("SELECT etapa_email, finalizado_motivo FROM carrinhos WHERE id = 'sequencia'").get() },
    { etapa_email: 4, finalizado_motivo: 'sequencia' }
  )
  assert.deepEqual(
    pedidos.map((pedido) => pedido.headers['Idempotency-Key']),
    ['sequencia:email:1', 'sequencia:email:2', 'sequencia:email:3', 'sequencia:email:4']
  )
})

test('compra e descadastro no meio encerram com o motivo correto', async () => {
  const banco = bancoRobo()
  protocolo(banco, 'comprou', 'comprou@example.com')
  protocolo(banco, 'saiu', 'saiu@example.com')
  banco.exec(`
    INSERT INTO clientes (email) VALUES ('comprou@example.com');
    INSERT INTO compras (cliente_id, stripe_session_id, status)
      VALUES (last_insert_rowid(), 'mp_comprou', 'pago');
    INSERT INTO descadastros (email) VALUES ('saiu@example.com');
  `)

  const resultado = await executarRodada(env(new D1Local(banco)), {
    logger: loggerMudo,
    fetchImpl: envioOk,
  })
  assert.equal(resultado.enviados, 0)
  assert.deepEqual(
    banco.prepare('SELECT id, finalizado_motivo FROM carrinhos ORDER BY id').all().map((linha) => ({ ...linha })),
    [
      { id: 'comprou', finalizado_motivo: 'comprou' },
      { id: 'saiu', finalizado_motivo: 'descadastro' },
    ]
  )
})

test('teto conta todos os e-mails, inclusive seguimentos', async () => {
  const banco = bancoRobo()
  protocolo(banco, 'anterior', 'anterior@example.com', 2, '+10 days')
  banco.exec(`
    UPDATE lembretes_enviados SET enviado_em = datetime('now')
     WHERE carrinho_id = 'anterior' AND etapa = 2
  `)
  carrinho(banco, 'esperando', 'esperando@example.com')
  let chamadas = 0
  const resultado = await executarRodada(env(new D1Local(banco), { TETO_DIA: '1' }), {
    logger: loggerMudo,
    fetchImpl: async () => { chamadas += 1; return envioOk() },
  })
  assert.equal(resultado.enviados, 0)
  assert.equal(chamadas, 0)
  assert.equal(banco.prepare("SELECT status FROM carrinhos WHERE id = 'esperando'").get().status, 'aberto')
})

test('falha no seguimento apaga a reserva, adia um dia e não avança', async () => {
  const banco = bancoRobo()
  protocolo(banco, 'falha', 'falha@example.com')
  await executarRodada(env(new D1Local(banco)), {
    logger: loggerMudo,
    fetchImpl: async () => new Response('{}', { status: 500 }),
  })

  const linha = banco.prepare(`
    SELECT etapa_email,
           ROUND(julianday(proximo_email_em) - julianday('now'), 3) AS dias
      FROM carrinhos WHERE id = 'falha'`).get()
  assert.equal(linha.etapa_email, 1)
  assert.equal(linha.dias, 1)
  assert.equal(
    banco.prepare("SELECT COUNT(*) AS total FROM lembretes_enviados WHERE carrinho_id = 'falha'").get().total,
    1
  )
})

test('modo teste não altera protocolos de outros e-mails', async () => {
  const banco = bancoRobo()
  protocolo(banco, 'outro', 'cliente.secreto@example.com')
  const antes = { ...banco.prepare("SELECT * FROM carrinhos WHERE id = 'outro'").get() }
  const logs = []
  const resultado = await executarRodada(env(new D1Local(banco), { MODO: 'teste' }), {
    fetchImpl: envioOk,
    logger: { log: (mensagem) => logs.push(mensagem), error() {} },
  })

  assert.deepEqual({ ...banco.prepare("SELECT * FROM carrinhos WHERE id = 'outro'").get() }, antes)
  assert.deepEqual(resultado, {
    enviados: 0,
    ignorados: 0,
    apenasLog: 1,
    whatsapp: { enviados: 0, ignorados: 0, falhas: 0 },
  })
  assert.match(logs[0], /c\*\*\*@e\*\*\*\.com/)
  assert.doesNotMatch(logs[0], /cliente\.secreto@example\.com/)
  assert.equal(mascararEmail('Pessoa@Dominio.com'), 'p***@d***.com')
})

test('carrinho novo de quem já está no protocolo fica ignorado', async () => {
  const banco = bancoRobo()
  protocolo(banco, 'protocolo', 'mesma@example.com', 1, '+7 days')
  carrinho(banco, 'novo', 'mesma@example.com')
  const resultado = await executarRodada(env(new D1Local(banco)), {
    logger: loggerMudo,
    fetchImpl: envioOk,
  })
  assert.equal(resultado.ignorados, 1)
  assert.equal(banco.prepare("SELECT status FROM carrinhos WHERE id = 'novo'").get().status, 'ignorado')
})

test('assuntos e textos das quatro etapas seguem a especificação', async () => {
  const ambiente = env(null)
  const carrinhoEmail = { id: 'abc', email: 'pessoa@example.com', nome: 'Ana' }
  const esperados = [
    ['Seu acesso à Trilha Viva ficou pela metade', 'Vai mesmo desperdiçar essa oferta?'],
    ['Seu acervo de multitracks ainda está esperando', 'Faz uma semana que você começou a liberar o seu acesso à Trilha Viva e a compra não foi concluída.'],
    ['Ensaio mais tranquilo para o seu ministério', 'Com as multitracks, a banda inteira ensaia com a mesma referência: clique, guia e cada instrumento no seu canal.'],
    ['Último lembrete sobre o seu acesso à Trilha Viva', 'Depois deste, não mandamos mais lembretes.'],
  ]

  for (let etapa = 1; etapa <= 4; etapa += 1) {
    const email = await montarEmail(carrinhoEmail, ambiente, etapa)
    assert.equal(email.subject, esperados[etapa - 1][0])
    assert.match(email.text, new RegExp(esperados[etapa - 1][1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(email.text, /Pix ou cartão, acesso liberado na hora\./)
    assert.match(email.text, new RegExp(`utm_campaign=${etapa === 1 ? 'carrinho' : `carrinho-${etapa}`}`))
  }
})
