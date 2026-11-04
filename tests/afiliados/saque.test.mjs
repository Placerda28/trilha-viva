import test from 'node:test'
import assert from 'node:assert/strict'
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { lancamentosDoAfiliado, pedirSaque, saquesDoAfiliado } from '../../lib/afiliados/saque.js'
import { statusDoMes } from '../../lib/afiliados/status.js'
import { FECHA, comPix, contar, novoAfiliado, novoDb, vendas } from './_base.mjs'

const dia = (s) => new Date(`${s}T12:00:00Z`)

test('saque barrado: sem Pix e sem saldo; com Pix e saldo libera tudo', async () => {
  const db = novoDb()
  const af = novoAfiliado(db, { pix: false })
  await vendas(db, af, 2)
  let r = await pedirSaque(db, af.id, FECHA)
  assert.deepEqual([r.ok, r.motivo], [false, 'Cadastre sua chave Pix para sacar'])

  const sem = novoAfiliado(db)
  r = await pedirSaque(db, sem.id, FECHA)
  assert.deepEqual([r.ok, r.motivo], [false, 'Ainda não há valor disponível'])

  // venda ainda em carência: nada disponível
  r = await pedirSaque(db, comPix(db, af).id, new Date('2026-11-12T12:00:00Z'))
  assert.equal(r.motivo, 'Ainda não há valor disponível')

  r = await pedirSaque(db, af.id, FECHA)
  assert.equal(r.ok, true)
  assert.equal(r.valor_centavos, 3000)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE status = 'em_saque' AND saque_id IS NOT NULL"), 2)
  assert.equal((await statusDoMes(db, af.id, '2026-11', FECHA)).saldos.disponivel, 0)
})

test('saque barrado: saque aberto e intervalo de 15 dias', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 3)
  assert.equal((await pedirSaque(db, af.id, dia('2026-12-01'))).ok, true)

  let r = await pedirSaque(db, af.id, dia('2026-12-02'))
  assert.equal(r.motivo, 'Você já tem um saque em análise (pedido em 01/12)')

  db.banco.prepare("UPDATE afiliados_saques SET status = 'pago', pago_em = '2026-12-02 12:00:00'").run()
  db.banco.prepare("UPDATE afiliados_lancamentos SET status = 'paga' WHERE status = 'em_saque'").run()
  await vendas(db, af, 1, new Date('2026-11-20T12:00:00Z')) // base já liberada em dezembro
  r = await pedirSaque(db, af.id, dia('2026-12-10'))
  assert.equal(r.motivo, 'Próximo saque liberado em 6 dias (16/12)')

  r = await pedirSaque(db, af.id, dia('2026-12-16'))
  assert.equal(r.ok, true)
  assert.equal(r.valor_centavos, 1500)
})

test('duas chamadas ao mesmo tempo criam só 1 saque', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 4)
  const [a, b] = await Promise.all([pedirSaque(db, af.id, FECHA), pedirSaque(db, af.id, FECHA)])
  assert.equal([a, b].filter((x) => x.ok).length, 1)
  assert.equal(contar(db, 'SELECT COUNT(*) n FROM afiliados_saques'), 1)
  assert.equal(db.banco.prepare('SELECT valor_centavos v FROM afiliados_saques').get().v, 6000)
  assert.equal((await pedirSaque(db, af.id, FECHA)).ok, false)
  assert.equal(contar(db, 'SELECT COUNT(*) n FROM afiliados_saques'), 1)
})

test('saque desconta ajuste negativo e respeita o mínimo configurado', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 2)
  db.banco
    .prepare("INSERT INTO afiliados_lancamentos (afiliado_id, tipo, mes_referencia, valor_centavos, descricao) VALUES (?, 'ajuste', '2026-12', -500, 'x')")
    .run(af.id)
  assert.equal((await pedirSaque(db, af.id, FECHA)).valor_centavos, 2500)

  const db2 = novoDb()
  const b = novoAfiliado(db2)
  await vendas(db2, b, 1)
  db2.banco.prepare('UPDATE afiliados_config SET saque_minimo_centavos = 1500').run()
  assert.equal((await pedirSaque(db2, b.id, FECHA)).ok, false) // saldo 1500 não é > 1500
})

test('afiliado A não enxerga lançamentos nem saques de B', async () => {
  const db = novoDb()
  const a = novoAfiliado(db)
  const b = novoAfiliado(db)
  await vendas(db, a, 2)
  await vendas(db, b, 3)
  await fecharMes(db, '2026-11', FECHA)
  assert.equal((await pedirSaque(db, b.id, FECHA)).ok, true)

  assert.equal((await lancamentosDoAfiliado(db, a.id)).length, 2)
  assert.equal((await lancamentosDoAfiliado(db, b.id)).length, 3)
  assert.equal((await saquesDoAfiliado(db, a.id)).length, 0)
  assert.equal((await saquesDoAfiliado(db, b.id)).length, 1)
  const sa = await statusDoMes(db, a.id, '2026-11', FECHA)
  assert.equal(sa.vendasValidas, 2)
  assert.equal(sa.saldos.disponivel, 3000)
  assert.equal(sa.saldos.emSaque, 0)
  assert.ok((await lancamentosDoAfiliado(db, a.id)).every((l) => l.saque_id === null))
})

test('suspensão ou Pix removido entre a conferência e a gravação barra o saque', async () => {
  for (const motivo of ['suspender', 'sem-pix']) {
    const db = novoDb()
    const af = novoAfiliado(db)
    await vendas(db, af, 2)
    const corrida = {
      prepare: (sql) => db.prepare(sql),
      batch: async (lista) => {
        if (motivo === 'suspender') db.banco.prepare("UPDATE afiliados SET status = 'suspenso'").run()
        else db.banco.prepare('DELETE FROM afiliados_pix').run()
        return db.batch(lista)
      },
    }
    const r = await pedirSaque(corrida, af.id, FECHA)
    assert.equal(r.ok, false)
    assert.equal(contar(db, 'SELECT COUNT(*) n FROM afiliados_saques'), 0)
    assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE status = 'em_saque'"), 0)
  }
})
