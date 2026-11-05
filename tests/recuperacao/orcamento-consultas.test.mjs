import test from 'node:test'
import assert from 'node:assert/strict'
import { D1Local, criarBanco } from '../gestao/_d1local.mjs'
import { executarRodada } from '../../workers/recuperacao-carrinho/index.js'
import { executarAfiliados } from '../../workers/recuperacao-carrinho/afiliados.js'
import { contarConsultas } from '../../workers/recuperacao-carrinho/orcamento.js'
import { novoAfiliado, vendas } from '../afiliados/_base.mjs'

const AGORA = new Date('2026-12-08T12:00:00Z') // dia do fechamento, 09h em Brasília
const logger = { log() {}, error() {} }

function montar({ carrinhos = 0, seguimentos = 0, leads = 0 } = {}) {
  const db = new D1Local(criarBanco())
  const b = db.banco
  for (let i = 0; i < carrinhos; i++) {
    b.prepare(`INSERT INTO carrinhos (id, email, criado_em) VALUES (?, ?, datetime('now', '-2 hours'))`).run(`c${i}`, `c${i}@example.com`)
  }
  for (let i = 0; i < seguimentos; i++) {
    b.prepare(`INSERT INTO carrinhos (id, email, criado_em, status, email_enviado_em, etapa_email, proximo_email_em)
      VALUES (?, ?, datetime('now', '-40 days'), 'lembrado', datetime('now', '-39 days'), 1, datetime('now', '-1 minute'))`).run(`s${i}`, `s${i}@example.com`)
    b.prepare(`INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em) VALUES (?, 'email', 1, datetime('now', '-39 days'))`).run(`s${i}`)
  }
  for (let i = 0; i < leads; i++) {
    b.prepare(`INSERT INTO leads (id, nome, email, whatsapp, consentimento, consentimento_em, token_hash, token_expira_em, etapa_email, proximo_email_em)
      VALUES (?, 'L', ?, '27999999999', 1, datetime('now', '-7 days'), ?, datetime('now'), 0, datetime('now', '-1 minute'))`).run(i + 1, `l${i}@example.com`, `h${i}`)
  }
  const env = { DB: db, MODO: 'ativo', TESTE_PARA: 't@example.com', EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>', EMAIL_REPLY_TO: 'c@trilhaviva.org',
    SITE_URL: 'https://trilhaviva.org', TETO_DIA: '40', TETO_MES: '1100', RESEND_API_KEY: 'k', LEMBRETE_SEGREDO: 'segredo' }
  const opcoes = (medidor) => ({ agora: AGORA, logger, medidor, fetchImpl: async () => new Response('{}', { status: 200 }) })
  return { db, env, opcoes }
}

const fechamentos = (db) => Number(db.banco.prepare('SELECT COUNT(*) AS n FROM afiliados_fechamentos').get().n)

const NOV = new Date('2026-11-10T15:00:00Z')

test('8 carrinhos + 1 lead + afiliados a fechar: total ≤ 50 e afiliados usa só a sobra', async () => {
  const s = montar({ carrinhos: 8, leads: 1 })
  for (let i = 0; i < 10; i++) await vendas(s.db, novoAfiliado(s.db), 2, NOV)
  const medidor = {}
  await executarRodada(s.env, s.opcoes(medidor))
  const e = medidor.etapas
  const sobra = Math.min(16, 50 - e.acesso - 4)
  assert.ok(medidor.total <= 50, `gastou ${medidor.total}`)
  assert.ok(e.afiliados - e.acesso <= sobra, `afiliados gastou ${e.afiliados - e.acesso}, sobra ${sobra}`)
  assert.ok(fechamentos(s.db) >= 1 && fechamentos(s.db) < 10) // adiou o resto
  for (let i = 0; i < 12 && fechamentos(s.db) < 10; i++) await executarRodada(s.env, s.opcoes({}))
  assert.equal(fechamentos(s.db), 10) // as rodadas seguintes terminam o trabalho
})

test('e-mail no máximo (20 + 20 + 20 leads): as etapas antigas já passam de 50; afiliados não gasta nada', async () => {
  const s = montar({ carrinhos: 20, seguimentos: 20, leads: 20 })
  for (let i = 0; i < 10; i++) await vendas(s.db, novoAfiliado(s.db), 2, NOV)
  const medidor = {}
  await executarRodada(s.env, s.opcoes(medidor))
  const e = medidor.etapas
  assert.ok(e.acesso > 50) // medido: 186. Comportamento antigo, não alterado aqui.
  assert.equal(e.afiliados - e.acesso, 0)
  assert.equal(fechamentos(s.db), 0)
})

test('com sobra pequena afiliados usa só o que sobrou; na rodada seguinte continua', async () => {
  const s = montar({ carrinhos: 2 })
  for (let i = 0; i < 6; i++) await vendas(s.db, novoAfiliado(s.db), 2, new Date('2026-11-10T15:00:00Z'))
  const medidor = {}
  await executarRodada(s.env, s.opcoes(medidor))
  const gastoAfiliados = medidor.etapas.afiliados - medidor.etapas.acesso
  assert.ok(medidor.total <= 50)
  assert.ok(gastoAfiliados <= Math.min(16, 50 - medidor.etapas.acesso - 4), `afiliados gastou ${gastoAfiliados}`)
  assert.ok(fechamentos(s.db) >= 1)
  for (let i = 0; i < 4; i++) await executarRodada(s.env, s.opcoes({}))
  assert.equal(fechamentos(s.db), 6)
})

test('executarAfiliados usa min(16, 50 - gasto - 4): com 40 já gastos, sobra 6', async () => {
  const s = montar()
  for (let i = 0; i < 5; i++) await vendas(s.db, novoAfiliado(s.db), 2, new Date('2026-11-10T15:00:00Z'))
  const contado = contarConsultas(s.db)
  for (let i = 0; i < 40; i++) contado.prepare('SELECT 1')
  const r = await executarAfiliados({ ...s.env, DB: contado }, s.opcoes())
  assert.ok(r.consultas <= 6, `gastou ${r.consultas}`)
  assert.equal(fechamentos(s.db), 0) // 1 + 3 fixas + 4 por afiliado não cabe em 6
  const cheio = contarConsultas(s.db)
  for (let i = 0; i < 47; i++) cheio.prepare('SELECT 1')
  assert.equal((await executarAfiliados({ ...s.env, DB: cheio }, s.opcoes())).adiado, true)
})
