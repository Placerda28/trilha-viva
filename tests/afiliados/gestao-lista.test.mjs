import test from 'node:test'
import assert from 'node:assert/strict'
import { listarAfiliados, POR_PAGINA } from '../../lib/afiliados/gestao-lista.js'
import { statusDoMes } from '../../lib/afiliados/status.js'
import { pedirSaque } from '../../lib/afiliados/saque.js'
import { gravarComprovante, marcarPago } from '../../lib/afiliados/saques-gestao.js'
import { caminhoDoComprovante } from '../../lib/b2-envio.js'
import { fechar, novoAfiliado, novoDb, vendas } from './_base.mjs'

const AGORA = new Date('2026-11-20T15:00:00Z')
const MES = '2026-11'

// Todos menos D têm vendas de outubro, já fechadas em 09/11: é o saldo que dá para sacar em 20/11 (novembro só fecha em 08/12).
// A=3 (Bronze), B=21 menos 1 estorno = 20 (Prata), C=50 (Ouro), D=0, E=19 (Bronze, falta 1). A tem saque pago, E tem saque pendente.
async function cenario() {
  const db = novoDb()
  const a = novoAfiliado(db)
  const b = novoAfiliado(db)
  const c = novoAfiliado(db)
  const d = novoAfiliado(db)
  const e = novoAfiliado(db)
  await vendas(db, a, 3)
  const idsB = await vendas(db, b, 21)
  await vendas(db, c, 50)
  await vendas(db, e, 19)
  const OUT = new Date('2026-10-10T15:00:00Z')
  await vendas(db, a, 3, OUT)
  await vendas(db, e, 2, OUT)
  await vendas(db, b, 2, OUT) // B e C ficam com saldo livre de outubro, sem sacar (B ainda desconta o estorno de R$ 20)
  await vendas(db, c, 1, OUT)
  await fechar(db, '2026-10', new Date('2026-11-09T12:00:00Z'))
  db.banco
    .prepare("INSERT INTO afiliados_lancamentos (afiliado_id, compra_id, tipo, mes_referencia, valor_centavos, status) VALUES (?, ?, 'estorno', ?, -2000, 'pendente')")
    .run(b.id, idsB[0], MES)
  const sa = await pedirSaque(db, a.id, AGORA)
  assert.equal(sa.ok, true)
  await gravarComprovante(db, { saqueId: sa.saqueId, caminho: caminhoDoComprovante(sa.saqueId, 'pdf') })
  assert.equal((await marcarPago(db, { saqueId: sa.saqueId, quem: 'm@t.com', agora: AGORA })).ok, true)
  assert.equal((await pedirSaque(db, e.id, AGORA)).ok, true)
  for (let i = 0; i < 100; i++) {
    db.banco.prepare("INSERT INTO afiliados_cliques (afiliado_id, criado_em, visitante_hash) VALUES (?, '2026-11-15 12:00:00', ?)").run(c.id, `h${i}`)
  }
  db.banco.prepare("UPDATE afiliados SET status = 'suspenso' WHERE id = ?").run(d.id)
  return { db, a, b, c, d, e }
}

test('a lista bate com statusDoMes para afiliados em níveis diferentes', async () => {
  const { db, a, b, c, d, e } = await cenario()
  const l = await listarAfiliados(db, { ordem: 'codigo', dir: 'asc' }, AGORA)
  assert.equal(l.mes, MES)
  assert.equal(l.total, 5)
  for (const af of [a, b, c, d, e]) {
    const s = await statusDoMes(db, af.id, MES, AGORA)
    const i = l.itens.find((x) => x.id === af.id)
    assert.equal(i.vendas_mes, s.vendasValidas, `vendas ${af.id}`)
    assert.equal(i.nivel?.id ?? null, s.nivel?.id ?? null, `nível ${af.id}`)
    assert.equal(i.faltam, s.faltam, `faltam ${af.id}`)
    assert.equal(i.comissao_prevista_centavos, s.totalPrevisto, `comissão ${af.id}`)
    assert.equal(i.disponivel_centavos, s.saldos.disponivel, `disponível ${af.id}`)
    assert.equal(i.total_pago_centavos, s.saldos.jaRecebido, `pago ${af.id}`)
  }
  const nome = (af) => l.itens.find((x) => x.id === af.id)
  assert.deepEqual([nome(a).nivel.nome, nome(b).nivel.nome, nome(c).nivel.nome, nome(d).nivel, nome(e).nivel.nome], ['Bronze', 'Prata', 'Ouro', null, 'Bronze'])
  assert.equal(nome(b).estornos, 1)
  assert.equal(nome(b).vendas_mes, 20)
  assert.equal(nome(e).faltam, 1)
  assert.equal(nome(e).proximo, 'Prata')
  assert.ok(nome(a).total_pago_centavos > 0)
  assert.ok(nome(a).ultima_venda)
  assert.equal(nome(d).ultima_venda, null)
  // receita: 3 vendas de R$ 79,90
  assert.equal(nome(a).receita_centavos, 3 * 7990)
  // cliques e conversão dos últimos 30 dias: 50 vendas / 100 cliques
  assert.equal(nome(c).cliques_30d, 100)
  assert.equal(nome(c).conversao_pct, 50)
  assert.equal(nome(a).conversao_pct, null)
  assert.equal(nome(e).saque_pendente, true)
  assert.equal(nome(a).saque_pendente, false)
})

test('a lista usa poucas consultas, qualquer que seja o número de afiliados', async () => {
  const { db } = await cenario()
  const antes = db.consultas
  await listarAfiliados(db, {}, AGORA)
  assert.ok(db.consultas - antes <= 9, `consultas: ${db.consultas - antes}`)
})

test('filtros: status, nível, vendeu, saldo, saque pendente e perto de subir', async () => {
  const { db, a, b, c, d, e } = await cenario()
  const ids = async (o) => (await listarAfiliados(db, { ordem: 'codigo', dir: 'asc', ...o }, AGORA)).itens.map((x) => x.id)
  assert.deepEqual(await ids({ status: 'suspenso' }), [d.id])
  assert.deepEqual((await ids({ status: 'ativo' })).sort(), [a.id, b.id, c.id, e.id].sort())
  assert.deepEqual(await ids({ nivel: 'sem' }), [d.id])
  assert.deepEqual(await ids({ nivel: 3 }), [c.id]) // id 3 = Ouro
  assert.deepEqual(await ids({ vendeu: 'nao' }), [d.id])
  assert.equal((await ids({ vendeu: 'sim' })).length, 4)
  assert.deepEqual((await ids({ saldo: true })).sort(), [b.id, c.id].sort())
  assert.deepEqual(await ids({ saque: true }), [e.id])
  // faltam 3 ou menos: o E (falta 1 para Prata) e o D (sem venda, falta 1 para o Bronze); A falta 17
  assert.deepEqual((await ids({ perto: true })).sort(), [d.id, e.id].sort())
  assert.deepEqual(await ids({ perto: true, status: 'ativo' }), [e.id])
})

test('busca por nome, código e e-mail (e % ou _ não viram curinga)', async () => {
  const { db, a, c } = await cenario()
  const achar = async (q) => (await listarAfiliados(db, { q }, AGORA)).itens.map((x) => x.id)
  const nomeA = db.banco.prepare('SELECT nome, codigo FROM afiliados WHERE id = ?').get(a.id)
  assert.deepEqual(await achar(nomeA.nome), [a.id])
  assert.deepEqual(await achar(nomeA.codigo.toLowerCase()), [a.id])
  const emailC = db.banco.prepare('SELECT c.email FROM clientes c JOIN afiliados f ON f.cliente_id = c.id WHERE f.id = ?').get(c.id).email
  assert.deepEqual(await achar(emailC), [c.id])
  assert.deepEqual(await achar('nao-existe-xyz'), [])
  assert.deepEqual(await achar('%'), [])
  assert.deepEqual(await achar('_'), [])
})

test('ordenação, vazios por último e paginação de 25', async () => {
  const { db, a, b, c, e } = await cenario()
  const por = async (o) => (await listarAfiliados(db, o, AGORA)).itens.map((x) => x.id)
  assert.deepEqual((await por({ ordem: 'vendas', dir: 'desc' })).slice(0, 4), [c.id, b.id, e.id, a.id])
  assert.deepEqual((await por({ ordem: 'vendas', dir: 'asc' })).slice(-1), [c.id])
  // conversão: só o C tem cliques; os sem valor ficam no fim mesmo em ordem crescente e decrescente
  assert.equal((await por({ ordem: 'conversao', dir: 'asc' }))[0], c.id)
  assert.equal((await por({ ordem: 'conversao', dir: 'desc' }))[0], c.id)
  // ordem desconhecida cai no padrão
  assert.equal((await listarAfiliados(db, { ordem: 'drop table' }, AGORA)).ordem, 'vendas')

  for (let i = 0; i < 25; i++) novoAfiliado(db)
  const p1 = await listarAfiliados(db, { ordem: 'nome', dir: 'asc', pagina: 1 }, AGORA)
  const p2 = await listarAfiliados(db, { ordem: 'nome', dir: 'asc', pagina: 2 }, AGORA)
  assert.equal(p1.total, 30)
  assert.equal(p1.por_pagina, POR_PAGINA)
  assert.equal(p1.itens.length, 25)
  assert.equal(p2.itens.length, 5)
  assert.equal(new Set([...p1.itens, ...p2.itens].map((x) => x.id)).size, 30)
  assert.equal(p1.contagem_status.ativo + p1.contagem_status.suspenso + p1.contagem_status.pendente, 30)
})

test('mês fechado vale o que foi gravado e o nível travado entra na conta', async () => {
  const db = novoDb()
  const f = novoAfiliado(db)
  await vendas(db, f, 25)
  const { fecharMes } = await import('../../lib/afiliados/fechamento.js')
  const fechou = await fecharMes(db, MES, new Date('2026-12-09T12:00:00Z'))
  assert.equal(fechou.fechados.length, 1)
  const l = await listarAfiliados(db, { mes: MES }, new Date('2026-12-10T12:00:00Z'))
  const s = await statusDoMes(db, f.id, MES, new Date('2026-12-10T12:00:00Z'))
  assert.equal(s.fechado, true)
  assert.equal(l.itens[0].comissao_prevista_centavos, s.totalPrevisto)
  assert.equal(l.itens[0].nivel.nome, 'Prata')
  assert.equal(l.itens[0].faltam, 0)

  const t = novoAfiliado(db, { nivelFixoId: 3 })
  await vendas(db, t, 2)
  const m = await listarAfiliados(db, { ordem: 'codigo' }, AGORA)
  const linha = m.itens.find((x) => x.id === t.id)
  assert.equal(linha.nivel.nome, 'Ouro')
  assert.equal(linha.nivel_travado, true)
  assert.equal(linha.comissao_prevista_centavos, (await statusDoMes(db, t.id, MES, AGORA)).totalPrevisto)
})
