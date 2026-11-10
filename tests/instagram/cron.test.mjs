import test from 'node:test'
import assert from 'node:assert/strict'
import { D1Local, criarBanco } from '../gestao/_d1local.mjs'
import { executarInstagram } from '../../workers/recuperacao-carrinho/instagram.js'
import { executarRodada } from '../../workers/recuperacao-carrinho/index.js'
import { adiados, consultasGastas, contarConsultas } from '../../workers/recuperacao-carrinho/orcamento.js'

const mudo = { log() {}, error() {} }
const CUSTO = 10

// Módulo da IA falso com a mesma interface do contrato; cada rascunho gasta CUSTO consultas reais.
function falso(fila) {
  const geradas = []
  return {
    geradas,
    CUSTO_FILA: 1,
    CUSTO_RASCUNHO: CUSTO,
    buscarFilaRascunhos: async (db, limite) => { await db.prepare('SELECT 1').all(); return fila.slice(0, limite) },
    gerarRascunho: async (env, igsid) => {
      for (let i = 0; i < CUSTO; i++) await env.DB.prepare('SELECT 1').all()
      geradas.push(igsid)
      return { status: 'pendente' }
    },
  }
}
const ids = (n) => Array.from({ length: n }, (_, i) => String(1000 + i))
function montarEnv(extra = {}, ligada = 1) {
  const local = new D1Local(criarBanco())
  local.banco.prepare('UPDATE instagram_estado SET ia_ligada = ? WHERE id = 1').run(ligada)
  return { DB: contarConsultas(local), IG_ACCOUNT_ID: '1784', ...extra }
}

test('pega no máximo 3 conversas por rodada', async () => {
  const m = falso(ids(7))
  const env = montarEnv()
  const r = await executarInstagram(env, { rascunho: m, logger: mudo })
  assert.deepEqual(m.geradas, ['1000', '1001', '1002'])
  assert.equal(r.gerados, 3)
  assert.equal(consultasGastas(env.DB), 2 + 3 * CUSTO) // estado + fila + 3 rascunhos
})

test('respeita o orçamento: quando não cabe, adia e avisa', async () => {
  const m = falso(ids(3))
  const env = montarEnv()
  for (let i = 0; i < 46 - 2 - (CUSTO + 5); i++) await env.DB.prepare("SELECT 1").all() // sobra: fila + 1 rascunho + 5
  const r = await executarInstagram(env, { rascunho: m, logger: mudo })
  assert.equal(m.geradas.length, 1)
  assert.equal(r.adiados, 2)
  assert.deepEqual(adiados(env.DB), { instagram: 2 })
  assert.ok(consultasGastas(env.DB) <= 46)
})

test('sem sobra nem para a fila: não consulta nada e anota 1 adiado', async () => {
  const m = falso(ids(3))
  const env = montarEnv()
  for (let i = 0; i < 46; i++) await env.DB.prepare('SELECT 1').all()
  const antes = consultasGastas(env.DB)
  await executarInstagram(env, { rascunho: m, logger: mudo })
  assert.equal(consultasGastas(env.DB), antes)
  assert.equal(m.geradas.length, 0)
  assert.deepEqual(adiados(env.DB), { instagram: 1 })
})

test('IA desligada: 1 consulta (estado), não carrega o módulo da IA e não gasta mais nada', async () => {
  const m = falso(ids(3))
  let carregou = false
  const env = montarEnv({}, 0)
  await executarInstagram(env, { get rascunho() { carregou = true; return m }, logger: mudo })
  assert.equal(consultasGastas(env.DB), 1)
  assert.equal(carregou, false)
  assert.equal(m.geradas.length, 0)
})

test('sem IG_ACCOUNT_ID a etapa não faz nada (0 consultas)', async () => {
  const m = falso(ids(3))
  const env = montarEnv({ IG_ACCOUNT_ID: '' })
  await executarInstagram(env, { rascunho: m, logger: mudo })
  assert.equal(consultasGastas(env.DB), 0)
  assert.equal(m.geradas.length, 0)
})

test('erro em um rascunho não impede os seguintes', async () => {
  const m = falso(ids(3))
  const original = m.gerarRascunho
  m.gerarRascunho = async (env, igsid, o) => { if (igsid === '1000') throw new Error('D1'); return original(env, igsid, o) }
  const env = montarEnv()
  const r = await executarInstagram(env, { rascunho: m, logger: mudo })
  assert.deepEqual(m.geradas, ['1001', '1002'])
  assert.equal(r.gerados, 2)
})

test('rodada inteira com o robô cheio (40 carrinhos + 20 seguimentos + 20 leads + Instagram) nunca passa de 50 consultas', async () => {
  const db = new D1Local(criarBanco())
  const b = db.banco
  for (let i = 0; i < 40; i++) b.prepare("INSERT INTO carrinhos (id, email, criado_em) VALUES (?, ?, datetime('now', '-2 hours'))").run(`c${i}`, `c${i}@example.com`)
  for (let i = 0; i < 20; i++) {
    b.prepare(`INSERT INTO leads (id, nome, email, whatsapp, consentimento, consentimento_em, token_hash, token_expira_em, etapa_email, proximo_email_em)
      VALUES (?, 'L', ?, '27999999999', 1, datetime('now', '-7 days'), ?, datetime('now'), 0, datetime('now', '-1 minute'))`).run(i + 1, `l${i}@example.com`, `h${i}`)
  }
  b.prepare('UPDATE instagram_estado SET ia_ligada = 1 WHERE id = 1').run()
  const env = { DB: db, MODO: 'ativo', TESTE_PARA: 't@example.com', EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>', EMAIL_REPLY_TO: 'c@trilhaviva.org',
    SITE_URL: 'https://trilhaviva.org', TETO_DIA: '40', TETO_MES: '1100', RESEND_API_KEY: 'k', LEMBRETE_SEGREDO: 'segredo', IG_ACCOUNT_ID: '1784' }
  const m = falso(ids(30))
  let rodadas = 0
  for (; rodadas < 6; rodadas++) {
    const medidor = {}
    await executarRodada(env, {
      agora: new Date('2026-12-08T12:00:00Z'), logger: mudo, medidor, rascunho: m,
      fetchImpl: async () => new Response('{}', { status: 200 }),
    })
    assert.ok(medidor.total <= 50, `rodada ${rodadas + 1} gastou ${medidor.total}`)
    assert.ok(medidor.etapas.instagram >= medidor.etapas.afiliados)
  }
  assert.ok(m.geradas.length <= 3 * rodadas)
})

test('com folga, a rodada inteira também gera rascunho (a etapa instagram está ligada ao cron)', async () => {
  const db = new D1Local(criarBanco())
  db.banco.prepare('UPDATE instagram_estado SET ia_ligada = 1 WHERE id = 1').run()
  const env = { DB: db, MODO: 'ativo', TESTE_PARA: 't@example.com', SITE_URL: 'https://trilhaviva.org', TETO_DIA: '40', TETO_MES: '1100',
    RESEND_API_KEY: 'k', LEMBRETE_SEGREDO: 'segredo', IG_ACCOUNT_ID: '1784' }
  const m = falso(ids(2))
  const medidor = {}
  await executarRodada(env, { agora: new Date('2026-12-08T12:00:00Z'), logger: mudo, medidor, rascunho: m, fetchImpl: async () => new Response('{}') })
  assert.equal(m.geradas.length, 2)
  assert.ok(medidor.total <= 50)
})
