import test from 'node:test'
import assert from 'node:assert/strict'
import { csvDoFechamento, dadosDeMetas, projecaoDoMes, salvarNiveis, tabelaDeNiveis, validarNiveis } from '../../lib/afiliados/gestao-metas.js'
import { relatoriosDosMeses, relatorioDoMes } from '../../lib/afiliados/relatorio.js'
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { niveisDoMes } from '../../lib/afiliados/niveis.js'
import { statusDoMes } from '../../lib/afiliados/status.js'
import { NOV, novoAfiliado, novoDb, vendas } from './_base.mjs'

const AGORA = new Date('2026-11-20T15:00:00Z')
const N = (nome, vendas_minimas, valor_por_venda_centavos, cor = null) => ({ nome, vendas_minimas, valor_por_venda_centavos, cor })

test('primeiro nível tem de ser 1 venda; tabela sem nível de 1 venda não derruba o cálculo', async () => {
  const r = validarNiveis([N('A', 5, 1000), N('B', 10, 2000)])
  assert.equal(r.ok, false)
  assert.match(r.erro, /primeiro nível precisa começar em 1 venda/)
  const { calcularNivel } = await import('../../lib/afiliados/niveis.js')
  const tabela = [{ id: 1, nome: 'A', vendas_minimas: 5, valor_por_venda_centavos: 1000 }, { id: 2, nome: 'B', vendas_minimas: 10, valor_por_venda_centavos: 2000 }]
  const um = calcularNivel(1, tabela) // antes: Cannot read properties of null
  assert.deepEqual([um.nivel, um.total, um.base, um.bonus, um.faltam, um.proximo.nome], [null, 0, 0, 0, 4, 'A'])
  assert.equal(calcularNivel(5, tabela).total, 5000)
  assert.equal(calcularNivel(0, tabela).total, 0)
  assert.equal(calcularNivel(3, []).total, 0)
  // com a tabela ruim no banco, a projeção também não cai
  const db = novoDb()
  db.banco.prepare("UPDATE afiliados_niveis SET vendas_minimas = vendas_minimas + 4 WHERE valido_desde_mes = '2026-01'").run()
  await vendas(db, novoAfiliado(db), 1)
  assert.equal((await projecaoDoMes(db, NOV)).custo_projetado_centavos, 0)
})

test('validarNiveis: ordem crescente, sem repetir, valores positivos, cor e limites', () => {
  assert.equal(validarNiveis([N('A', 1, 1000), N('B', 10, 2000, '#aabbcc')]).ok, true)
  assert.equal(validarNiveis([N('A', 1, 1000)]).niveis[0].cor, null)
  const ruim = (l) => validarNiveis(l).ok === false
  assert.ok(ruim(undefined))
  assert.ok(ruim([]))
  assert.ok(ruim(Array.from({ length: 11 }, (_, i) => N('N' + i, i + 1, 1000 + i))))
  assert.ok(ruim([N('A', 10, 1000), N('B', 5, 2000)])) // fora de ordem
  assert.ok(ruim([N('A', 5, 1000), N('B', 5, 2000)])) // repetido
  assert.ok(ruim([N('A', 1, 1000), N('B', 5, 1000)])) // valor não sobe
  assert.ok(ruim([N('A', 1, 1000), N('B', 5, 900)]))
  assert.ok(ruim([N('A', 0, 1000)])) // vendas mínimas a partir de 1
  assert.ok(ruim([N('A', 1, 0)]))
  assert.ok(ruim([N('A', 1, -5)]))
  assert.ok(ruim([N('A', 1.5, 1000)]))
  assert.ok(ruim([N('A', 1, 10.5)]))
  assert.ok(ruim([N('A', 1, '1000')]))
  assert.ok(ruim([N('', 1, 1000)]))
  assert.ok(ruim([N('x'.repeat(31), 1, 1000)]))
  assert.ok(ruim([N('A', 1, 1000, 'vermelho')]))
  assert.ok(ruim([N('A', 1, 1000), N('a', 5, 2000)])) // nome repetido
  assert.ok(ruim([null]))
})

test('mudança na tabela vale só a partir do mês seguinte; o mês corrente e os fechados continuam iguais', async () => {
  const db = novoDb()
  const x = novoAfiliado(db)
  await vendas(db, x, 20) // novembro: 20 vendas = Prata a R$ 20 (tabela antiga)
  const antes = await statusDoMes(db, x.id, '2026-11', AGORA)
  assert.equal(antes.nivel.nome, 'Prata')
  assert.equal(antes.totalPrevisto, 20 * 2000)

  const r = await salvarNiveis(db, [N('Base', 1, 2000, '#111111'), N('Topo', 10, 3000)], 'm@t.com', AGORA)
  assert.equal(r.valido_desde_mes, '2026-12')

  // novembro (mês corrente) não mudou: mesma tabela, mesmos números
  assert.deepEqual((await niveisDoMes(db, '2026-11')).map((n) => n.nome), ['Bronze', 'Prata', 'Ouro'])
  const depois = await statusDoMes(db, x.id, '2026-11', AGORA)
  assert.equal(depois.nivel.nome, 'Prata')
  assert.equal(depois.totalPrevisto, antes.totalPrevisto)
  // dezembro usa a tabela nova
  assert.deepEqual((await niveisDoMes(db, '2026-12')).map((n) => n.nome), ['Base', 'Topo'])

  // fechar novembro depois da mudança usa a tabela de novembro (a antiga)
  const fechou = await fecharMes(db, '2026-11', new Date('2026-12-09T12:00:00Z'))
  assert.equal(fechou.fechados[0].nivel, 'Prata')
  assert.equal(fechou.fechados[0].total, 20 * 2000)
  // e as vendas de dezembro valem a tabela nova: 10 vendas = Topo a R$ 30
  await vendas(db, x, 10, new Date('2026-12-10T15:00:00Z'))
  const dez = await statusDoMes(db, x.id, '2026-12', new Date('2026-12-11T12:00:00Z'))
  assert.equal(dez.nivel.nome, 'Topo')
  assert.equal(dez.totalPrevisto, 10 * 3000)
  // o fechamento de novembro continua congelado
  assert.equal((await statusDoMes(db, x.id, '2026-11', new Date('2026-12-11T12:00:00Z'))).totalPrevisto, 20 * 2000)
})

test('gravar de novo antes de virar o mês substitui o conjunto futuro, sem duplicar nem tocar no vigente', async () => {
  const db = novoDb()
  await salvarNiveis(db, [N('Um', 1, 1000)], 'a@t.com', AGORA)
  await salvarNiveis(db, [N('Dois', 1, 1100), N('Tres', 5, 1200)], 'b@t.com', AGORA)
  const t = await tabelaDeNiveis(db, AGORA)
  assert.equal(t.vigente.valido_desde_mes, '2026-01')
  assert.equal(t.vigente.situacao, 'vigente')
  assert.equal(t.vigente.niveis.length, 3)
  assert.equal(t.proximas.length, 1)
  assert.deepEqual(t.proximas[0].niveis.map((n) => n.nome), ['Dois', 'Tres'])
  assert.equal(t.proximas[0].criado_por, 'b@t.com')
  assert.ok(t.proximas[0].criado_em)
  assert.deepEqual(t.historico.map((c) => [c.valido_desde_mes, c.situacao]), [['2026-12', 'futura'], ['2026-01', 'vigente']])
  assert.equal(db.banco.prepare("SELECT COUNT(*) AS n FROM afiliados_niveis WHERE valido_desde_mes = '2026-01'").get().n, 3)
})

test('projeção do mês: ritmo atual de cada afiliado, com a conta explicada', async () => {
  const db = novoDb()
  const a = novoAfiliado(db)
  const c = novoAfiliado(db)
  await vendas(db, a, 5) // dia 10 de 30: 5 -> 15 vendas (Bronze, 15 x 15,00 = 225,00)
  await vendas(db, c, 10) // 10 -> 30 vendas (Prata, 30 x 20,00 = 600,00; base 450,00; bônus 150,00)
  const p = await projecaoDoMes(db, NOV)
  assert.equal(p.mes, '2026-11')
  assert.equal(p.dia, 10)
  assert.equal(p.dias_no_mes, 30)
  assert.equal(p.afiliados_com_venda, 2)
  assert.equal(p.vendas_ate_agora, 15)
  assert.equal(p.custo_ate_agora_centavos, 5 * 1500 + 10 * 1500) // 10 vendas ainda são Bronze hoje
  assert.equal(p.vendas_projetadas, 45)
  assert.equal(p.custo_projetado_centavos, 22500 + 60000)
  assert.equal(p.base_projetada_centavos, 22500 + 45000)
  assert.equal(p.bonus_projetado_centavos, 15000)
  assert.match(p.explicacao, /dia 10 de 30/)
  assert.match(p.explicacao, /R\$ 825,00/)
  const vazio = await projecaoDoMes(novoDb(), NOV)
  assert.equal(vazio.custo_projetado_centavos, 0)
  assert.match(vazio.explicacao, /Ainda não há vendas/)
})

test('metas: status dos últimos 6 meses em poucas consultas e fechamento rodado', async () => {
  const db = novoDb()
  const x = novoAfiliado(db)
  const y = novoAfiliado(db)
  await vendas(db, x, 20)
  await vendas(db, y, 3)
  const hoje = new Date('2026-12-10T12:00:00Z')
  let m = await dadosDeMetas(db, hoje)
  assert.deepEqual(m.fechamentos.map((f) => f.mes), ['2026-11', '2026-10', '2026-09', '2026-08', '2026-07', '2026-06'])
  assert.equal(m.fechamentos[0].status, 'pendente')
  assert.equal(m.fechamentos[0].faltam, 2)
  assert.equal(m.fechamentos[0].liberado, true)
  assert.equal(m.fechamentos[1].status, 'rodado') // sem venda em outubro: nada a fechar
  assert.equal(m.projecao.mes, '2026-12')
  await fecharMes(db, '2026-11', hoje)
  m = await dadosDeMetas(db, hoje)
  assert.equal(m.fechamentos[0].status, 'rodado')
  assert.equal(m.fechamentos[0].afiliados, 2)
  assert.equal(m.fechamentos[0].total_mes_centavos, 20 * 2000 + 3 * 1500)
  assert.deepEqual([...m.fechamentos[0].por_nivel].sort((p, q) => (p.nivel < q.nivel ? -1 : 1)), [{ nivel: 'Bronze', afiliados: 1 }, { nivel: 'Prata', afiliados: 1 }])

  const antes = db.consultas
  await relatoriosDosMeses(db, ['2026-11', '2026-10', '2026-09', '2026-08', '2026-07', '2026-06'], hoje)
  assert.ok(db.consultas - antes <= 5)
  // relatorioDoMes continua devolvendo o mesmo formato de antes
  const um = await relatorioDoMes(db, '2026-11', hoje)
  assert.deepEqual(Object.keys(um).sort(), ['afiliados', 'faltam', 'liberado', 'mes', 'por_nivel', 'rodou_em', 'status', 'total_base_centavos', 'total_bonus_centavos', 'total_mes_centavos'])
})

test('CSV do fechamento: cabeçalho, uma linha por afiliado, BOM e ponto e vírgula', async () => {
  const db = novoDb()
  const x = novoAfiliado(db)
  await vendas(db, x, 20)
  await fecharMes(db, '2026-11', new Date('2026-12-09T12:00:00Z'))
  const csv = await csvDoFechamento(db, '2026-11')
  const linhas = csv.replace('﻿', '').trim().split('\r\n')
  assert.equal(csv.charCodeAt(0), 0xfeff)
  assert.equal(linhas.length, 2)
  assert.match(linhas[0], /^Código;Nome;Vendas válidas;/)
  assert.match(linhas[1], /^AFI\d+XX;Afiliado \d+;20;0;Prata;300,00;100,00;400,00;/)
  assert.equal((await csvDoFechamento(db, '2026-10')).trim().split('\r\n').length, 1) // mês sem fechamento: só o cabeçalho
})
