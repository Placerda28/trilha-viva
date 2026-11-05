import test from 'node:test'
import assert from 'node:assert/strict'
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { dadosDoPainel, historicoMensal, mascararEmail, proximoSaqueEm, vendasDoMes } from '../../lib/afiliados/painel.js'
import { pedirSaque, saquesDoAfiliado } from '../../lib/afiliados/saque.js'
import { estornarVenda, gravarComissaoBase } from '../../lib/afiliados/comissao.js'
import { comPix, fechar, novoAfiliado, novoDb } from './_base.mjs'

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
  assert.deepEqual(p.aReceber, { mes: '2026-11', valor: 0, liberaEm: '2026-12-08' })
  assert.equal(p.aReceberMesAnterior, null)
  assert.deepEqual(p.seBaterProximo, { total: 1500 })
  assert.deepEqual([p.disponivel, p.emSaque, p.jaRecebido], [0, 0, 0])
  assert.equal(p.mesPassado, null)
  assert.equal(p.variacaoPct, null)
  assert.deepEqual(p.ultimasVendas, [])
  assert.deepEqual(p.avisos, [])
  assert.equal(p.vendasPorDia.length, 10)
  assert.ok(p.vendasPorDia.every((d) => d.vendas === 0))
  assert.deepEqual(p.saque, { pode: false, valor: 0, motivo: 'Ainda não há valor disponível', abreEm: null })
})

test('painel: nível, faltam, dias restantes e ritmo; o a receber é o mês inteiro pela meta atual', async () => {
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
  assert.deepEqual(p.aReceber, { mes: '2026-11', valor: 22500, liberaEm: '2026-12-08' })
  assert.equal(p.disponivel, 0) // nada disponível antes do fechamento
  assert.equal(p.vendasPorDia.find((d) => d.dia === '2026-11-10').vendas, 15)
  assert.equal(p.vendasPorDia.reduce((s, d) => s + d.vendas, 0), 15)

  await varias(db, af, 5, em('2026-11-11T15:00:00'))
  p = await dadosDoPainel(db, af.id, hoje)
  assert.equal(p.nivel.nome, 'Prata')
  assert.deepEqual(p.aReceber, { mes: '2026-11', valor: 40000, liberaEm: '2026-12-08' }) // retroativo: as 20 valem R$ 20,00
  assert.equal(p.ultimasVendas.length, 5)
  // fora da Gestão não se fala em garantido, base nem bônus
  assert.ok(!/garantido|bonus|base|cartoes|ganhos/i.test(JSON.stringify(p)), 'o painel vaza escrituração interna')
})

test('painel: o mês passado aparece como a receber até o fechamento e depois vira disponível', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await varias(db, af, 20, em('2026-10-10T15:00:00')) // Prata em outubro: 20 x 20,00
  await varias(db, af, 2, em('2026-11-02T15:00:00'))
  const dia3 = em('2026-11-03T15:00:00')
  let p = await dadosDoPainel(db, af.id, dia3)
  assert.deepEqual(p.aReceber, { mes: '2026-11', valor: 3000, liberaEm: '2026-12-08' })
  assert.deepEqual(p.aReceberMesAnterior, { mes: '2026-10', valor: 40000, liberaEm: '2026-11-08' })
  assert.equal(p.disponivel, 0)
  assert.equal(p.mesPassado.vendas, 20)
  assert.equal(p.mesPassado.nivel.nome, 'Prata')
  assert.equal(p.mesPassado.total, 40000)
  assert.equal(p.variacaoPct, -90)

  const dia8 = em('2026-11-08T12:00:00')
  await fecharMes(db, '2026-10', dia8)
  p = await dadosDoPainel(db, af.id, dia8)
  // o mês fechou: sai de "a receber" e entra de uma vez em "disponível" (sem contar duas vezes)
  assert.equal(p.aReceberMesAnterior, null)
  assert.equal(p.disponivel, 40000)
  assert.deepEqual(p.aReceber, { mes: '2026-11', valor: 3000, liberaEm: '2026-12-08' })
  assert.deepEqual(p.saque, { pode: true, valor: 40000, motivo: null, abreEm: null })
})

test('painel: o dia do fechamento da configuração vale para a data de liberação', async () => {
  const db = novoDb()
  db.banco.prepare('UPDATE afiliados_config SET dia_fechamento = 15').run()
  const af = novoAfiliado(db)
  await varias(db, af, 1, em('2026-10-10T15:00:00'))
  await varias(db, af, 1, em('2026-11-02T15:00:00'))
  const p = await dadosDoPainel(db, af.id, em('2026-11-03T15:00:00'))
  assert.equal(p.aReceber.liberaEm, '2026-12-15')
  assert.equal(p.aReceberMesAnterior.liberaEm, '2026-11-15')
})

test('painel: motivos do saque iguais aos de pedirSaque e valor = disponível', async () => {
  const db = novoDb()
  const semPix = novoAfiliado(db, { pix: false })
  await varias(db, semPix, 2, em('2026-11-10T15:00:00'))
  const durante = em('2026-11-20T15:00:00')
  let p = await dadosDoPainel(db, semPix.id, durante)
  assert.deepEqual(p.saque, { pode: false, valor: 0, motivo: 'Cadastre sua chave Pix para sacar', abreEm: null })
  assert.equal((await pedirSaque(db, semPix.id, durante)).motivo, p.saque.motivo)

  comPix(db, semPix)
  p = await dadosDoPainel(db, semPix.id, durante)
  assert.deepEqual(p.saque, { pode: false, valor: 0, motivo: 'Seu saldo deste mês ainda não fechou: libera em 08/12', abreEm: '2026-12-08' })
  assert.equal((await pedirSaque(db, semPix.id, durante)).motivo, p.saque.motivo)
  assert.equal(await proximoSaqueEm(db, semPix.id, durante), '2026-12-08')

  await fechar(db)
  const dia8 = em('2026-12-08T15:00:00')
  p = await dadosDoPainel(db, semPix.id, dia8)
  assert.deepEqual(p.saque, { pode: true, valor: 3000, motivo: null, abreEm: null })
  assert.equal(db.banco.prepare('SELECT COUNT(*) n FROM afiliados_saques').get().n, 0) // conferir não grava nada

  assert.equal((await pedirSaque(db, semPix.id, dia8)).ok, true)
  p = await dadosDoPainel(db, semPix.id, dia8)
  assert.equal(p.saque.pode, false)
  assert.match(p.saque.motivo, /saque em análise/)
  assert.equal(p.disponivel, 0)
  assert.equal(p.emSaque, 3000)
  db.banco.prepare("UPDATE afiliados_saques SET status = 'pago', pago_em = '2026-12-09 12:00:00'").run()
  db.banco.prepare("UPDATE afiliados_lancamentos SET status = 'paga' WHERE status = 'em_saque'").run()
  const dia20 = em('2026-12-20T15:00:00')
  p = await dadosDoPainel(db, semPix.id, dia20)
  assert.deepEqual([p.saque.motivo, p.saque.abreEm, p.jaRecebido], ['Você já pediu o saque deste ciclo (em 08/12). O próximo abre em 08/01', '2027-01-08', 3000])
  assert.equal(await proximoSaqueEm(db, semPix.id, dia20), '2027-01-08')

  const sus = novoAfiliado(db, { status: 'suspenso' })
  p = await dadosDoPainel(db, sus.id, durante)
  assert.deepEqual([p.saque.pode, p.saque.motivo], [false, 'Sua conta de afiliado não está ativa'])
})

test('vendasDoMes: comprador mascarado, resumo com canceladas e situações, sem comissão por venda', async () => {
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
  assert.deepEqual([nova.situacao, nova.situacaoEm], ['conta', null]) // conta para a meta
  assert.equal(nova.valorPagoCentavos, 8990)
  assert.deepEqual(Object.keys(nova).sort(), ['compraId', 'comprador', 'data', 'situacao', 'situacaoEm', 'valorPagoCentavos'])
  const bruto = JSON.stringify(r)
  assert.ok(!bruto.includes('joao.silva'))
  assert.ok(!bruto.includes('"a@x.com"'))
  assert.equal(mascararEmail('joao@gmail.com'), 'jo***@gmail.com')
  assert.equal(mascararEmail('ab@gmail.com'), 'a***@gmail.com')
})

test('vendasDoMes: conta para a meta, cancelada (reembolso) e paga em DD/MM', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendaDe(db, af, 'um@x.com', em('2026-10-02T15:00:00'))
  const reemb = await vendaDe(db, af, 'dois@x.com', em('2026-10-03T15:00:00'))
  await fecharMes(db, '2026-10', em('2026-11-08T12:00:00'))
  const dia = em('2026-11-20T15:00:00')
  assert.deepEqual((await vendasDoMes(db, af.id, '2026-10', dia)).itens.map((v) => v.situacao), ['conta', 'conta'])
  await pedirSaque(db, af.id, dia)
  // em saque continua contando para a meta: o saque aparece na aba Saques
  assert.deepEqual((await vendasDoMes(db, af.id, '2026-10', dia)).itens.map((v) => v.situacao), ['conta', 'conta'])
  db.banco.exec("UPDATE afiliados_saques SET status = 'pago', pago_em = '2026-11-22 12:00:00', comprovante_caminho = 'x'")
  db.banco.exec("UPDATE afiliados_lancamentos SET status = 'paga'")
  const [p1] = (await vendasDoMes(db, af.id, '2026-10', dia)).itens
  assert.deepEqual([p1.situacao, p1.situacaoEm], ['paga', '2026-11-22'])
  // reembolso depois do fechamento: estorno negativo, a venda aparece como cancelada na data do estorno
  db.banco.prepare("UPDATE compras SET status = 'reembolsado' WHERE id = ?").run(reemb)
  await estornarVenda(db, reemb, em('2026-11-25T12:00:00'))
  const itens = (await vendasDoMes(db, af.id, '2026-10', dia)).itens
  const cancelada = itens.find((v) => v.compraId === reemb)
  assert.deepEqual([cancelada.situacao, cancelada.situacaoEm], ['cancelada', '2026-11-25'])
  const saques = await saquesDoAfiliado(db, af.id)
  assert.equal(saques[0].temComprovante, true)
})

test('historicoMensal: mês, vendas, nível, total e situação (em andamento, disponível, pago)', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await varias(db, af, 20, em('2026-09-10T15:00:00'))
  await varias(db, af, 3, em('2026-10-10T15:00:00'))
  await varias(db, af, 1, em('2026-11-02T15:00:00'))
  await fecharMes(db, '2026-09', em('2026-10-09T12:00:00'))
  const agora = em('2026-11-03T12:00:00')
  let h = await historicoMensal(db, af.id, 12, agora)
  assert.deepEqual(h.map((x) => [x.mes, x.situacao, x.vendasValidas, x.total]), [
    ['2026-11', 'em_andamento', 1, 1500],
    ['2026-10', 'em_andamento', 3, 4500],
    ['2026-09', 'disponivel', 20, 40000],
  ])
  assert.deepEqual(h.map((x) => x.liberaEm), ['2026-12-08', '2026-11-08', '2026-10-09'])
  assert.equal(h[2].nivel.nome, 'Prata')
  assert.deepEqual(Object.keys(h[2]).sort(), ['liberaEm', 'mes', 'nivel', 'situacao', 'total', 'vendasValidas'])
  assert.equal((await historicoMensal(db, af.id, 2, agora)).length, 2)

  // tudo de setembro pago: situação pago
  db.banco.exec("UPDATE afiliados_lancamentos SET status = 'paga' WHERE mes_referencia = '2026-09' AND tipo IN ('venda', 'bonus_nivel')")
  h = await historicoMensal(db, af.id, 12, agora)
  assert.equal(h[2].situacao, 'pago')

  // A Gestão (contabil) continua vendo garantido e bônus, com a situação antiga
  const c = await historicoMensal(db, af.id, 12, agora, { contabil: true })
  assert.deepEqual([c[2].garantido, c[2].bonus, c[2].total, c[2].situacao, c[2].fechadoEm], [30000, 10000, 40000, 'fechado', '2026-10-09'])
  assert.deepEqual([c[0].situacao, c[0].fechadoEm], ['em_andamento', null])
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
  assert.deepEqual([pb.aReceber.valor, pb.disponivel], [0, 0])
  assert.equal((await vendasDoMes(db, b.id, '2026-11', agora)).itens.length, 0)
  const pa = await dadosDoPainel(db, a.id, agora)
  assert.equal(pa.avisos.length, 1)
  assert.equal(pa.ultimasVendas.length, 1)
  assert.equal(pa.aReceber.valor, 1500)
})

test('a receber: outubro (até o fechamento) e novembro são duas linhas separadas, cada uma com a sua data', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await varias(db, af, 20, em('2026-10-10T15:00:00')) // outubro: 20 x 20,00
  await varias(db, af, 20, em('2026-11-01T15:00:00')) // previsto de novembro: 20 x 20,00
  const p = await dadosDoPainel(db, af.id, em('2026-11-03T15:00:00'))
  assert.deepEqual(p.aReceberMesAnterior, { mes: '2026-10', valor: 40000, liberaEm: '2026-11-08' })
  assert.deepEqual(p.aReceber, { mes: '2026-11', valor: 40000, liberaEm: '2026-12-08' })
})

test('saque: o Pix gravado é o do momento do INSERT, mesmo com troca no meio', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendaDe(db, af, 'a@x.com', em('2026-11-10T12:00:00'))
  await fechar(db)
  const original = db.batch.bind(db)
  db.batch = async (lista) => {
    // troca de Pix chega depois da conferência e antes do INSERT do saque
    db.banco.prepare("UPDATE afiliados_pix SET chave = 'chave-nova' WHERE afiliado_id = ?").run(af.id)
    return original(lista)
  }
  const r = await pedirSaque(db, af.id, em('2026-12-08T15:00:00'))
  assert.equal(r.ok, true)
  const snap = JSON.parse(db.banco.prepare('SELECT pix_snapshot FROM afiliados_saques WHERE id = ?').get(r.saqueId).pix_snapshot)
  assert.equal(snap.chave, 'chave-nova')
  assert.deepEqual(Object.keys(snap), ['tipo_chave', 'chave', 'titular_nome', 'titular_cpf'])
})
