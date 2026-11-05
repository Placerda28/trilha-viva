import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fechar, novoAfiliado, novoDb, vendas } from './_base.mjs'

const SQL = readFileSync(new URL('../../migrations/0022_afiliados_saque_mensal.sql', import.meta.url), 'utf8')
const ATE = '9999-12-31 23:59:59'

test('0022: vendas de mês aberto voltam a "só no fechamento"; mês fechado, saque e ajuste não mudam; repetir não muda nada', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 2, new Date('2026-10-10T15:00:00Z'))
  await fechar(db, '2026-10', new Date('2026-11-09T12:00:00Z')) // outubro fechado: disponivel_em = 09/11
  await vendas(db, af, 3) // novembro, aberto
  // estado de antes da mudança: carência de 7 dias gravada nas vendas de novembro
  db.banco.prepare("UPDATE afiliados_lancamentos SET disponivel_em = '2026-11-17 15:00:00' WHERE mes_referencia = '2026-11'").run()
  db.banco.prepare("INSERT INTO afiliados_lancamentos (afiliado_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, descricao) VALUES (?, 'ajuste', '2026-11', 500, 'pendente', '2026-11-05 12:00:00', 'Ajuste: x')").run(af.id)
  const foto = () => db.banco.prepare('SELECT id, tipo, mes_referencia, disponivel_em FROM afiliados_lancamentos ORDER BY id').all().map((l) => [l.tipo, l.mes_referencia, l.disponivel_em])

  db.banco.exec(SQL)
  const depois = foto()
  assert.deepEqual(
    depois.filter(([t, m]) => t === 'venda' && m === '2026-11').map((x) => x[2]),
    [ATE, ATE, ATE],
  )
  assert.deepEqual(depois.filter(([t, m]) => t === 'venda' && m === '2026-10').map((x) => x[2]), ['2026-11-09 12:00:00', '2026-11-09 12:00:00'])
  assert.equal(depois.find(([t]) => t === 'ajuste')[2], '2026-11-05 12:00:00')
  db.banco.exec(SQL) // idempotente
  assert.deepEqual(foto(), depois)
})
