import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { assinaturaDescadastroValida } from '../../lib/lembrete-assinatura.js'
import {
  default as worker,
  executarRodada,
  mascararEmail,
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
  return banco
}

function carrinho(banco, id, email, modificador = '-2 hours', nome = null) {
  banco.prepare(`
    INSERT INTO carrinhos (id, email, nome, criado_em)
    VALUES (?, ?, ?, datetime('now', ?))`).run(id, email, nome, modificador)
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

test('Worker expõe somente 404 e mantém cron, D1 e variáveis do contrato', async () => {
  assert.equal((await worker.fetch()).status, 404)

  const configuracao = JSON.parse(
    readFileSync('workers/recuperacao-carrinho/wrangler.jsonc', 'utf8')
  )
  assert.deepEqual(configuracao.triggers.crons, ['*/10 * * * *'])
  assert.equal(configuracao.observability.enabled, true)
  assert.deepEqual(configuracao.d1_databases[0], {
    binding: 'DB',
    database_name: 'trilha-viva',
    database_id: '2dac1356-eb0b-432b-a3d2-1c5cbbb9c29c',
  })
  assert.deepEqual(configuracao.vars, {
    MODO: 'teste',
    TESTE_PARA: 'paulohenrique_ls@hotmail.com',
    LEMBRETE_BCC: 'trilhaviva.suporte@gmail.com',
    EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>',
    EMAIL_REPLY_TO: 'contato@trilhaviva.org',
    SITE_URL: 'https://trilhaviva.org',
    TETO_DIA: '40',
    TETO_MES: '1100',
  })
})

test('modo ativo aplica as condições a, b e c e monta o e-mail completo', async () => {
  const banco = bancoRobo()
  carrinho(banco, 'elegivel', 'elegivel@example.com', '-5 hours', '<Ana & Bia>')
  carrinho(banco, 'comprou', 'comprou@example.com', '-4 hours')
  carrinho(banco, 'repetido', 'repetido@example.com', '-3 hours')
  carrinho(banco, 'descadastrado', 'fora@example.com', '-2 hours')
  banco.exec(`
    INSERT INTO clientes (email, nome) VALUES ('comprou@example.com', 'Comprou');
    INSERT INTO compras (cliente_id, stripe_session_id, status)
      VALUES (last_insert_rowid(), 'mp_pago', 'pago');
    INSERT INTO carrinhos
      (id, email, criado_em, status, email_enviado_em)
      VALUES ('anterior', 'repetido@example.com', datetime('now', '-3 days'), 'lembrado', datetime('now'));
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

  assert.deepEqual(resultado, { enviados: 1, ignorados: 3, apenasLog: 0 })
  assert.equal(pedidos.length, 1)
  assert.equal(pedidos[0].url, 'https://api.resend.com/emails')
  assert.equal(pedidos[0].opcoes.headers['Idempotency-Key'], 'elegivel')
  const corpo = JSON.parse(pedidos[0].opcoes.body)
  assert.deepEqual(corpo.to, ['elegivel@example.com'])
  assert.deepEqual(corpo.bcc, ['bcc@example.com'])
  assert.equal(corpo.reply_to, 'contato@trilhaviva.org')
  assert.equal(corpo.subject, 'Seu acesso à Trilha Viva ficou pela metade')
  assert.match(corpo.html, /<table/)
  assert.match(corpo.html, /background:#C40F24/)
  assert.match(corpo.html, /Oi, &lt;Ana &amp; Bia&gt;!/)
  assert.doesNotMatch(corpo.html, /Oi, <Ana & Bia>!/)
  assert.match(corpo.text, /2\.000 multitracks gospel por R\$ 89,90/)
  assert.match(corpo.text, /utm_source=email&utm_medium=lembrete&utm_campaign=carrinho/)
  assert.equal(corpo.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')

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
  assert.equal(banco.prepare("SELECT status FROM carrinhos WHERE id = 'comprou'").get().status, 'ignorado')
  assert.equal(banco.prepare("SELECT status FROM carrinhos WHERE id = 'repetido'").get().status, 'ignorado')
  assert.equal(banco.prepare("SELECT status FROM carrinhos WHERE id = 'descadastrado'").get().status, 'ignorado')
})

test('modo teste só envia ao endereço permitido, mascara o log e não ignora carrinho antigo', async () => {
  const banco = bancoRobo()
  carrinho(banco, 'permitido', 'teste@example.com', '-3 hours')
  carrinho(banco, 'bloqueado', 'cliente.secreto@example.com', '-2 hours')
  carrinho(banco, 'antigo', 'antigo@example.com', '-60 hours')
  const logs = []
  const resultado = await executarRodada(env(new D1Local(banco), { MODO: 'teste' }), {
    fetchImpl: envioOk,
    logger: { log: (mensagem) => logs.push(mensagem), error() {} },
  })

  assert.deepEqual(resultado, { enviados: 1, ignorados: 0, apenasLog: 1 })
  assert.equal(banco.prepare("SELECT status FROM carrinhos WHERE id = 'bloqueado'").get().status, 'aberto')
  assert.equal(banco.prepare("SELECT status FROM carrinhos WHERE id = 'antigo'").get().status, 'aberto')
  assert.equal(logs.length, 1)
  assert.match(logs[0], /c\*\*\*@e\*\*\*\.com/)
  assert.doesNotMatch(logs[0], /cliente\.secreto@example\.com/)
  assert.equal(mascararEmail('Pessoa@Dominio.com'), 'p***@d***.com')
})

test('tetos param a rodada antes e também no meio da lista', async () => {
  const bancoCheio = bancoRobo()
  carrinho(bancoCheio, 'esperando', 'esperando@example.com')
  bancoCheio.exec(`
    INSERT INTO carrinhos (id, email, criado_em, status, email_enviado_em)
    VALUES ('ja-enviado', 'ja@example.com', datetime('now', '-2 hours'), 'lembrado', datetime('now'))
  `)
  let chamadas = 0
  const parado = await executarRodada(env(new D1Local(bancoCheio), { TETO_DIA: '1' }), {
    fetchImpl: async () => { chamadas += 1; return envioOk() },
    logger: loggerMudo,
  })
  assert.equal(parado.enviados, 0)
  assert.equal(chamadas, 0)
  assert.equal(bancoCheio.prepare("SELECT status FROM carrinhos WHERE id = 'esperando'").get().status, 'aberto')

  const bancoMeio = bancoRobo()
  carrinho(bancoMeio, 'primeiro', 'primeiro@example.com', '-3 hours')
  carrinho(bancoMeio, 'segundo', 'segundo@example.com', '-2 hours')
  const meio = await executarRodada(env(new D1Local(bancoMeio), { TETO_MES: '1' }), {
    fetchImpl: envioOk,
    logger: loggerMudo,
  })
  assert.equal(meio.enviados, 1)
  assert.equal(bancoMeio.prepare("SELECT status FROM carrinhos WHERE id = 'primeiro'").get().status, 'lembrado')
  assert.equal(bancoMeio.prepare("SELECT status FROM carrinhos WHERE id = 'segundo'").get().status, 'aberto')
})

test('reserva concorrente deixa somente um envio para o mesmo e-mail', async () => {
  const banco = bancoRobo()
  carrinho(banco, 'um', 'mesmo@example.com', '-3 hours')
  carrinho(banco, 'dois', 'mesmo@example.com', '-2 hours')
  const db = new D1Local(banco)
  let envios = 0
  let liberar
  const espera = new Promise((resolve) => { liberar = resolve })
  const fetchImpl = async () => {
    envios += 1
    if (envios === 1) await espera
    return envioOk()
  }

  const rodada1 = executarRodada(env(db), { fetchImpl, logger: loggerMudo })
  const rodada2 = executarRodada(env(db), { fetchImpl, logger: loggerMudo })
  await new Promise((resolve) => setImmediate(resolve))
  liberar()
  await Promise.all([rodada1, rodada2])

  assert.equal(envios, 1)
  assert.equal(
    banco.prepare("SELECT COUNT(*) AS total FROM carrinhos WHERE email_enviado_em IS NOT NULL").get().total,
    1
  )
})

test('falha de envio ignora e limpa a reserva sem parar os outros carrinhos', async () => {
  const banco = bancoRobo()
  carrinho(banco, 'falha', 'falha@example.com', '-3 hours')
  carrinho(banco, 'sucesso', 'sucesso@example.com', '-2 hours')
  let chamada = 0
  const resultado = await executarRodada(env(new D1Local(banco)), {
    logger: loggerMudo,
    fetchImpl: async () => {
      chamada += 1
      return new Response('{}', { status: chamada === 1 ? 500 : 200 })
    },
  })

  assert.equal(chamada, 2)
  assert.equal(resultado.enviados, 1)
  assert.deepEqual(
    {
      ...banco.prepare(
        "SELECT status, email_enviado_em FROM carrinhos WHERE id = 'falha'"
      ).get(),
    },
    { status: 'ignorado', email_enviado_em: null }
  )
  assert.equal(banco.prepare("SELECT status FROM carrinhos WHERE id = 'sucesso'").get().status, 'lembrado')
})
