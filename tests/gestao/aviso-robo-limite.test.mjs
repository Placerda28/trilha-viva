import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { criarBanco, D1Local } from './_d1local.mjs'
import { consultarAvisos } from '../../lib/gestao/avisos.js'

const registrar = (b, quando, detalhe = '{"adiado":{"email":6},"consultas":47}') =>
  b.prepare("INSERT INTO registro (criado_em, quem, acao, alvo, detalhe) VALUES (?, 'robo', 'robo_limite', 'email', ?)").run(quando, detalhe)

// avisosDaApi é função pura dentro de um .jsx: extrai só ela (sem JSX) para rodar aqui.
function avisosDaApi() {
  const fonte = readFileSync('components/gestao/Avisos.jsx', 'utf8').replace(/\r\n/g, '\n')
  const recorte = fonte.slice(fonte.indexOf('function plural'), fonte.indexOf('// `estado`:')).replace('export function', 'function')
  return runInNewContext(`${recorte}; avisosDaApi`, { Date, Math })
}

test('consultarAvisos conta as rodadas com limite dos últimos 7 dias (1 consulta) e some sem ocorrência', async () => {
  const b = criarBanco()
  const db = new D1Local(b)
  assert.equal((await consultarAvisos(db, {})).robo_limite_7d, null)
  registrar(b, "2000-01-01 10:00:00") // velho: fora da janela
  assert.equal((await consultarAvisos(db, {})).robo_limite_7d, null)
  b.exec("INSERT INTO registro (quem, acao) VALUES ('robo', 'outra_coisa')")
  assert.equal((await consultarAvisos(db, {})).robo_limite_7d, null)
  const dia = (n) => b.prepare("SELECT datetime('now', ?) AS d").get(`-${n} days`).d
  registrar(b, dia(1))
  registrar(b, dia(1))
  registrar(b, dia(3))
  const l = (await consultarAvisos(db, {})).robo_limite_7d
  assert.equal(l.vezes, 3)
  assert.equal(l.dias, 2)
  assert.match(l.ultima, /^\d{4}-\d\d-\d\dT.*Z$/)
  // O lote do limite custa 1 consulta: uma a mais que antes, e cai com segurança se a tabela falhar.
  b.exec('DROP TABLE registro')
  const sem = await consultarAvisos(new D1Local(b), {})
  assert.equal(sem.robo_limite_7d, null)
})

test('Painel: o aviso mostra o número, a data da última vez e a orientação; sem ocorrência não aparece', () => {
  const lista = avisosDaApi()
  assert.equal(lista({ robo_limite_7d: null }, '2026-11-05T12:00:00Z').length, 0)
  const [a] = lista({ robo_limite_7d: { vezes: 3, dias: 2, ultima: '2026-11-04T15:30:00.000Z' } }, '2026-11-05T12:00:00Z')
  assert.equal(a.id, 'robo-limite')
  assert.match(a.texto, /limite do plano grátis 3 vezes nos últimos 7 dias/)
  assert.match(a.texto, /04\/11/)
  assert.match(a.texto, /plano pago do Cloudflare/)
  const [u] = lista({ robo_limite_7d: { vezes: 1, dias: 1, ultima: '2026-11-04T15:30:00.000Z' } }, '2026-11-05T12:00:00Z')
  assert.match(u.texto, /1 vez nos últimos/)
})
