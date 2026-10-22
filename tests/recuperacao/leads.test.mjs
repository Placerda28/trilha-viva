import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { executarRodada } from '../../workers/recuperacao-carrinho/index.js'
import { assinaturaDescadastroValida } from '../../lib/lembrete-assinatura.js'
import { destaques } from '../../lib/catalog.js'

function montar() {
  const banco = new DatabaseSync(':memory:')
  for (const arquivo of ['0000_esquema_atual', '0004_carrinhos', '0005_recuperacao_v2',
    '0006_whatsapp', '0013_testes', '0017_leads']) {
    banco.exec(readFileSync(`migrations/${arquivo}.sql`, 'utf8'))
  }
  const db = { prepare(sql) {
    const q = banco.prepare(sql)
    let valores = []
    return {
      bind(...v) { valores = v; return this },
      async all() { return { results: q.all(...valores) } },
      async first() { return q.get(...valores) || null },
      async run() { return { meta: { changes: q.run(...valores).changes } } },
    }
  } }
  const env = { DB: db, MODO: 'ativo', RESEND_API_KEY: 'teste', LEMBRETE_SEGREDO: 'segredo',
    EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>', EMAIL_REPLY_TO: 'contato@trilhaviva.org',
    SITE_URL: 'https://trilhaviva.org', LEMBRETE_BCC: 'bcc@example.com' }
  const mensagens = []
  const opcoes = { logger: { log() {}, error() {} }, fetchImpl: async (url, opcoes) => {
    assert.equal(url, 'https://api.resend.com/emails')
    mensagens.push({ ...JSON.parse(opcoes.body), chave: opcoes.headers['Idempotency-Key'] })
    return Response.json({ id: 'envio' })
  } }
  const inserir = (id, etapa = 0) => banco.prepare(`INSERT INTO leads
    (id, nome, email, whatsapp, consentimento, consentimento_em, token_hash, token_expira_em, etapa_email, proximo_email_em)
    VALUES (?, '<Ana>', ?, '27999999999', 1, datetime('now', '-7 days'), ?, datetime('now'), ?, datetime('now', '-1 minute'))`)
    .run(id, `ana${id}@example.com`, `hash${id}`, etapa)
  const lead = (id = 1) => banco.prepare('SELECT * FROM leads WHERE id = ?').get(id)
  const rodar = () => executarRodada(env, opcoes)
  return { banco, env, opcoes, mensagens, inserir, lead, rodar }
}

test('cron lê no máximo 20 leads por rodada e deixa o restante para depois', async () => {
  const s = montar()
  for (let id = 1; id <= 21; id++) s.inserir(id)
  await s.rodar()
  assert.equal(s.mensagens.length, 20)
  assert.equal(s.lead(20).etapa_email, 1)
  assert.equal(s.lead(21).etapa_email, 0)
})

test('cron avança 1→2→3→4, agenda desde o consentimento em UTC e para', async () => {
  const s = montar()
  s.inserir(1)
  for (const [etapa, dias] of [[1, 2], [2, 4], [3, 7], [4, null]]) {
    await s.rodar()
    const l = s.lead()
    assert.equal(l.etapa_email, etapa)
    assert.equal(l.envios, etapa)
    assert.ok(l.ultimo_envio_em)
    if (dias === null) assert.equal(l.proximo_email_em, null)
    else assert.equal(Date.parse(l.proximo_email_em + 'Z') - Date.parse(l.consentimento_em + 'Z'), dias * 86400000)
  }
  await s.rodar()
  assert.equal(s.mensagens.length, 4)
  for (const m of s.mensagens) {
    assert.equal(m.bcc, undefined)
    assert.equal(m.reply_to, 'contato@trilhaviva.org')
    assert.match(m.html, /&lt;Ana&gt;/)
    assert.doesNotMatch(m.text, /baixar\?t=/)
    assert.equal(m.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
    const url = new URL(m.headers['List-Unsubscribe'].slice(1, -1))
    assert.equal(url.searchParams.get('tipo'), 'lead')
    assert.equal(await assinaturaDescadastroValida('lead:ana1@example.com', url.searchParams.get('t'), 'segredo'), true)
    assert.ok(m.text.includes(url.href))
  }
  assert.match(s.mensagens[0].text, /Se perdeu o link, peça de novo/)
  assert.match(s.mensagens[1].text, /clique e guia/)
  assert.match(s.mensagens[2].text, /R\$ 89,90/)
  assert.match(s.mensagens[2].text, /R\$ 899,00/)
  assert.match(s.mensagens[2].text, /assinar\?utm_source=email&utm_medium=lead&utm_campaign=vs-gratis-3/)
  const slugs = [...s.mensagens[2].text.matchAll(/https:\/\/trilhaviva.org\/musicas\/([^\s]+)/g)].map((m) => m[1])
  assert.equal(new Set(slugs).size, 5)
  assert.ok(slugs.every((slug) => destaques.some((m) => m.slug === slug)))
  assert.equal(new Set(s.mensagens.map((m) => m.chave)).size, 4)
})

test('pula descadastro, falta de consentimento, data futura e compra real; compra de teste não bloqueia', async () => {
  const s = montar()
  for (let id = 1; id <= 7; id++) s.inserir(id)
  s.banco.exec(`UPDATE leads SET descadastrado = 1 WHERE id = 1;
    UPDATE leads SET consentimento = 0 WHERE id = 2;
    UPDATE leads SET proximo_email_em = datetime('now', '+1 hour') WHERE id = 3;
    UPDATE leads SET comprou = 1 WHERE id = 4;
    INSERT INTO clientes (id, email) VALUES (5, 'ana5@example.com'), (6, 'ana6@example.com'), (7, 'ana7@example.com');
    INSERT INTO compras (cliente_id, stripe_session_id, status, teste) VALUES
      (5, 'real', 'pago', 0), (6, 'teste', 'pago', 1), (7, 'pendente', 'pendente', 0);`)
  await s.rodar()
  assert.deepEqual(s.mensagens.map((m) => m.to[0]), ['ana6@example.com', 'ana7@example.com'])
  assert.equal(s.lead(5).comprou, 1)
  assert.ok(s.lead(5).comprou_em)
  assert.equal(s.lead(5).proximo_email_em, null)
  assert.equal(s.lead(5).envios, 0)
})

test('falha de envio mantém etapa e contagem; nova tentativa usa a mesma chave', async () => {
  const s = montar()
  s.inserir(1, 1)
  let chave
  const envio = s.opcoes.fetchImpl
  s.opcoes.fetchImpl = async (_url, opcoes) => { chave = opcoes.headers['Idempotency-Key']; throw Error('rede') }
  await s.rodar()
  assert.equal(s.lead().etapa_email, 1)
  assert.equal(s.lead().envios, 0)
  assert.ok(s.lead().proximo_email_em)
  s.banco.exec("UPDATE leads SET proximo_email_em = datetime('now', '-1 minute')")
  s.opcoes.fetchImpl = envio
  await s.rodar()
  assert.equal(s.mensagens[0].chave, chave)
  assert.equal(s.lead().etapa_email, 2)
})

test('modo teste só envia a TESTE_PARA e rodadas concorrentes não duplicam', async () => {
  const s = montar()
  s.inserir(1)
  s.inserir(2)
  s.env.MODO = 'teste'
  s.env.TESTE_PARA = 'ana1@example.com'
  await Promise.all([s.rodar(), s.rodar()])
  assert.equal(s.mensagens.length, 1)
  assert.equal(s.lead(2).etapa_email, 0)
})

test('conclusão do envio não reativa descadastro nem sobrescreve recadastro concorrente', async () => {
  for (const recadastro of [false, true]) {
    const s = montar()
    s.inserir(1, 1)
    s.opcoes.fetchImpl = async () => {
      s.banco.exec(recadastro
        ? "UPDATE leads SET token_hash = 'novo-token', etapa_email = 0, proximo_email_em = datetime('now', '+10 minutes')"
        : 'UPDATE leads SET descadastrado = 1, proximo_email_em = NULL')
      return Response.json({ id: 'envio' })
    }
    await s.rodar()
    if (recadastro) {
      assert.equal(s.lead().token_hash, 'novo-token')
      assert.equal(s.lead().etapa_email, 0)
      assert.equal(s.lead().envios, 1)
    } else {
      assert.equal(s.lead().proximo_email_em, null)
      assert.equal(s.lead().envios, 1)
    }
  }
})
