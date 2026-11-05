import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { D1Local, criarBanco } from '../gestao/_d1local.mjs'
import { executarRodada } from '../../workers/recuperacao-carrinho/index.js'
import { executarLeadsWhatsapp, sufixoDoBotaoLead } from '../../workers/recuperacao-carrinho/leads-whatsapp.js'
import { encerrarLeads } from '../../workers/recuperacao-carrinho/leads.js'
import { atenderWebhook } from '../../workers/recuperacao-carrinho/whatsapp.js'
import { linkDescadastroLead, responderDescadastro } from '../../lib/descadastro.js'
import { pararLead, enviarAgora } from '../../lib/gestao/leads-robo.js'

const mudo = { log() {}, error() {} }
const MODELOS = ['lead_vs_1', 'lead_vs_2', 'lead_vs_3', 'lead_vs_4']
const utc = (texto) => new Date(texto.replace(' ', 'T') + 'Z')
const soma = (texto, ms) => new Date(utc(texto).getTime() + ms).toISOString().slice(0, 19).replace('T', ' ')
const DIA = 86400000
const C0 = '2026-11-10 14:30:00' // consentimento; 11h30 em Brasília

function montar({ extras = {}, estado = 'ativo', aprovados = MODELOS } = {}) {
  const db = new D1Local(criarBanco())
  const b = db.banco
  b.prepare('UPDATE whatsapp_estado SET estado = ? WHERE id = 1').run(estado)
  for (const nome of MODELOS) {
    b.prepare("INSERT OR REPLACE INTO whatsapp_modelos (nome, status, botao_url, conferido_em) VALUES (?, ?, 0, datetime('now'))")
      .run(nome, aprovados.includes(nome) ? 'APPROVED' : 'PENDING')
  }
  const env = {
    DB: db, WA_MODO: 'ativo', WA_PHONE_NUMBER_ID: '123', WA_TOKEN: 'token', WA_GRAPH_VERSION: 'v23.0',
    WA_APP_SECRET: 'segredo-app', MODO: 'ativo', RESEND_API_KEY: 'k', LEMBRETE_SEGREDO: 'segredo',
    EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>', EMAIL_REPLY_TO: 'c@trilhaviva.org',
    SITE_URL: 'https://trilhaviva.org', TETO_DIA: '40', TETO_MES: '1100', ...extras,
  }
  const meta = []
  const emails = []
  let n = 0
  const fetchImpl = async (url, init) => {
    if (String(url).startsWith('https://graph.facebook.com/')) {
      meta.push(JSON.parse(init.body))
      return Response.json({ messages: [{ id: `wamid.${++n}` }] })
    }
    emails.push(JSON.parse(init.body))
    return Response.json({ id: 'envio' })
  }
  const lead = (id, o = {}) => b.prepare(`INSERT INTO leads (id, nome, email, whatsapp, consentimento, consentimento_em,
      token_hash, token_expira_em, etapa_email, proximo_email_em, whatsapp_etapa, whatsapp_inicio_em, proximo_whatsapp_em)
    VALUES (?, ?, ?, ?, 1, ?, ?, datetime('now'), ?, ?, ?, ?, ?)`).run(
    id, o.nome || 'Ana Souza', `l${id}@example.com`, o.whatsapp || '27999999999', o.consentimento || C0, `h${id}`,
    o.etapaEmail ?? 0, o.proximoEmail ?? null, o.etapaWa ?? 0, o.inicio ?? null, o.proximoWa ?? null)
  const ler = (id = 1) => ({ ...b.prepare('SELECT * FROM leads WHERE id = ?').get(id) })
  const rodar = (agora) => executarLeadsWhatsapp(env, { agora: new Date(agora), fetchImpl, logger: mudo })
  return { db, b, env, meta, emails, fetchImpl, lead, ler, rodar }
}

test('cronograma do WhatsApp com datas exatas: +5 min, +3, +5 e +7 dias do consentimento, e depois para', async () => {
  const s = montar()
  s.lead(1)
  await s.rodar(soma(C0, 4 * 60000) + 'Z') // 4 min: cedo demais
  assert.equal(s.meta.length, 0)
  const passos = [[soma(C0, 6 * 60000), 1, soma(C0, 3 * DIA)], [soma(C0, 3 * DIA), 2, soma(C0, 5 * DIA)],
    [soma(C0, 5 * DIA), 3, soma(C0, 7 * DIA)], [soma(C0, 7 * DIA), 4, null]]
  for (const [quando, etapa, proxima] of passos) {
    await s.rodar(quando.replace(' ', 'T') + 'Z')
    assert.equal(s.meta.length, etapa, `mensagem ${etapa}`)
    assert.equal(s.meta.at(-1).template.name, `lead_vs_${etapa}`)
    const l = s.ler()
    assert.equal(l.whatsapp_etapa, etapa)
    assert.equal(l.proximo_whatsapp_em, proxima)
    assert.equal(l.whatsapp_inicio_em, C0)
  }
  // 1 min antes da vez de cada uma não envia; depois da 4ª não há mais nada.
  await s.rodar(soma(C0, 30 * DIA).replace(' ', 'T') + 'Z')
  assert.equal(s.meta.length, 4)
  const gravadas = s.b.prepare("SELECT etapa, wa_status, wa_msg_id FROM leads_whatsapp ORDER BY etapa").all()
  assert.deepEqual(gravadas.map((g) => [g.etapa, g.wa_status]), [[1, 'sent'], [2, 'sent'], [3, 'sent'], [4, 'sent']])
})

test('mensagem 2 não sai 1 min antes da hora', async () => {
  const s = montar()
  s.lead(1, { etapaWa: 1, inicio: C0, proximoWa: soma(C0, 3 * DIA) })
  await s.rodar(soma(C0, 3 * DIA - 60000).replace(' ', 'T') + 'Z')
  assert.equal(s.meta.length, 0)
})

test('payload da Meta: modelo, idioma pt_BR, {{1}} = primeiro nome e botão de URL dinâmica; msg 1 vai ao acervo e 2 a 4 à compra', async () => {
  const s = montar()
  s.lead(1)
  await s.rodar(soma(C0, 6 * 60000).replace(' ', 'T') + 'Z')
  assert.deepEqual(s.meta[0], {
    messaging_product: 'whatsapp', to: '5527999999999', type: 'template',
    template: {
      name: 'lead_vs_1', language: { code: 'pt_BR' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: 'Ana' }] },
        { type: 'button', sub_type: 'url', index: '0',
          parameters: [{ type: 'text', text: 'musicas?utm_source=whatsapp&utm_medium=lead&utm_campaign=lead_vs_1' }] },
      ],
    },
  })
  for (const n of [2, 3, 4]) {
    assert.equal(sufixoDoBotaoLead(n), `assinar?utm_source=whatsapp&utm_medium=lead&utm_campaign=lead_vs_${n}`)
  }
})

test('modelo que a Meta ainda não aprovou não envia nada nem avança o lead', async () => {
  const s = montar({ aprovados: ['lead_vs_2', 'lead_vs_3', 'lead_vs_4'] })
  s.lead(1)
  await s.rodar(soma(C0, DIA).replace(' ', 'T') + 'Z')
  assert.equal(s.meta.length, 0)
  assert.equal(s.ler().whatsapp_etapa, 0)
  // aprovado depois, sai na rodada seguinte
  s.b.exec("UPDATE whatsapp_modelos SET status = 'APPROVED'")
  await s.rodar(soma(C0, DIA).replace(' ', 'T') + 'Z')
  assert.equal(s.meta.length, 1)
})

test('WhatsApp desligado pelo Paulo (estado pausado), fora do horário e WA_MODO desligado não enviam', async () => {
  const pausado = montar({ estado: 'pausado' })
  pausado.lead(1)
  await pausado.rodar(soma(C0, DIA).replace(' ', 'T') + 'Z')
  assert.equal(pausado.meta.length, 0)
  const s = montar()
  s.lead(1)
  await s.rodar('2026-11-11T02:00:00Z') // 23h em Brasília
  await s.rodar('2026-11-11T11:59:00Z') // 8h59
  assert.equal(s.meta.length, 0)
  s.env.WA_MODO = 'desligado'
  await s.rodar('2026-11-11T15:00:00Z')
  assert.equal(s.meta.length, 0)
  s.env.WA_MODO = 'ativo'
  await s.rodar('2026-11-11T12:00:00Z') // 9h em Brasília
  assert.equal(s.meta.length, 1)
})

test('leads que já existem recebem a msg 1 na primeira rodada e as próximas contam desse primeiro envio', async () => {
  const s = montar()
  s.lead(1, { consentimento: '2026-10-22 12:00:00', etapaEmail: 4 })
  const agora = '2026-11-10 15:00:00'
  await s.rodar(agora.replace(' ', 'T') + 'Z')
  assert.equal(s.meta.length, 1)
  const l = s.ler()
  assert.equal(l.whatsapp_inicio_em, agora)
  assert.equal(l.proximo_whatsapp_em, soma(agora, 3 * DIA))
  await s.rodar(soma(agora, 3 * DIA).replace(' ', 'T') + 'Z')
  assert.equal(s.meta.length, 2)
  assert.equal(s.ler().proximo_whatsapp_em, soma(agora, 5 * DIA))
})

test('teto diário próprio: WA_LEADS_TETO_DIA, padrão 10; o resto fica para o dia seguinte', async () => {
  const s = montar({ extras: { WA_LEADS_TETO_DIA: '3' } })
  for (let i = 1; i <= 5; i++) s.lead(i)
  await s.rodar('2026-11-11T15:00:00Z')
  assert.equal(s.meta.length, 3)
  await s.rodar('2026-11-11T15:10:00Z')
  assert.equal(s.meta.length, 3)
  await s.rodar('2026-11-12T15:00:00Z')
  assert.equal(s.meta.length, 5)
  const p = montar()
  for (let i = 1; i <= 12; i++) p.lead(i)
  await p.rodar('2026-11-11T15:00:00Z')
  assert.equal(p.meta.length, 10)
})

test('WA_MODO teste só envia para WA_TESTE_PARA', async () => {
  const s = montar({ extras: { WA_MODO: 'teste', WA_TESTE_PARA: '27988880000' } })
  s.lead(1)
  s.lead(2, { whatsapp: '27988880000' })
  await s.rodar('2026-11-11T15:00:00Z')
  assert.equal(s.meta.length, 1)
  assert.equal(s.meta[0].to, '5527988880000')
  assert.equal(s.ler(1).whatsapp_etapa, 0)
})

test('erro da pessoa para só o WhatsApp (e-mail segue); erro de acesso devolve o lead e para a rodada', async () => {
  const s = montar()
  s.lead(1)
  s.lead(2)
  s.fetchImpl = async () => Response.json({ error: { code: 131026, message: 'sem WhatsApp' } }, { status: 400 })
  await executarLeadsWhatsapp(s.env, { agora: new Date('2026-11-11T15:00:00Z'), fetchImpl: s.fetchImpl, logger: mudo })
  const falho = s.ler(1)
  assert.equal(falho.whatsapp_motivo, 'falhou')
  assert.ok(falho.whatsapp_encerrado_em)
  assert.equal(s.b.prepare("SELECT wa_status, wa_erro FROM leads_whatsapp WHERE lead_id = 1").get().wa_erro, '131026')
  const t = montar()
  t.lead(1)
  t.lead(2)
  let chamadas = 0
  await executarLeadsWhatsapp(t.env, { agora: new Date('2026-11-11T15:00:00Z'), logger: mudo,
    fetchImpl: async (url) => {
      if (String(url).startsWith('https://graph.facebook.com/')) {
        chamadas += 1
        return Response.json({ error: { code: 190, message: 'token' } }, { status: 401 })
      }
      return Response.json({ id: 'x' })
    } })
  assert.equal(chamadas, 1) // parou na primeira
  assert.equal(t.ler(1).whatsapp_etapa, 0)
  assert.equal(t.b.prepare('SELECT COUNT(*) AS n FROM leads_whatsapp').get().n, 0)
})

test('encerramento nos 4 motivos: concluído, comprou, descadastrou e parado', async () => {
  const s = montar()
  for (let i = 1; i <= 7; i++) s.lead(i)
  s.b.exec(`UPDATE leads SET etapa_email = 8, whatsapp_etapa = 4 WHERE id = 1;
    UPDATE leads SET etapa_email = 8, whatsapp_encerrado_em = datetime('now'), whatsapp_motivo = 'falhou' WHERE id = 2;
    UPDATE leads SET etapa_email = 8 WHERE id = 3;
    UPDATE leads SET descadastrado = 1 WHERE id = 4;
    INSERT INTO clientes (id, email) VALUES (5, 'l5@example.com'), (6, 'l6@example.com');
    INSERT INTO compras (cliente_id, stripe_session_id, status, teste) VALUES (5, 'real', 'pago', 0), (6, 'teste', 'pago', 1);`)
  assert.equal(await pararLead(s.db, 7), 'ok')
  assert.equal(await pararLead(s.db, 7), 'ja_encerrado')
  assert.equal(await pararLead(s.db, 99), 'nao_encontrado')
  await encerrarLeads(s.db)
  const m = (id) => s.ler(id).encerrado_motivo
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(m), ['concluido', 'concluido', null, 'descadastrou', 'comprou', null, 'parado'])
  assert.equal(s.ler(5).comprou, 1) // a compra real que o webhook não marcou também fecha
  assert.equal(s.ler(6).comprou, 0)
  assert.equal(s.ler(3).encerrado_em, null) // e-mails prontos, mas o WhatsApp ainda não terminou
  assert.equal(s.ler(7).proximo_email_em, null)
})

test('compra no meio do processo para os dois canais e fecha como "comprou"', async () => {
  const s = montar()
  s.lead(1, { etapaEmail: 2, proximoEmail: '2026-11-01 12:00:00', etapaWa: 1, inicio: C0, proximoWa: '2026-11-01 12:00:00' })
  s.b.exec("INSERT INTO clientes (id, email) VALUES (1, 'l1@example.com'); INSERT INTO compras (cliente_id, stripe_session_id, status, teste) VALUES (1, 'real', 'pago', 0)")
  await executarRodada(s.env, { agora: new Date('2026-11-11T15:00:00Z'), fetchImpl: s.fetchImpl, logger: mudo })
  assert.equal(s.meta.length, 0)
  assert.equal(s.emails.length, 0)
  const l = s.ler()
  assert.equal(l.comprou, 1)
  assert.equal(l.encerrado_motivo, 'comprou')
  assert.equal(l.proximo_whatsapp_em, null)
  assert.equal(l.proximo_email_em, null)
})

test('"Não quero receber" no WhatsApp descadastra os DOIS canais, com o número sem o 9 também', async () => {
  for (const [lead, from] of [['27999999999', '5527999999999'], ['27999999999', '552799999999']]) {
    const s = montar()
    s.lead(1, { whatsapp: lead, etapaEmail: 2, proximoEmail: '2026-11-20 12:00:00', etapaWa: 1, inicio: C0, proximoWa: '2026-11-13 14:30:00' })
    const corpo = JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: '123' }, contacts: [{ wa_id: from, profile: { name: 'Ana' } }],
      messages: [{ from, id: 'wamid.in1', type: 'button', button: { text: 'Não quero receber', payload: 'Não quero receber' } }],
    } }] }] })
    const req = new Request('https://robo.example/whatsapp', { method: 'POST', body: corpo,
      headers: { 'X-Hub-Signature-256': 'sha256=' + createHmac('sha256', 'segredo-app').update(corpo).digest('hex') } })
    const r = await atenderWebhook(req, s.env, { fetchImpl: s.fetchImpl, logger: mudo })
    assert.equal(r.status, 200)
    const l = s.ler()
    assert.equal(l.descadastrado, 1)
    assert.equal(l.encerrado_motivo, 'descadastrou')
    assert.equal(l.whatsapp_motivo, 'descadastro')
    assert.equal(l.proximo_email_em, null)
    assert.equal(l.proximo_whatsapp_em, null)
    const rodada = await executarRodada(s.env, { agora: new Date('2026-12-01T15:00:00Z'), fetchImpl: s.fetchImpl, logger: mudo })
    assert.equal(rodada.leads.enviados, 0)
    assert.equal(s.meta.filter((m) => m.template).length, 0)
  }
})

test('descadastro pelo link do e-mail também encerra o WhatsApp; resposta comum só para o WhatsApp', async () => {
  const s = montar()
  s.lead(1, { etapaEmail: 1, proximoEmail: '2026-11-13 14:30:00', etapaWa: 1, inicio: C0, proximoWa: '2026-11-13 14:30:00' })
  const caminho = await linkDescadastroLead('l1@example.com', 'segredo')
  const r = await responderDescadastro(new Request('https://trilhaviva.org' + caminho, { method: 'POST' }), { db: s.db, segredo: 'segredo' })
  assert.equal(r.status, 200)
  const l = s.ler()
  assert.equal(l.descadastrado, 1)
  assert.equal(l.encerrado_motivo, 'descadastrou')
  assert.equal(l.proximo_whatsapp_em, null)
  await executarLeadsWhatsapp(s.env, { agora: new Date('2026-11-14T15:00:00Z'), fetchImpl: s.fetchImpl, logger: mudo })
  assert.equal(s.meta.length, 0)

  const t = montar()
  t.lead(1, { etapaEmail: 1, proximoEmail: '2026-11-13 14:30:00', etapaWa: 1, inicio: C0, proximoWa: '2026-11-13 14:30:00' })
  const corpo = JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: '123' }, contacts: [{ wa_id: '5527999999999' }],
    messages: [{ from: '5527999999999', id: 'wamid.in2', type: 'text', text: { body: 'Quanto custa?' } }],
  } }] }] })
  await atenderWebhook(new Request('https://robo.example/whatsapp', { method: 'POST', body: corpo,
    headers: { 'X-Hub-Signature-256': 'sha256=' + createHmac('sha256', 'segredo-app').update(corpo).digest('hex') } }), t.env,
  { fetchImpl: t.fetchImpl, logger: mudo })
  const resp = t.ler()
  assert.equal(resp.whatsapp_motivo, 'respondeu')
  assert.equal(resp.descadastrado, 0)
  assert.equal(resp.encerrado_em, null)
  assert.ok(resp.proximo_email_em) // o e-mail segue
})

test('status da Meta (entregue, lida) chega à mensagem do lead sem regredir', async () => {
  const s = montar()
  s.lead(1, { etapaWa: 1, inicio: C0 })
  s.b.exec("INSERT INTO leads_whatsapp (lead_id, etapa, modelo, wa_msg_id, wa_status) VALUES (1, 1, 'lead_vs_1', 'wamid.L1', 'sent')")
  const enviar = async (status) => {
    const corpo = JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: '123' }, statuses: [{ id: 'wamid.L1', status, timestamp: '1788000000' }] } }] }] })
    return atenderWebhook(new Request('https://robo.example/whatsapp', { method: 'POST', body: corpo,
      headers: { 'X-Hub-Signature-256': 'sha256=' + createHmac('sha256', 'segredo-app').update(corpo).digest('hex') } }), s.env,
    { fetchImpl: s.fetchImpl, logger: mudo })
  }
  const status = () => s.b.prepare('SELECT wa_status FROM leads_whatsapp').get().wa_status
  await enviar('delivered')
  assert.equal(status(), 'delivered')
  await enviar('read')
  await enviar('delivered')
  assert.equal(status(), 'read')
})

test('"enviar agora" só adianta a data: nada sai na requisição e o robô manda na rodada seguinte', async () => {
  const s = montar()
  s.lead(1, { etapaWa: 1, inicio: C0, proximoWa: '2026-12-30 14:30:00', etapaEmail: 2, proximoEmail: '2026-12-30 14:30:00' })
  assert.equal(await enviarAgora(s.db, 1, 'whatsapp'), 'ok')
  assert.equal(s.meta.length, 0)
  assert.ok(s.ler().proximo_whatsapp_em < '2026-12-30')
  assert.equal(await enviarAgora(s.db, 1, 'email'), 'ok')
  assert.equal(await enviarAgora(s.db, 99, 'email'), 'nao_encontrado')
  await pararLead(s.db, 1)
  assert.equal(await enviarAgora(s.db, 1, 'whatsapp'), 'nada_a_enviar')
  const t = montar()
  t.lead(1, { etapaWa: 1, inicio: C0, proximoWa: '2026-12-30 14:30:00' })
  await enviarAgora(t.db, 1, 'whatsapp')
  await t.rodar('2026-11-11T15:00:00Z')
  assert.equal(t.meta[0].template.name, 'lead_vs_2')
})

test('rodada cheia (40 carrinhos + 20 leads com WhatsApp) nunca passa de 50 consultas e ninguém recebe duas vezes', async () => {
  const s = montar({ extras: { WA_LEADS_TETO_DIA: '100', WA_TETO_DIA: '100' } })
  for (let i = 0; i < 40; i++) {
    s.b.prepare("INSERT INTO carrinhos (id, email, criado_em) VALUES (?, ?, datetime('now', '-2 hours'))").run(`c${i}`, `c${i}@example.com`)
  }
  for (let i = 1; i <= 20; i++) s.lead(i, { consentimento: '2026-10-22 12:00:00', etapaEmail: 4 })
  s.b.exec("UPDATE leads SET proximo_email_em = datetime('now', '+30 days')")
  let maximo = 0
  for (let r = 0; r < 30; r++) {
    const medidor = {}
    const antes = s.meta.length + s.emails.length
    await executarRodada(s.env, { agora: new Date('2026-12-08T15:00:00Z'), fetchImpl: s.fetchImpl, logger: mudo, medidor })
    maximo = Math.max(maximo, medidor.total)
    assert.ok(medidor.total <= 50, `rodada ${r + 1} gastou ${medidor.total}`)
    if (s.meta.length + s.emails.length === antes) break
  }
  assert.ok(maximo > 40)
  assert.equal(s.b.prepare('SELECT COUNT(*) AS n FROM leads_whatsapp').get().n, 20)
  assert.equal(s.b.prepare('SELECT COUNT(DISTINCT lead_id) AS n FROM leads_whatsapp').get().n, 20)
})

test('consultas da etapa de WhatsApp dos leads: 3 fixas + 3 por mensagem', async () => {
  const s = montar()
  for (let i = 1; i <= 4; i++) s.lead(i)
  const antes = s.db.consultas
  await s.rodar('2026-11-11T15:00:00Z')
  assert.equal(s.meta.length, 4)
  assert.equal(s.db.consultas - antes, 3 + 1 + 4 * 3) // estado, contagem, fila + leitura dos modelos (sem WA_WABA_ID) + 3 por lead
})

// ---------------------------------------------------------------- Fase 1b: falhas reproduzidas pelo Codex ----

// Injeta uma ação (falha ou efeito) quando o robô prepara um SQL que contém `trecho`.
function interceptar(db, trecho, acao) {
  const original = db.prepare.bind(db)
  db.prepare = (sql) => {
    if (sql.includes(trecho)) acao(sql)
    return original(sql)
  }
  return () => { db.prepare = original }
}
const quebrar = (trecho) => (db) => interceptar(db, trecho, () => { throw new Error('D1 fora do ar') })

test('1. gravar o id da Meta falha DEPOIS de ela aceitar: a mensagem não sai de novo', async () => {
  const s = montar()
  s.lead(1)
  const soltar = quebrar('UPDATE leads_whatsapp SET wa_msg_id')(s.db)
  await s.rodar('2026-11-11T15:00:00Z')
  assert.equal(s.meta.length, 1)
  assert.equal(s.ler().whatsapp_etapa, 1) // avançou
  assert.equal(s.b.prepare('SELECT COUNT(*) AS n FROM leads_whatsapp').get().n, 1) // a reserva ficou
  soltar()
  await s.rodar('2026-11-11T15:10:00Z')
  await s.rodar('2026-11-12T15:00:00Z')
  assert.equal(s.meta.length, 1, 'nenhum reenvio')
})

test('1b. resposta incerta da Meta (tempo esgotado, sem código) também não reenvia', async () => {
  const s = montar()
  s.lead(1)
  const fetchImpl = async () => { throw new Error('tempo esgotado') }
  await executarLeadsWhatsapp(s.env, { agora: new Date('2026-11-11T15:00:00Z'), fetchImpl, logger: mudo })
  assert.equal(s.ler().whatsapp_etapa, 1)
  await s.rodar('2026-11-11T15:10:00Z')
  assert.equal(s.meta.length, 0)
  assert.equal(s.b.prepare('SELECT COUNT(*) AS n FROM leads_whatsapp').get().n, 1)
})

test('2. erro do D1 no "Não quero receber" faz o webhook responder 500 (a Meta reenvia) e o reenvio descadastra', async () => {
  const s = montar()
  s.lead(1, { etapaEmail: 2, proximoEmail: '2026-11-20 12:00:00', etapaWa: 1, inicio: C0, proximoWa: '2026-11-13 14:30:00' })
  const corpo = JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: '123' }, contacts: [{ wa_id: '5527999999999' }],
    messages: [{ from: '5527999999999', id: 'wamid.in9', type: 'button', button: { text: 'Não quero receber' } }],
  } }] }] })
  const pedido = () => new Request('https://robo.example/whatsapp', { method: 'POST', body: corpo,
    headers: { 'X-Hub-Signature-256': 'sha256=' + createHmac('sha256', 'segredo-app').update(corpo).digest('hex') } })
  const soltar = quebrar('UPDATE leads SET descadastrado = 1')(s.db)
  assert.equal((await atenderWebhook(pedido(), s.env, { fetchImpl: s.fetchImpl, logger: mudo })).status, 500)
  assert.equal(s.ler().descadastrado, 0)
  soltar()
  assert.equal((await atenderWebhook(pedido(), s.env, { fetchImpl: s.fetchImpl, logger: mudo })).status, 200)
  assert.equal(s.ler().descadastrado, 1)
  assert.equal((await atenderWebhook(pedido(), s.env, { fetchImpl: s.fetchImpl, logger: mudo })).status, 200) // idempotente
  assert.equal(s.ler().encerrado_motivo, 'descadastrou')
})

test('3. conferência dos modelos vencida (WA_WABA_ID): 1 gravação só e a rodada cheia não passa de 50 consultas', async () => {
  const s = montar({ extras: { WA_WABA_ID: 'waba', WA_LEADS_TETO_DIA: '100', WA_TETO_DIA: '100' } })
  s.b.exec("UPDATE whatsapp_modelos SET status = 'PENDING'; UPDATE whatsapp_estado SET modelo_conferido_em = NULL")
  for (let i = 0; i < 20; i++) {
    s.b.prepare("INSERT INTO carrinhos (id, email, telefone, criado_em) VALUES (?, ?, ?, '2026-12-08 10:00:00')")
      .run(`c${i}`, `c${i}@example.com`, `2799999${String(i).padStart(4, '0')}`)
  }
  for (let i = 1; i <= 10; i++) s.lead(i, { consentimento: '2026-10-22 12:00:00', etapaEmail: 4 })
  s.b.exec("UPDATE leads SET proximo_email_em = datetime('now', '+30 days')")
  let gravacoes = 0
  interceptar(s.db, 'INSERT INTO whatsapp_modelos', () => { gravacoes += 1 })
  const nomes = ['carrinho_lembrete', 'carrinho_preco', 'carrinho_acervo', ...MODELOS]
  const fetchImpl = async (url, init) => {
    if (String(url).includes('/message_templates')) {
      return Response.json({ data: nomes.map((name) => ({ name, status: 'APPROVED', language: 'pt_BR',
        components: [{ type: 'BUTTONS', buttons: [{ type: 'URL' }] }] })) })
    }
    return s.fetchImpl(url, init)
  }
  const medidor = {}
  await executarRodada(s.env, { agora: new Date('2026-12-08T15:00:00Z'), fetchImpl, logger: mudo, medidor })
  assert.ok(medidor.total <= 50, `gastou ${medidor.total}`)
  assert.equal(gravacoes, 1)
  assert.equal(s.b.prepare("SELECT COUNT(*) AS n FROM whatsapp_modelos WHERE status = 'APPROVED'").get().n, 7)
})

test('4. compra registrada entre a leitura da fila e a reserva bloqueia o envio', async () => {
  const s = montar()
  s.lead(1)
  interceptar(s.db, 'INSERT OR IGNORE INTO leads_whatsapp', () => {
    s.b.exec("INSERT INTO clientes (id, email) VALUES (1, 'l1@example.com'); INSERT INTO compras (cliente_id, stripe_session_id, status, teste) VALUES (1, 'real', 'pago', 0)")
  })
  await s.rodar('2026-11-11T15:00:00Z')
  assert.equal(s.meta.length, 0)
  assert.equal(s.ler().whatsapp_etapa, 0)
  assert.equal(s.b.prepare('SELECT COUNT(*) AS n FROM leads_whatsapp').get().n, 0)
})

test('5. reserva e avanço do lead são uma transação: se o avanço falha, não sobra reserva e a próxima rodada envia', async () => {
  const s = montar()
  s.lead(1)
  const soltar = quebrar('UPDATE leads SET whatsapp_etapa')(s.db)
  await assert.rejects(() => s.rodar('2026-11-11T15:00:00Z'))
  assert.equal(s.meta.length, 0)
  assert.equal(s.b.prepare('SELECT COUNT(*) AS n FROM leads_whatsapp').get().n, 0)
  soltar()
  await s.rodar('2026-11-11T15:10:00Z')
  assert.equal(s.meta.length, 1)
  assert.equal(s.ler().whatsapp_etapa, 1)
})
