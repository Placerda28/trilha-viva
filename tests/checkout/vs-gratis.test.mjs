import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'

registerHooks({ resolve(nome, contexto, proximo) {
  if (nome === 'next/headers') return { shortCircuit: true,
    url: 'data:text/javascript,export function cookies() { throw new Error("Não deve exigir login") }' }
  if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
  return proximo(nome, contexto)
} })
const { gravarLead, reservarCadastro, responderCadastroLead, responderDownloadLead, marcarLeadComprou } = await import('../../lib/leads.js')
const { linkDescadastroLead, responderDescadastro } = await import('../../lib/descadastro.js')
const { assinarDescadastro } = await import('../../lib/lembrete-assinatura.js')

function montar() {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0017_leads.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0004_carrinhos.sql', 'utf8'))
  banco.exec(`CREATE TABLE compras (stripe_session_id TEXT, status TEXT, teste INTEGER);
    INSERT INTO compras VALUES ('mp_1', 'pago', 0), ('mp_2', 'pago', 1);`)
  const db = { prepare(sql) {
    const consulta = banco.prepare(sql)
    let valores = []
    return {
      bind(...v) { valores = v; return this },
      async first() { return consulta.get(...valores) || null },
      async run() { return { meta: { changes: consulta.run(...valores).changes } } },
    }
  } }
  return { banco, db }
}
const dados = { nome: ' Ana ', email: ' ANA@example.COM ', whatsapp: '+55 (27) 99999-9999', consentimento: true,
  utm_source: 'Google', utm_medium: 'Organic', utm_campaign: 'VS gratis', pagina_entrada: '/vs-gratis' }
const req = (corpo = dados, headers = {}) => new Request('https://trilhaviva.org/api/vs-gratis', {
  method: 'POST', headers: { host: 'trilhaviva.org', 'cf-connecting-ip': '192.0.2.1', ...headers }, body: JSON.stringify(corpo),
})
const cadastro = (db, corpo, extra = {}) => responderCadastroLead(req(corpo), { db, ambiente: 'development', ...extra })
const lead = (banco) => banco.prepare('SELECT * FROM leads').get()
const download = (db, link, extra = {}) => responderDownloadLead(new Request('https://trilhaviva.org' + link), {
  db, arquivosDe: async (slug) => {
    assert.equal(slug, 'a-alegria-o-exercito-de-deus-caiam-por-terra-autoridade-e-poder-morada')
    return ['Morada/VS.zip', 'outro.zip']
  }, linkDeDownload: async (...args) => {
    assert.deepEqual(args, ['Morada/VS.zip', 'VS.zip', 300])
    return 'https://b2.example/arquivo'
  }, ...extra,
})

test('formulário valida tipos, nome, e-mail, WhatsApp e consentimento antes de gravar', async () => {
  const { db, banco } = montar()
  for (const campo of [{ nome: '' }, { nome: {} }, { email: 'errado' }, { email: 'a@@b.com' },
    { whatsapp: '' }, { whatsapp: '123' }, { consentimento: false }, { consentimento: 'true' }, { utm_source: {} }]) {
    const r = await cadastro(db, { ...dados, ...campo })
    assert.equal(r.status, 400)
    assert.equal((await r.json()).ok, false)
  }
  assert.equal(lead(banco), undefined)
  const r = await cadastro(db, { ...dados, nome: 'a'.repeat(90) })
  assert.equal(r.status, 200)
  assert.equal((await r.json()).nome.length, 80)
})

test('mesmo e-mail atualiza sem duplicar; token tem só hash, dura sete dias e agenda etapa zero', async () => {
  const { db, banco } = montar()
  const primeiro = await gravarLead(db, dados)
  const token = new URL('https://x' + primeiro.link).searchParams.get('t')
  const l = lead(banco)
  assert.equal(l.email, 'ana@example.com')
  assert.equal(l.whatsapp, '27999999999')
  assert.equal(l.origem, 'google')
  assert.equal(l.meio, 'organic')
  assert.equal(l.campanha, 'vsgratis')
  assert.equal(l.token_hash, createHash('sha256').update(token).digest('hex'))
  assert.equal(Date.parse(l.token_expira_em + 'Z') - Date.parse(l.consentimento_em + 'Z'), 7 * 86400000)
  assert.equal(l.proximo_email_em, l.consentimento_em)
  assert.equal(l.etapa_email, 0)
  const segundo = await gravarLead(db, { ...dados, nome: 'Ana Silva' })
  assert.notEqual(segundo.link, primeiro.link)
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM leads').get().n, 1)
  assert.equal(lead(banco).nome, 'Ana Silva')
  assert.equal((await download(db, primeiro.link)).headers.get('location'), '/vs-gratis?link=vencido')
})

test('recadastro sem UTM mantém a origem; quem já comprou não volta para a sequência', async () => {
  const { db, banco } = montar()
  await gravarLead(db, dados)
  await gravarLead(db, { ...dados, utm_source: '', utm_medium: '', utm_campaign: '' })
  assert.equal(lead(banco).origem, 'google')
  assert.equal(lead(banco).campanha, 'vsgratis')
  banco.exec("UPDATE leads SET comprou = 1, etapa_email = 2, proximo_email_em = NULL")
  await gravarLead(db, dados)
  assert.equal(lead(banco).proximo_email_em, null)
  assert.equal(lead(banco).etapa_email, 2)
})

test('freio aceita só cinco pedidos concorrentes por hora e limpa tentativas antigas', async () => {
  const { db, banco } = montar()
  const resultados = await Promise.all(Array.from({ length: 8 }, () => reservarCadastro(db, '192.0.2.1')))
  assert.equal(resultados.filter(Boolean).length, 5)
  assert.equal((await cadastro(db, dados)).status, 429)
  assert.equal(await reservarCadastro(db, '192.0.2.2'), true)
  banco.exec("UPDATE leads_tentativas SET criado_em = datetime('now', '-61 minutes')")
  assert.equal(await reservarCadastro(db, '192.0.2.1'), true)
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM leads_tentativas').get().n, 1)
})

test('Turnstile falha fechado em produção; só desenvolvimento dispensa chave; mesma origem obrigatória', async () => {
  const { db } = montar()
  assert.equal((await cadastro(db, dados, { ambiente: 'production' })).status, 503)
  assert.equal((await cadastro(db, dados, { segredo: 'teste' })).status, 400)
  const corpo = { ...dados, turnstile: 'token-teste' }
  const resposta = (success, hostname = 'trilhaviva.org') => async (url, opcoes) => {
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
    assert.equal(opcoes.body.get('secret'), 'teste')
    assert.equal(opcoes.body.get('remoteip'), '192.0.2.1')
    return Response.json({ success, hostname })
  }
  for (const buscar of [resposta(false), resposta(true, 'outro.org')]) {
    assert.equal((await cadastro(db, corpo, { segredo: 'teste', buscar })).status, 400)
  }
  assert.equal((await cadastro(db, corpo, { segredo: 'teste', buscar: async () => { throw Error('rede') } })).status, 503)
  assert.equal((await cadastro(db, corpo, { segredo: 'teste', buscar: resposta(true), ambiente: 'production' })).status, 200)
  assert.equal((await responderCadastroLead(req(dados, { origin: 'https://outro.org' }), { db })).status, 403)
})

test('três downloads concorrentes passam; quarto bloqueia, sem exigir login ou cota', async () => {
  const { db, banco } = montar()
  const { link } = await gravarLead(db, dados)
  const respostas = await Promise.all(Array.from({ length: 6 }, () => download(db, link)))
  assert.equal(respostas.filter((r) => r.headers.get('location') === 'https://b2.example/arquivo').length, 3)
  assert.equal(lead(banco).downloads, 3)
  assert.ok(lead(banco).primeiro_download_em)
  const r = await download(db, link)
  assert.equal(r.status, 302)
  assert.equal(r.headers.get('location'), '/vs-gratis?link=esgotado')
  assert.match(r.headers.get('cache-control'), /no-store/)
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer')
  const primeiro = lead(banco).primeiro_download_em
  await gravarLead(db, dados)
  assert.equal(lead(banco).downloads, 0)
  assert.equal(lead(banco).primeiro_download_em, primeiro)
})

test('token vencido/ausente é recusado; falha B2 não gasta download', async () => {
  const { db, banco } = montar()
  const { link } = await gravarLead(db, dados)
  assert.equal((await download(db, link, { linkDeDownload: async () => null })).status, 503)
  assert.equal(lead(banco).downloads, 0)
  banco.exec("UPDATE leads SET token_expira_em = datetime('now')")
  for (const caminho of [link, '/vs-gratis/baixar', '/vs-gratis/baixar?t=forjado']) {
    assert.equal((await download(db, caminho)).headers.get('location'), '/vs-gratis?link=vencido')
  }
})

test('descadastro de lead assinado aceita One-Click; GET não cancela; assinatura do carrinho não serve', async () => {
  const { db, banco } = montar()
  await gravarLead(db, dados)
  const segredo = 'teste'
  const link = await linkDescadastroLead(dados.email, segredo)
  const pedir = (method, caminho = link) => responderDescadastro(new Request('https://trilhaviva.org' + caminho, {
    method, ...(method === 'POST' ? { body: 'List-Unsubscribe=One-Click' } : {}),
  }), { db, segredo })
  assert.equal((await pedir('GET')).status, 200)
  assert.equal(lead(banco).descadastrado, 0)
  assert.equal((await pedir('POST')).status, 200)
  assert.equal((await pedir('POST')).status, 200)
  assert.equal(lead(banco).descadastrado, 1)
  assert.equal(lead(banco).proximo_email_em, null)
  const assinatura = await assinarDescadastro(dados.email, segredo)
  assert.equal((await pedir('POST', `/api/descadastrar?tipo=lead&e=ana@example.com&t=${assinatura}`)).status, 400)
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM descadastros').get().n, 0)
  assert.equal((await cadastro(db, { ...dados, consentimento: false })).status, 400)
  await assert.rejects(gravarLead(db, { ...dados, consentimento: false }))
  assert.equal(lead(banco).descadastrado, 1)
  banco.exec("UPDATE leads SET consentimento_em = '2000-01-01 00:00:00'")
  assert.equal((await cadastro(db, dados)).status, 200)
  assert.equal(lead(banco).descadastrado, 0)
  assert.notEqual(lead(banco).consentimento_em, '2000-01-01 00:00:00')
})

test('compra real marca o lead e para agendamento; teste não marca', async () => {
  const { db, banco } = montar()
  await gravarLead(db, dados)
  await marcarLeadComprou(db, dados.email, true, 'mp_1')
  await marcarLeadComprou(db, dados.email, false, 'mp_2')
  assert.equal(lead(banco).comprou, 0)
  await marcarLeadComprou(db, dados.email, false, 'mp_1')
  assert.equal(lead(banco).comprou, 1)
  assert.ok(lead(banco).comprou_em)
  assert.equal(lead(banco).proximo_email_em, null)
})
