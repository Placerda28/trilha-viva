import test from 'node:test'
import assert from 'node:assert/strict'
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { dadosDoPainel, historicoMensal, mascararEmail, proximoSaqueEm, vendasDoMes } from '../../lib/afiliados/painel.js'
import { pedirSaque, saquesDoAfiliado } from '../../lib/afiliados/saque.js'
import { gravarComissaoBase } from '../../lib/afiliados/comissao.js'
import { comPix, novoAfiliado, novoDb } from './_base.mjs'

const em = (s) => new Date(`${s}Z`)
let seq = 0

// Venda de um comprador de verdade (e-mail próprio), aprovada em `quando`.
export async function vendaDe(db, af, email, quando) {
  seq += 1
  db.banco.prepare('INSERT OR IGNORE INTO clientes (email) VALUES (?)').run(email)
  const cli = db.banco.prepare('SELECT id FROM clientes WHERE email = ?').get(email)
  const c = db.banco
    .prepare("INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, afiliado_id) VALUES (?, ?, 8990, 'pago', ?) RETURNING id")
    .get(cli.id, `mp_painel_${seq}`, af.id)
  await gravarComissaoBase(db, { afiliadoId: af.id, compraId: Number(c.id), aprovadoEm: quando })
  return Number(c.id)
}
async function varias(db, af, n, quando) {
  for (let i = 0; i < n; i++) await vendaDe(db, af, 'cliente@gmail.com', quando)
}

test('painel vazio: sem vendas, tudo zerado e sem erro', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const p = await dadosDoPainel(db, af.id, em('2026-11-10T15:00:00'))
  assert.equal(p.mes, '2026-11')
  assert.equal(p.nivel, null)
  assert.equal(p.proximo.nome, 'Bronze')
  assert.equal(p.faltam, 1)
  assert.equal(p.vendasValidas, 0)
  assert.deepEqual(p.niveis.map((n) => n.nome), ['Bronze', 'Prata', 'Ouro'])
  assert.deepEqual(p.ganhos, { garantido: 0, bonusPrevisto: 0, totalPrevisto: 0, bonusCaiEm: '2026-12-08' })
  assert.deepEqual(p.seBaterProximo, { total: 1500 })
  assert.equal(p.cartoes.disponivel, 0)
  assert.equal(p.cartoes.proximaLiberacao, null)
  assert.equal(p.cartoes.bonusAReceber, 0)
  assert.equal(p.mesPassado, null)
  assert.equal(p.variacaoPct, null)
  assert.deepEqual(p.ultimasVendas, [])
  assert.deepEqual(p.avisos, [])
  assert.equal(p.vendasPorDia.length, 10)
  assert.ok(p.vendasPorDia.every((d) => d.vendas === 0))
  assert.deepEqual(p.saque, { pode: false, valor: 0, motivo: 'Ainda não há valor disponível' })
})

test('painel: nível, faltam, dias restantes e ritmo; Prata soma o bônus', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await varias(db, af, 15, em('2026-11-10T15:00:00'))
  const hoje = em('2026-11-20T15:00:00')
  let p = await dadosDoPainel(db, af.id, hoje)
  assert.equal(p.nivel.nome, 'Bronze')
  assert.equal(p.proximo.nome, 'Prata')
  assert.equal(p.faltam, 5)
  assert.equal(p.diasRestantes, 11) // 20 a 30 de novembro, contando hoje
  assert.equal(p.ultimoDiaDoMes, '2026-11-30')
  assert.equal(p.ritmoNecessario, 0.5)
  assert.deepEqual(p.seBaterProximo, { total: 40000 })
  assert.deepEqual([p.ganhos.garantido, p.ganhos.bonusPrevisto, p.ganhos.totalPrevisto], [22500, 0, 22500])
  assert.equal(p.vendasPorDia.find((d) => d.dia === '2026-11-10').vendas, 15)
  assert.equal(p.vendasPorDia.reduce((s, d) => s + d.vendas, 0), 15)

  await varias(db, af, 5, em('2026-11-11T15:00:00'))
  p = await dadosDoPainel(db, af.id, hoje)
  assert.equal(p.nivel.nome, 'Prata')
  assert.deepEqual([p.ganhos.garantido, p.ganhos.bonusPrevisto, p.ganhos.totalPrevisto], [30000, 10000, 40000])
  assert.deepEqual(p.cartoes.bonusAReceber, 10000)
  assert.equal(p.ultimasVendas.length, 5)
})

test('painel: bônus a receber soma o mês passado até o fechamento e depois deixa de somar', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await varias(db, af, 20, em('2026-10-10T15:00:00')) // Prata em outubro: bônus 10.000
  await varias(db, af, 2, em('2026-11-02T15:00:00'))
  const dia3 = em('2026-11-03T15:00:00')
  let p = await dadosDoPainel(db, af.id, dia3)
  assert.equal(p.cartoes.bonusAReceber, 10000)
  assert.equal(p.cartoes.bonusAReceberEm, '2026-11-08')
  assert.equal(p.mesPassado.vendas, 20)
  assert.equal(p.mesPassado.nivel.nome, 'Prata')
  assert.equal(p.mesPassado.total, 40000)
  assert.equal(p.variacaoPct, -90)

  const dia8 = em('2026-11-08T12:00:00')
  await fecharMes(db, '2026-10', dia8)
  p = await dadosDoPainel(db, af.id, dia8)
  // o bônus agora é lançamento (disponível); não pode ser contado duas vezes como "a receber"
  assert.equal(p.cartoes.bonusAReceber, 0)
  assert.equal(p.cartoes.bonusAReceberEm, '2026-12-08')
  assert.ok(p.cartoes.disponivel >= 10000)
})

test('painel: motivos do saque iguais aos de pedirSaque e valor = disponível', async () => {
  const db = novoDb()
  const semPix = novoAfiliado(db, { pix: false })
  await varias(db, semPix, 2, em('2026-11-10T15:00:00'))
  const depois = em('2026-11-20T15:00:00')
  let p = await dadosDoPainel(db, semPix.id, depois)
  assert.deepEqual(p.saque, { pode: false, valor: 3000, motivo: 'Cadastre sua chave Pix para sacar' })
  assert.equal((await pedirSaque(db, semPix.id, depois)).motivo, p.saque.motivo)

  comPix(db, semPix)
  p = await dadosDoPainel(db, semPix.id, depois)
  assert.deepEqual(p.saque, { pode: true, valor: 3000, motivo: null })
  const antes = db.banco.prepare("SELECT COUNT(*) n FROM afiliados_saques").get().n
  assert.equal(antes, 0) // conferir não grava nada

  assert.equal((await pedirSaque(db, semPix.id, depois)).ok, true)
  p = await dadosDoPainel(db, semPix.id, depois)
  assert.equal(p.saque.pode, false)
  assert.match(p.saque.motivo, /saque em análise/)
  assert.equal(p.cartoes.disponivel, 0)
  assert.equal(await proximoSaqueEm(db, semPix.id, depois), '2026-12-05')

  const sus = novoAfiliado(db, { status: 'suspenso' })
  p = await dadosDoPainel(db, sus.id, depois)
  assert.deepEqual([p.saque.pode, p.saque.motivo], [false, 'Sua conta de afiliado não está ativa'])
})

test('painel: próxima liberação mostra o valor e o dia do primeiro lote', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await varias(db, af, 2, em('2026-11-10T15:00:00'))
  const p = await dadosDoPainel(db, af.id, em('2026-11-12T15:00:00'))
  assert.equal(p.cartoes.liberando, 3000)
  assert.deepEqual(p.cartoes.proximaLiberacao, { valor: 3000, em: '2026-11-17' })
})

test('vendasDoMes: comprador mascarado, resumo com canceladas e situações', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const c1 = await vendaDe(db, af, 'joao.silva@gmail.com', em('2026-11-02T15:00:00'))
  await vendaDe(db, af, 'a@x.com', em('2026-11-20T15:00:00'))
  db.banco.prepare("UPDATE afiliados_lancamentos SET status = 'cancelada' WHERE compra_id = ?").run(c1)
  const r = await vendasDoMes(db, af.id, '2026-11', em('2026-11-21T12:00:00'))
  assert.deepEqual(r.resumo, { total: 2, canceladas: 1, validas: 1 })
  const [nova, velha] = r.itens
  assert.equal(velha.compraId, c1)
  assert.equal(velha.situacao, 'cancelada')
  assert.equal(velha.comprador, 'jo***@gmail.com')
  assert.equal(nova.comprador, 'a***@x.com')
  assert.equal(nova.situacao, 'liberando')
  assert.equal(nova.situacaoEm, '2026-11-27')
  assert.equal(nova.valorPagoCentavos, 8990)
  assert.equal(nova.comissaoCentavos, 1500)
  const bruto = JSON.stringify(r)
  assert.ok(!bruto.includes('joao.silva'))
  assert.ok(!bruto.includes('"a@x.com"'))
  assert.equal(mascararEmail('joao@gmail.com'), 'jo***@gmail.com')
  assert.equal(mascararEmail('ab@gmail.com'), 'a***@gmail.com')
})

test('vendasDoMes: disponível, em saque e paga', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendaDe(db, af, 'um@x.com', em('2026-11-02T15:00:00'))
  const tarde = em('2026-11-20T15:00:00')
  assert.equal((await vendasDoMes(db, af.id, '2026-11', tarde)).itens[0].situacao, 'disponivel')
  await pedirSaque(db, af.id, tarde)
  const s = (await vendasDoMes(db, af.id, '2026-11', tarde)).itens[0]
  assert.deepEqual([s.situacao, s.situacaoEm], ['em_saque', '2026-11-20'])
  db.banco.exec("UPDATE afiliados_saques SET status = 'pago', pago_em = '2026-11-22 12:00:00', comprovante_caminho = 'x'")
  db.banco.exec("UPDATE afiliados_lancamentos SET status = 'paga'")
  const p = (await vendasDoMes(db, af.id, '2026-11', tarde)).itens[0]
  assert.deepEqual([p.situacao, p.situacaoEm], ['paga', '2026-11-22'])
  const saques = await saquesDoAfiliado(db, af.id)
  assert.equal(saques[0].temComprovante, true)
})

test('historicoMensal: mês atual em andamento, mês anterior aberto e meses fechados', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await varias(db, af, 20, em('2026-09-10T15:00:00'))
  await varias(db, af, 3, em('2026-10-10T15:00:00'))
  await varias(db, af, 1, em('2026-11-02T15:00:00'))
  await fecharMes(db, '2026-09', em('2026-10-09T12:00:00'))
  const h = await historicoMensal(db, af.id, 12, em('2026-11-03T12:00:00'))
  assert.deepEqual(h.map((x) => [x.mes, x.situacao, x.vendasValidas]), [
    ['2026-11', 'em_andamento', 1],
    ['2026-10', 'em_andamento', 3],
    ['2026-09', 'fechado', 20],
  ])
  assert.deepEqual([h[2].garantido, h[2].bonus, h[2].total, h[2].nivel.nome], [30000, 10000, 40000, 'Prata'])
  assert.equal(h[2].fechadoEm, '2026-10-09')
  assert.equal(h[0].fechadoEm, null)
  assert.equal((await historicoMensal(db, af.id, 2, em('2026-11-03T12:00:00'))).length, 2)
})

test('isolamento: um afiliado não enxerga vendas, avisos nem saques do outro', async () => {
  const db = novoDb()
  const a = novoAfiliado(db)
  const b = novoAfiliado(db)
  await vendaDe(db, a, 'so-do-a@x.com', em('2026-11-02T15:00:00'))
  db.banco.prepare("INSERT INTO afiliados_avisos (afiliado_id, tipo, titulo) VALUES (?, 'x', 'so do A')").run(a.id)
  const agora = em('2026-11-20T15:00:00')
  const pb = await dadosDoPainel(db, b.id, agora)
  assert.equal(pb.vendasValidas, 0)
  assert.deepEqual(pb.ultimasVendas, [])
  assert.deepEqual(pb.avisos, [])
  assert.equal(pb.cartoes.disponivel, 0)
  assert.equal((await vendasDoMes(db, b.id, '2026-11', agora)).itens.length, 0)
  const pa = await dadosDoPainel(db, a.id, agora)
  assert.equal(pa.avisos.length, 1)
  assert.equal(pa.ultimasVendas.length, 1)
})
