import test from 'node:test'
import assert from 'node:assert/strict'
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { lancamentosDoAfiliado, pedirSaque, saquesDoAfiliado } from '../../lib/afiliados/saque.js'
import { statusDoMes } from '../../lib/afiliados/status.js'
import { estornarVenda } from '../../lib/afiliados/comissao.js'
import { FECHA, comPix, contar, fechar, novaVenda, novoAfiliado, novoDb, vendas } from './_base.mjs'

const OUT = new Date('2026-10-10T15:00:00Z') // aprovação das vendas de outubro
const ST = (db, id, agora) => statusDoMes(db, id, '2026-11', agora).then((s) => s.saldos)

test('saque barrado: sem Pix e sem saldo; com Pix e saldo libera tudo (só depois do fechamento)', async () => {
  const db = novoDb()
  const af = novoAfiliado(db, { pix: false })
  await vendas(db, af, 2)
  let r = await pedirSaque(db, af.id, FECHA)
  assert.deepEqual([r.ok, r.motivo], [false, 'Cadastre sua chave Pix para sacar'])

  const sem = novoAfiliado(db)
  r = await pedirSaque(db, sem.id, FECHA)
  assert.deepEqual([r.ok, r.motivo], [false, 'Ainda não há valor disponível'])

  // dia 8, mas novembro ainda não foi fechado: nada sai
  const comPixAf = comPix(db, af)
  r = await pedirSaque(db, comPixAf.id, FECHA)
  assert.equal(r.motivo, 'O fechamento do mês anterior está sendo feito. Tente de novo em alguns minutos.')

  await fechar(db)
  r = await pedirSaque(db, af.id, FECHA)
  assert.equal(r.ok, true)
  assert.equal(r.valor_centavos, 3000)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE status = 'em_saque' AND saque_id IS NOT NULL"), 2)
  assert.equal((await ST(db, af.id, FECHA)).disponivel, 0)
})

test('nada fica disponível antes do fechamento; no fechamento o total do mês libera de uma vez', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 20) // Prata: 20 x 20,00 = 400,00 (base 300 + bônus 100)
  for (const quando of ['2026-11-10T16:00:00Z', '2026-11-20T12:00:00Z', '2026-12-01T12:00:00Z', '2026-12-07T12:00:00Z']) {
    const s = await ST(db, af.id, new Date(quando))
    assert.deepEqual([s.disponivel, s.liberando], [0, 30000], quando) // nem a base de 7+ dias sai
  }
  assert.equal(db.banco.prepare("SELECT COUNT(DISTINCT disponivel_em) n FROM afiliados_lancamentos WHERE tipo = 'venda'").get().n, 1)
  assert.equal(db.banco.prepare('SELECT MIN(disponivel_em) d FROM afiliados_lancamentos').get().d, '9999-12-31 23:59:59')

  // antes de 08/12 o fechamento nem roda
  assert.match((await fecharMes(db, '2026-11', new Date('2026-12-07T12:00:00Z'))).erro, /só pode ser feito a partir de 08\/12\/2026/)
  assert.equal((await ST(db, af.id, new Date('2026-12-07T12:00:00Z'))).disponivel, 0)

  await fechar(db)
  const s = await ST(db, af.id, FECHA)
  assert.deepEqual([s.disponivel, s.liberando], [40000, 0])
  // as vendas passam a valer a hora do fechamento; o bônus (escrituração) nasce com ela
  const quando = db.banco.prepare('SELECT DISTINCT disponivel_em d FROM afiliados_lancamentos').all().map((x) => x.d)
  assert.deepEqual(quando, ['2026-12-08 12:00:00'])
  // e o saque leva tudo de uma vez
  assert.equal((await pedirSaque(db, af.id, FECHA)).valor_centavos, 40000)
})

test('mês com reembolso antes do fechamento libera o total já descontado', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const ids = await vendas(db, af, 20)
  await estornarVenda(db, ids[0], new Date('2026-11-20T12:00:00Z')) // 19 vendas: Bronze, 19 x 15,00
  await fechar(db)
  assert.equal((await ST(db, af.id, FECHA)).disponivel, 28500)
})

test('limites do nível: 0/1/19/20/49/50/51 vendas dão 0/15/285/400/980/1500/1530 liberados no fechamento', async () => {
  for (const [n, total] of [[0, 0], [1, 1500], [19, 28500], [20, 40000], [49, 98000], [50, 150000], [51, 153000]]) {
    const db = novoDb()
    const af = novoAfiliado(db)
    if (n) await vendas(db, af, n)
    await fechar(db)
    assert.equal((await ST(db, af.id, FECHA)).disponivel, total, `${n} vendas`)
  }
})

test('venda de mês já fechado (aviso atrasado) fica disponível na hora', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 2)
  await fechar(db)
  await novaVenda(db, af, new Date('2026-11-25T12:00:00Z')) // aprovação de novembro, chegou depois do fechamento
  assert.equal((await ST(db, af.id, FECHA)).disponivel, 4500)
})

test('1 saque por ciclo (08 a 07): antes do primeiro dia 8 bloqueia, dia 8 libera, segundo pedido no ciclo bloqueia até o novo dia 8', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 3, OUT)
  // 07/11: outubro ainda não fechou
  let r = await pedirSaque(db, af.id, new Date('2026-11-07T12:00:00Z'))
  assert.equal(r.motivo, 'O saque abre em 08/11')
  // 08/11 00:30 em Brasília, antes de o robô fechar
  r = await pedirSaque(db, af.id, new Date('2026-11-08T03:30:00Z'))
  assert.equal(r.motivo, 'O fechamento do mês anterior está sendo feito. Tente de novo em alguns minutos.')
  await fechar(db, '2026-10', new Date('2026-11-08T12:00:00Z'))
  // 08/11: libera, o saldo inteiro
  r = await pedirSaque(db, af.id, new Date('2026-11-08T12:30:00Z'))
  assert.deepEqual([r.ok, r.valor_centavos], [true, 4500])
  // saque em análise
  r = await pedirSaque(db, af.id, new Date('2026-11-09T12:00:00Z'))
  assert.equal(r.motivo, 'Você já tem um saque em análise (pedido em 08/11)')
  // pago: ainda é o mesmo mês, mesmo com saldo novo (aviso atrasado de outubro: mês fechado, disponível na hora)
  db.banco.prepare("UPDATE afiliados_saques SET status = 'pago', pago_em = '2026-11-09 12:00:00'").run()
  db.banco.prepare("UPDATE afiliados_lancamentos SET status = 'paga' WHERE status = 'em_saque'").run()
  await novaVenda(db, af, new Date('2026-10-31T12:00:00Z'))
  r = await pedirSaque(db, af.id, new Date('2026-11-20T12:00:00Z'))
  assert.equal(r.motivo, 'Você já pediu o saque deste ciclo (em 08/11). O próximo abre em 08/12')
  assert.equal((await pedirSaque(db, af.id, new Date('2026-11-30T20:00:00Z'))).motivo, 'Você já pediu o saque deste ciclo (em 08/11). O próximo abre em 08/12')
  // o mês virou, mas o ciclo (08/11 a 07/12) não: 07/12 ainda bloqueia; o novo ciclo abre em 08/12
  assert.equal((await pedirSaque(db, af.id, new Date('2026-12-07T12:00:00Z'))).motivo, 'Você já pediu o saque deste ciclo (em 08/11). O próximo abre em 08/12')
  assert.equal((await pedirSaque(db, af.id, new Date('2026-12-08T02:59:00Z'))).ok, false) // 07/12 23:59 em Brasília
  r = await pedirSaque(db, af.id, new Date('2026-12-08T12:00:00Z'))
  assert.deepEqual([r.ok, r.valor_centavos], [true, 1500])
})

test('ciclo: esqueceu de pedir em novembro, em 03/12 pede na hora; com pedido em 10/11, 03/12 bloqueia e 08/12 abre', async () => {
  const esqueceu = novoDb()
  const a = novoAfiliado(esqueceu)
  await vendas(esqueceu, a, 3, OUT)
  await fechar(esqueceu, '2026-10', new Date('2026-11-08T12:00:00Z'))
  const r = await pedirSaque(esqueceu, a.id, new Date('2026-12-03T12:00:00Z'))
  assert.deepEqual([r.ok, r.valor_centavos], [true, 4500])

  const pediu = novoDb()
  const b = novoAfiliado(pediu)
  await vendas(pediu, b, 3, OUT)
  await fechar(pediu, '2026-10', new Date('2026-11-08T12:00:00Z'))
  assert.equal((await pedirSaque(pediu, b.id, new Date('2026-11-10T12:00:00Z'))).ok, true)
  pediu.banco.prepare("UPDATE afiliados_saques SET status = 'pago', pago_em = '2026-11-11 12:00:00'").run()
  pediu.banco.prepare("UPDATE afiliados_lancamentos SET status = 'paga' WHERE status = 'em_saque'").run()
  await novaVenda(pediu, b, new Date('2026-10-31T12:00:00Z')) // aviso atrasado de outubro: disponível
  const bloq = await pedirSaque(pediu, b.id, new Date('2026-12-03T12:00:00Z'))
  assert.deepEqual([bloq.ok, bloq.motivo], [false, 'Você já pediu o saque deste ciclo (em 10/11). O próximo abre em 08/12'])
  assert.equal((await pedirSaque(pediu, b.id, new Date('2026-12-08T12:00:00Z'))).ok, true)
})

test('saque recusado não conta: pede de novo no mesmo mês; pago fecha o mês', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 2, OUT)
  await fechar(db, '2026-10', new Date('2026-11-08T12:00:00Z'))
  assert.equal((await pedirSaque(db, af.id, new Date('2026-11-08T13:00:00Z'))).ok, true)
  db.banco.prepare("UPDATE afiliados_saques SET status = 'recusado'").run()
  db.banco.prepare("UPDATE afiliados_lancamentos SET status = 'pendente', saque_id = NULL WHERE status = 'em_saque'").run()
  const novo = await pedirSaque(db, af.id, new Date('2026-11-09T12:00:00Z'))
  assert.deepEqual([novo.ok, novo.valor_centavos], [true, 3000])
  db.banco.prepare("UPDATE afiliados_saques SET status = 'pago' WHERE status = 'solicitado'").run()
  db.banco.prepare("UPDATE afiliados_lancamentos SET status = 'paga' WHERE status = 'em_saque'").run()
  const r = await pedirSaque(db, af.id, new Date('2026-11-10T12:00:00Z'))
  assert.equal(r.ok, false)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_saques WHERE status != 'recusado'"), 1)
})

test('duas chamadas ao mesmo tempo criam só 1 saque', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 4)
  await fechar(db)
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
  await fechar(db)
  db.banco
    .prepare("INSERT INTO afiliados_lancamentos (afiliado_id, tipo, mes_referencia, valor_centavos, descricao) VALUES (?, 'ajuste', '2026-12', -500, 'x')")
    .run(af.id)
  assert.equal((await pedirSaque(db, af.id, FECHA)).valor_centavos, 2500)

  const db2 = novoDb()
  const b = novoAfiliado(db2)
  await vendas(db2, b, 1)
  await fechar(db2)
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
