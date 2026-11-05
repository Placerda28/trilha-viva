import test from 'node:test'
import assert from 'node:assert/strict'
import { novoDb, novoAfiliado, vendas, NOV, FECHA } from './_base.mjs'
import { executarRodada } from '../../workers/recuperacao-carrinho/index.js'
import { ORCAMENTO, comOrcamento, executarAfiliados, fecharPendentes } from '../../workers/recuperacao-carrinho/afiliados.js'

const DIA_7 = new Date('2026-12-07T12:00:00Z')
const DIA_27 = new Date('2026-11-27T15:00:00Z') // últimos 5 dias de novembro
const DIA_25 = new Date('2026-11-25T15:00:00Z')
const logger = { log() {}, error() {} }

function montar(extra = {}) {
  const db = novoDb()
  const emails = []
  const s = { db, emails, falhar: false, pedidos: [], status: 0 }
  s.env = { DB: db, MODO: 'ativo', TESTE_PARA: 'teste@t.com', RESEND_API_KEY: 'k', EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>',
    EMAIL_REPLY_TO: 'contato@trilhaviva.org', SITE_URL: 'https://trilhaviva.org', ...extra }
  s.opcoes = (agora) => ({ agora, logger, fetchImpl: async (url, o) => {
    s.pedidos.push({ ...JSON.parse(o.body), chave: o.headers['Idempotency-Key'] })
    if (s.status) return new Response('x', { status: s.status })
    if (s.falhar) return new Response('x', { status: 500 })
    emails.push({ ...JSON.parse(o.body), chave: o.headers['Idempotency-Key'] })
    return Response.json({ id: 'e' })
  } })
  s.rodar = (agora) => executarAfiliados(s.env, s.opcoes(agora))
  s.n = (sql, ...a) => Number(db.banco.prepare(sql).get(...a).n)
  return s
}

test('fecha a partir do dia 8 e não fecha no dia 7', async () => {
  const s = montar()
  await vendas(s.db, novoAfiliado(s.db), 3)
  await s.rodar(DIA_7)
  assert.equal(s.n('SELECT COUNT(*) AS n FROM afiliados_fechamentos'), 0)
  const r = await s.rodar(FECHA)
  assert.equal(r.fechamento.fechados, 1)
  assert.equal(s.n('SELECT COUNT(*) AS n FROM afiliados_fechamentos'), 1)
})

test('sem nada a fechar a checagem custa 1 consulta', async () => {
  const s = montar()
  await vendas(s.db, novoAfiliado(s.db), 2)
  await s.rodar(FECHA)
  const antes = s.db.consultas
  const r = await fecharPendentes(s.env, comOrcamento(s.db), FECHA, logger)
  assert.equal(r.fechados, 0)
  assert.equal(s.db.consultas - antes, 1)
})

test('limite por rodada (2) e orçamento: continua na seguinte, no fim todos fechados, ≤ 16 consultas', async () => {
  const s = montar()
  for (let i = 0; i < 7; i++) await vendas(s.db, novoAfiliado(s.db), 1)
  const total = () => s.n('SELECT COUNT(*) AS n FROM afiliados_fechamentos')
  for (const esperado of [2, 4, 6, 7, 7]) {
    const antes = s.db.consultas
    const r = await s.rodar(FECHA)
    assert.equal(total(), esperado)
    assert.ok(s.db.consultas - antes <= ORCAMENTO, `gastou ${s.db.consultas - antes}`)
    assert.equal(r.consultas, s.db.consultas - antes)
  }
})

test('orçamento vale com tudo pendente nos últimos dias (avisos, fila e envios)', async () => {
  const s = montar()
  for (let i = 0; i < 8; i++) await vendas(s.db, novoAfiliado(s.db), 15)
  for (let i = 0; i < 4; i++) {
    const antes = s.db.consultas
    await s.rodar(DIA_27)
    assert.ok(s.db.consultas - antes <= ORCAMENTO)
  }
  assert.equal(s.emails.length, 8)
})

test('pendência antiga é fechada: o mês mais antigo liberado vem primeiro', async () => {
  const s = montar()
  await vendas(s.db, novoAfiliado(s.db), 2, new Date('2026-10-10T15:00:00Z'))
  await vendas(s.db, novoAfiliado(s.db), 2, NOV)
  const JAN_8 = new Date('2027-01-08T12:00:00Z') // o cron olharia dezembro; outubro e novembro seguem abertos
  const meses = () => s.db.banco.prepare('SELECT mes_referencia AS m FROM afiliados_fechamentos ORDER BY id').all().map((x) => x.m)
  await s.rodar(JAN_8)
  assert.deepEqual(meses(), ['2026-10'])
  await s.rodar(JAN_8)
  assert.deepEqual(meses(), ['2026-10', '2026-11'])
  assert.equal((await s.rodar(JAN_8)).fechamento.fechados, 0)
})

test('resumo: números congelados entre tentativas, mesma chave, 409 conta como enviado', async () => {
  const s = montar()
  const af = novoAfiliado(s.db)
  await vendas(s.db, af, 2)
  s.falhar = true
  await s.rodar(FECHA)
  // o saldo muda depois da 1ª tentativa; o e-mail repetido tem de sair igual
  s.db.banco.prepare("INSERT INTO afiliados_lancamentos (afiliado_id, tipo, mes_referencia, valor_centavos, status, disponivel_em) VALUES (?, 'ajuste', '2026-11', 5000, 'pendente', '2026-01-01 00:00:00')").run(af.id)
  s.status = 409
  await s.rodar(FECHA)
  assert.equal(s.pedidos.length, 2)
  assert.equal(s.pedidos[1].html, s.pedidos[0].html)
  assert.equal(s.pedidos[1].text, s.pedidos[0].text)
  assert.equal(s.pedidos[1].chave, s.pedidos[0].chave)
  assert.ok(s.db.banco.prepare('SELECT resumo_enviado_em AS r FROM afiliados_fechamentos').get().r)
  s.status = 0
  await s.rodar(FECHA)
  assert.equal(s.pedidos.length, 2)
})

test('resumo: só repete dentro de 20 h da 1ª tentativa; depois desiste e registra', async () => {
  const s = montar()
  await vendas(s.db, novoAfiliado(s.db), 2)
  const erros = []
  s.opcoes = ((antiga) => (agora) => ({ ...antiga(agora), logger: { log() {}, error: (m) => erros.push(String(m)) } }))(s.opcoes)
  s.falhar = true
  await s.rodar(FECHA)
  await s.rodar(new Date(FECHA.getTime() + 19 * 3600000))
  assert.equal(s.pedidos.length, 2)
  s.falhar = false
  const tarde = new Date(FECHA.getTime() + 21 * 3600000)
  await s.rodar(tarde)
  await s.rodar(tarde)
  assert.equal(s.pedidos.length, 2)
  assert.equal(s.emails.length, 0)
  assert.ok(erros.some((m) => m.includes('desistido')))
})

test('faltam: e-mail com falha repete até 3 vezes sem duplicar o aviso, com dados congelados', async () => {
  const s = montar()
  const af = novoAfiliado(s.db)
  await vendas(s.db, af, 15)
  s.falhar = true
  await s.rodar(DIA_27)
  await vendas(s.db, af, 3) // 18 vendas: o e-mail repetido continua dizendo 15 / faltam 5
  s.falhar = false
  await s.rodar(DIA_27)
  await s.rodar(DIA_27)
  assert.equal(s.emails.length, 1)
  assert.equal(s.pedidos.length, 2)
  assert.equal(s.pedidos[1].html, s.pedidos[0].html)
  assert.match(s.emails[0].text, /Faltam 5 vendas/)
  assert.equal(s.n("SELECT COUNT(*) AS n FROM afiliados_avisos WHERE tipo = 'faltam:2026-11'"), 1)
  assert.equal(s.n('SELECT email_tentativas AS n FROM afiliados_avisos WHERE email_dados IS NOT NULL'), 2)
})

test('faltam: para em 3 tentativas, respeita 20 h e não passa para o mês seguinte', async () => {
  const s = montar()
  await vendas(s.db, novoAfiliado(s.db), 15)
  s.falhar = true
  for (let i = 0; i < 5; i++) await s.rodar(DIA_27)
  assert.equal(s.pedidos.length, 3)

  const t = montar()
  await vendas(t.db, novoAfiliado(t.db), 15)
  t.falhar = true
  await t.rodar(DIA_27)
  t.falhar = false
  await t.rodar(new Date(DIA_27.getTime() + 21 * 3600000)) // 28/11 12h: passou de 20 h
  assert.equal(t.emails.length, 0)
  await t.rodar(new Date('2026-12-01T15:00:00Z')) // mês virou
  assert.equal(t.emails.length, 0)
})

test('resumo sai 1 vez mesmo em 3 rodadas, com aviso no painel e sem cópia oculta', async () => {
  const s = montar()
  await vendas(s.db, novoAfiliado(s.db), 20)
  for (let i = 0; i < 3; i++) await s.rodar(FECHA)
  const resumos = s.emails.filter((e) => e.subject.startsWith('Seu mês de'))
  assert.equal(resumos.length, 1)
  assert.match(resumos[0].subject, /^Seu mês de novembro fechou: 20 vendas, nível Prata, R\$ 400,00 disponível para saque/)
  assert.doesNotMatch(resumos[0].html + resumos[0].text, /base|bônus|bonus|garantido|carência/i)
  assert.match(resumos[0].text, /Prata/)
  assert.equal(resumos[0].bcc, undefined)
  assert.equal(s.n("SELECT COUNT(*) AS n FROM afiliados_avisos WHERE tipo = 'fechamento:2026-11'"), 1)
  assert.ok(s.db.banco.prepare('SELECT resumo_enviado_em AS r FROM afiliados_fechamentos').get().r)
})

test('falha de e-mail tenta de novo e para em 3 tentativas', async () => {
  const s = montar()
  await vendas(s.db, novoAfiliado(s.db), 2)
  s.falhar = true
  await s.rodar(FECHA)
  assert.equal(s.emails.length, 0)
  s.falhar = false
  await s.rodar(FECHA)
  assert.equal(s.emails.length, 1)
  await s.rodar(FECHA)
  assert.equal(s.emails.length, 1)

  const t = montar()
  await vendas(t.db, novoAfiliado(t.db), 2)
  t.falhar = true
  for (let i = 0; i < 5; i++) await t.rodar(FECHA)
  assert.equal(t.n('SELECT resumo_tentativas AS n FROM afiliados_fechamentos'), 3)
  assert.equal(t.n('SELECT COUNT(*) AS n FROM afiliados_avisos'), 1)
})

test('faltam X: só nos últimos 5 dias, só com ≤ 5, 1 vez, nunca Ouro, fixo ou inativo', async () => {
  const s = montar()
  await vendas(s.db, novoAfiliado(s.db), 15) // faltam 5 para Prata
  await vendas(s.db, novoAfiliado(s.db), 14) // faltam 6
  await vendas(s.db, novoAfiliado(s.db), 50) // Ouro
  await vendas(s.db, novoAfiliado(s.db, { nivelFixoId: 1 }), 15)
  await vendas(s.db, novoAfiliado(s.db, { status: 'suspenso' }), 15)
  await vendas(s.db, novoAfiliado(s.db), 49) // falta 1 para Ouro
  await s.rodar(DIA_25)
  assert.equal(s.emails.length, 0)
  for (let i = 0; i < 3; i++) await s.rodar(DIA_27)
  const assuntos = s.emails.map((e) => e.subject).sort()
  assert.deepEqual(assuntos, ['Faltam 1 venda para o nível Ouro — Trilha Viva', 'Faltam 5 vendas para o nível Prata — Trilha Viva'])
  assert.equal(s.n("SELECT COUNT(*) AS n FROM afiliados_avisos WHERE tipo = 'faltam:2026-11'"), 2)
})

test('MODO teste: e-mail só para TESTE_PARA; fechamento segue', async () => {
  const s = montar({ MODO: 'teste' })
  const a = novoAfiliado(s.db)
  const b = novoAfiliado(s.db)
  await vendas(s.db, a, 2)
  await vendas(s.db, b, 2)
  s.db.banco.prepare('UPDATE clientes SET email = ? WHERE id = ?').run('teste@t.com', a.clienteId)
  await s.rodar(FECHA)
  await s.rodar(FECHA) // a 1ª rodada gasta o orçamento no fechamento; os e-mails ficam para a seguinte
  assert.equal(s.n('SELECT COUNT(*) AS n FROM afiliados_fechamentos'), 2)
  assert.deepEqual(s.emails.map((e) => e.to[0]), ['teste@t.com'])
  s.env.MODO = 'ativo'
  await s.rodar(FECHA)
  assert.equal(s.emails.length, 2)
})

test('contato de teste não recebe em modo ativo', async () => {
  const s = montar()
  const a = novoAfiliado(s.db)
  await vendas(s.db, a, 2)
  const email = s.db.banco.prepare('SELECT email FROM clientes WHERE id = ?').get(a.clienteId).email
  s.db.banco.prepare("INSERT INTO contatos_teste (tipo, valor) VALUES ('email', ?)").run(email)
  await s.rodar(FECHA)
  assert.equal(s.emails.length, 0)
})

test('erro na etapa de afiliados é registrado e não derruba a rodada', async () => {
  const s = montar()
  s.db.prepare = () => { throw new Error('quebrou') }
  const erros = []
  // A rodada de e-mail antiga também usa o banco e falha; o que importa é a etapa registrar o seu erro.
  await executarRodada(s.env, { logger: { log() {}, error: (m) => erros.push(String(m)) } }).catch(() => {})
  assert.ok(erros.some((m) => m.includes('afiliados')))
})
