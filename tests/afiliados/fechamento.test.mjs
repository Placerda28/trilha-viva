import test from 'node:test'
import assert from 'node:assert/strict'
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { estornarVenda, gravarComissaoBase } from '../../lib/afiliados/comissao.js'
import { restaurarCompra } from '../../lib/afiliados/venda.js'
import { statusDoMes } from '../../lib/afiliados/status.js'
import { FECHA, NOV, contar, novaVenda, novoAfiliado, novoDb, vendas } from './_base.mjs'

const BONUS = "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE tipo = 'bonus_nivel'"

test('fechamento rodado 2x não duplica lançamento nem fechamento', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 20)
  const a = await fecharMes(db, '2026-11', FECHA)
  const b = await fecharMes(db, '2026-11', FECHA)
  assert.equal(a.fechados.length, 1)
  assert.equal(b.fechados.length, 0)
  assert.equal(contar(db, 'SELECT COUNT(*) n FROM afiliados_fechamentos'), 1)
  assert.equal(contar(db, BONUS), 1)
  const f = db.banco.prepare('SELECT * FROM afiliados_fechamentos').get()
  assert.equal(f.total_centavos, 40000)
  assert.equal(f.bonus_centavos, 10000)
  assert.equal(JSON.parse(f.niveis_snapshot).niveis.length, 3)
})

test('20 vendas - 1 reembolso antes do fechamento = 19 = Bronze, 28500', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const ids = await vendas(db, af, 20)
  assert.equal((await estornarVenda(db, ids[0], new Date('2026-11-20T12:00:00Z'))).acao, 'cancelada')
  await fecharMes(db, '2026-11', FECHA)
  const f = db.banco.prepare('SELECT * FROM afiliados_fechamentos').get()
  assert.equal(f.vendas_validas, 19)
  assert.equal(f.vendas_reembolsadas, 1)
  assert.equal(f.total_centavos, 28500)
  assert.equal(f.bonus_centavos, 0)
  assert.equal(contar(db, BONUS), 0)
  const s = await statusDoMes(db, af.id, '2026-11', FECHA)
  assert.equal(s.nivel.nome, 'Bronze')
  assert.equal(s.saldos.disponivel, 28500)
})

test('estorno depois do fechamento vira lançamento negativo; nível fechado não muda', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const ids = await vendas(db, af, 20)
  await fecharMes(db, '2026-11', FECHA)
  const antes = await statusDoMes(db, af.id, '2026-11', FECHA)
  assert.equal(antes.saldos.disponivel, 20 * 1500 + 10000)

  const depois = new Date('2026-12-15T12:00:00Z')
  assert.equal((await estornarVenda(db, ids[0], depois)).acao, 'estorno')
  const rep = await estornarVenda(db, ids[0], depois)
  assert.equal(rep.criado, false)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE tipo = 'estorno'"), 1)

  const s = await statusDoMes(db, af.id, '2026-11', depois)
  assert.equal(s.nivel.nome, 'Prata')
  assert.equal(s.vendasValidas, 20)
  assert.equal(s.totalPrevisto, 40000)
  assert.equal(s.saldos.disponivel, 20 * 1500 + 10000 - 2000)
  const est = db.banco.prepare("SELECT valor_centavos v, status FROM afiliados_lancamentos WHERE tipo = 'estorno'").get()
  assert.equal(est.v, -2000)
  assert.equal(est.status, 'pendente')
})

test('comissão base repetida para a mesma compra não duplica', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const id = await novaVenda(db, af)
  const r = await gravarComissaoBase(db, { afiliadoId: af.id, compraId: id, aprovadoEm: NOV })
  assert.equal(r.criado, false)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE tipo = 'venda'"), 1)
})

test('só o fechamento libera dinheiro: fechamento atrasado nunca libera antes, e libera o mês todo (base + bônus)', async () => {
  const db = novoDb()
  db.banco.prepare('UPDATE afiliados_config SET dia_fechamento = 1').run()
  const af = novoAfiliado(db)
  await vendas(db, af, 20, new Date('2026-11-30T15:00:00Z'))
  // 15 dias sem fechar (robô atrasado): continua tudo a liberar
  for (const quando of ['2026-12-01T12:00:00Z', '2026-12-07T15:00:00Z', '2026-12-15T15:00:00Z']) {
    const s = await statusDoMes(db, af.id, '2026-11', new Date(quando))
    assert.deepEqual([s.saldos.disponivel, s.saldos.liberando], [0, 30000], quando)
  }
  const fechou = new Date('2026-12-16T12:00:00Z')
  await fecharMes(db, '2026-11', fechou)
  const s = await statusDoMes(db, af.id, '2026-11', fechou)
  assert.deepEqual([s.saldos.disponivel, s.saldos.liberando], [40000, 0])
  // repetir o fechamento não mexe em nada
  await fecharMes(db, '2026-11', new Date('2026-12-17T12:00:00Z'))
  assert.equal(db.banco.prepare("SELECT DISTINCT disponivel_em d FROM afiliados_lancamentos").all().map((x) => x.d).join(), '2026-12-16 12:00:00')
})

test('fechar mês que ainda não pode ser fechado é recusado com mensagem', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 3)
  const r = await fecharMes(db, '2026-11', new Date('2026-11-16T12:00:00Z'))
  assert.equal(r.fechados.length, 0)
  assert.match(r.erro, /só pode ser feito a partir de 08\/12\/2026/)
  assert.equal((await fecharMes(db, '2026-11', new Date('2026-12-07T12:00:00Z'))).fechados.length, 0)
  assert.equal(contar(db, 'SELECT COUNT(*) n FROM afiliados_fechamentos'), 0)
  assert.equal((await fecharMes(db, '2026-11', FECHA)).fechados.length, 1)
})

test('estorno simultâneo desconta a venda uma vez só (cancela OU estorna)', async () => {
  for (const preso of [false, true]) {
    const db = novoDb()
    const af = novoAfiliado(db)
    const [id] = await vendas(db, af, 1)
    if (preso) db.banco.prepare("UPDATE afiliados_lancamentos SET status = 'em_saque'").run()
    const agora = new Date('2026-11-20T12:00:00Z')
    await Promise.all([estornarVenda(db, id, agora), estornarVenda(db, id, agora), estornarVenda(db, id, agora)])
    const n = contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE tipo = 'estorno'")
    const canc = contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE status = 'cancelada'")
    assert.equal(n + canc, 1)
    assert.equal(n, preso ? 1 : 0)
  }
})

test('fechamentos concorrentes: o bônus sai da linha de fechamento gravada', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 20)
  // Outra rodada grava o fechamento com 19 vendas (Bronze, sem bônus) antes do lote desta.
  const concorrente = {
    prepare: (sql) => db.prepare(sql),
    batch: async (lista) => {
      db.banco
        .prepare(`INSERT INTO afiliados_fechamentos (afiliado_id, mes_referencia, vendas_validas, niveis_snapshot,
                  base_centavos, bonus_centavos, total_centavos) VALUES (?, '2026-11', 19, '{"niveis":[],"nivel":null}', 28500, 0, 28500)`)
        .run(af.id)
      return db.batch(lista)
    },
  }
  await fecharMes(concorrente, '2026-11', FECHA)
  assert.equal(contar(db, BONUS), 0)
  assert.equal(contar(db, 'SELECT COUNT(*) n FROM afiliados_fechamentos'), 1)
})

test('venda aprovada depois do fechamento do mês recebe o valor do nível fechado', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 20)
  await fecharMes(db, '2026-11', FECHA)
  const id = await novaVenda(db, af, new Date('2026-11-30T23:00:00Z'))
  const l = db.banco.prepare("SELECT * FROM afiliados_lancamentos WHERE compra_id = ? AND tipo = 'venda'").get(id)
  assert.equal(l.mes_referencia, '2026-11')
  assert.equal(l.valor_centavos, 2000) // Prata fechado, não os 1500 do Bronze
  assert.equal(l.disponivel_em, '2026-11-30 23:00:00') // mês já fechado: disponível na hora da aprovação (já passou)
  const s = await statusDoMes(db, af.id, '2026-11', FECHA)
  assert.equal(s.vendasValidas, 20)
  assert.equal(s.nivel.nome, 'Prata')
})

// db que roda `acao` dentro do lote (depois das leituras, antes do INSERT), nas primeiras `vezes` chamadas.
function comInterferencia(db, acao, vezes) {
  let n = 0
  return {
    prepare: (sql) => db.prepare(sql),
    batch: async (lista) => {
      if (n < vezes) {
        n += 1
        await acao()
      }
      return db.batch(lista)
    },
  }
}

test('fechamento: venda cancelada dentro do intervalo não gera bônus errado', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const ids = await vendas(db, af, 20)
  const cancela = () => estornarVenda(db, ids[0], new Date('2026-12-01T12:00:00Z'))
  const r = await fecharMes(comInterferencia(db, cancela, 1), '2026-11', FECHA)
  assert.equal(r.pendentes.length, 0)
  const f = db.banco.prepare('SELECT * FROM afiliados_fechamentos').get()
  assert.equal(f.vendas_validas, 19)
  assert.equal(f.total_centavos, 28500)
  assert.equal(contar(db, BONUS), 0)
  assert.equal((await statusDoMes(db, af.id, '2026-11', FECHA)).saldos.disponivel, 28500)
})

test('fechamento: venda nova dentro do intervalo entra na contagem do bônus', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 20)
  const nova = () => novaVenda(db, af, new Date('2026-11-30T12:00:00Z'))
  await fecharMes(comInterferencia(db, nova, 1), '2026-11', FECHA)
  const f = db.banco.prepare('SELECT * FROM afiliados_fechamentos').get()
  assert.equal(f.vendas_validas, 21)
  assert.equal(f.bonus_centavos, 21 * 500)
  assert.equal(db.banco.prepare("SELECT valor_centavos v FROM afiliados_lancamentos WHERE tipo = 'bonus_nivel'").get().v, 10500)
})

test('fechamento: mudança contínua esgota as 3 tentativas e vai para pendentes', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 3)
  const nova = () => novaVenda(db, af, new Date('2026-11-30T12:00:00Z'))
  const r = await fecharMes(comInterferencia(db, nova, 99), '2026-11', FECHA)
  assert.equal(r.fechados.length, 0)
  assert.equal(r.pendentes.length, 1)
  assert.match(r.pendentes[0].motivo, /Repita o fechamento/)
  assert.equal(contar(db, 'SELECT COUNT(*) n FROM afiliados_fechamentos'), 0)
  assert.equal((await fecharMes(db, '2026-11', FECHA)).fechados.length, 1) // botão manual repete
})

test('estornos concorrentes: só quem agiu recebe acao/criado exatos', async () => {
  for (const preso of [false, true]) {
    const db = novoDb()
    const af = novoAfiliado(db)
    const [id] = await vendas(db, af, 1)
    if (preso) db.banco.prepare("UPDATE afiliados_lancamentos SET status = 'em_saque'").run()
    const agora = new Date('2026-11-20T12:00:00Z')
    const rs = await Promise.all([estornarVenda(db, id, agora), estornarVenda(db, id, agora), estornarVenda(db, id, agora)])
    if (preso) {
      assert.equal(rs.filter((r) => r.acao === 'estorno' && r.criado === true).length, 1)
      assert.equal(rs.filter((r) => r.acao === 'estorno' && r.criado === false).length, 2)
    } else {
      assert.equal(rs.filter((r) => r.acao === 'cancelada').length, 1)
      assert.equal(rs.filter((r) => r.acao === 'ja_cancelada').length, 2)
    }
  }
})

test('estorno depois do fechamento + compra paga de novo: devolução devolve o saldo, 1 vez só, nível fica', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const ids = await vendas(db, af, 20)
  await fecharMes(db, '2026-11', FECHA)
  const depois = new Date('2026-12-15T12:00:00Z')
  const original = (await statusDoMes(db, af.id, '2026-11', depois)).saldos.disponivel
  await estornarVenda(db, ids[0], depois) // mediação ou chargeback: o lançamento é o mesmo
  const sessao = db.banco.prepare('SELECT stripe_session_id s FROM compras WHERE id = ?').get(ids[0]).s
  await restaurarCompra(db, sessao, null)
  await restaurarCompra(db, sessao, null) // aviso repetido
  const dev = db.banco.prepare("SELECT valor_centavos v, status, descricao d FROM afiliados_lancamentos WHERE tipo = 'ajuste'").all()
  assert.deepEqual(dev.map((l) => [l.v, l.status, l.d]), [[2000, 'pendente', `Devolução: compra #${ids[0]} confirmada`]])
  const s = await statusDoMes(db, af.id, '2026-11', depois)
  assert.equal(s.saldos.disponivel, original)
  assert.equal(s.nivel.nome, 'Prata')
})

test('restaurarCompra sem estorno não cria devolução', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const [id] = await vendas(db, af, 1)
  const sessao = db.banco.prepare('SELECT stripe_session_id s FROM compras WHERE id = ?').get(id).s
  await restaurarCompra(db, sessao, null)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE tipo = 'ajuste'"), 0)
})
