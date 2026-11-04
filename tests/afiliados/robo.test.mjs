import test from 'node:test'
import assert from 'node:assert/strict'
import { novoDb, novoAfiliado, vendas, FECHA } from './_base.mjs'
import { executarRodada } from '../../workers/recuperacao-carrinho/index.js'
import { executarAfiliados, fecharPendentes } from '../../workers/recuperacao-carrinho/afiliados.js'

const DIA_7 = new Date('2026-12-07T12:00:00Z')
const DIA_27 = new Date('2026-11-27T15:00:00Z') // últimos 5 dias de novembro
const DIA_25 = new Date('2026-11-25T15:00:00Z')
const logger = { log() {}, error() {} }

function montar(extra = {}) {
  const db = novoDb()
  const emails = []
  const s = { db, emails, falhar: false }
  s.env = { DB: db, MODO: 'ativo', TESTE_PARA: 'teste@t.com', RESEND_API_KEY: 'k', EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>',
    EMAIL_REPLY_TO: 'contato@trilhaviva.org', SITE_URL: 'https://trilhaviva.org', ...extra }
  s.opcoes = (agora) => ({ agora, logger, fetchImpl: async (url, o) => {
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
  const r = await fecharPendentes(s.env, FECHA, logger)
  assert.equal(r.fechados, 0)
  assert.equal(s.db.consultas - antes, 1)
})

test('limite por rodada: continua na seguinte e no fim todos estão fechados', async () => {
  const s = montar()
  for (let i = 0; i < 30; i++) await vendas(s.db, novoAfiliado(s.db), 1)
  assert.equal((await s.rodar(FECHA)).fechamento.fechados, 25)
  assert.equal(s.n('SELECT COUNT(*) AS n FROM afiliados_fechamentos'), 25)
  assert.equal((await s.rodar(FECHA)).fechamento.fechados, 5)
  assert.equal(s.n('SELECT COUNT(*) AS n FROM afiliados_fechamentos'), 30)
  assert.equal((await s.rodar(FECHA)).fechamento.fechados, 0)
})

test('resumo sai 1 vez mesmo em 3 rodadas, com aviso no painel e sem cópia oculta', async () => {
  const s = montar()
  await vendas(s.db, novoAfiliado(s.db), 20)
  for (let i = 0; i < 3; i++) await s.rodar(FECHA)
  const resumos = s.emails.filter((e) => e.subject.startsWith('Fechamento'))
  assert.equal(resumos.length, 1)
  assert.match(resumos[0].subject, /novembro de 2026: você ganhou R\$ 400,00/)
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
