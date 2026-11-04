// Dashboard e Financeiro da Gestão de afiliados. Cada número abaixo foi calculado à mão
// (a conta está no comentário) e depois comparado com o que o sistema devolve.
// Cenário em tests/afiliados/_cenario.mjs: período 01/11 a 30/11/2026, anterior 02/10 a 31/10.
import test from 'node:test'
import assert from 'node:assert/strict'
import { novoDb } from './_base.mjs'
import { AGORA, ATE, DE, montarCenario } from './_cenario.mjs'
import { validarPeriodo } from '../../lib/gestao/datas.js'
import { dashboardAfiliados } from '../../lib/afiliados/gestao-painel.js'
import { dadosCsv, extrato, resumoMensal, validarFiltrosExtrato } from '../../lib/afiliados/gestao-financeiro.js'
import { fraseDoPeriodo } from '../../lib/afiliados/gestao-painel-frase.js'
import { variacao } from '../../lib/afiliados/gestao-periodo.js'
import { celulaCsv, numeroCsv } from '../../lib/gestao/csv.js'

const periodo = validarPeriodo(DE, ATE)
let cache
async function dados() {
  if (!cache) {
    const db = novoDb()
    const ids = await montarCenario(db)
    cache = { db, ids, d: await dashboardAfiliados(db, periodo, AGORA) }
  }
  return cache
}

test('período anterior tem o mesmo tamanho e vem logo antes', async () => {
  const { d } = await dados()
  assert.deepEqual(d.periodo.anterior, { de: '2026-10-02', ate: '2026-10-31' })
  assert.equal(d.periodo.dias, 30)
})

test('está compensando: receita, custo, lucro, CPA e % de afiliados', async () => {
  const { d } = await dados()
  const c = d.compensa
  // Vendas pagas de afiliado em novembro: A1 48 + A2 3 + A3 50 = 101 (reembolsadas ficam fora). Diretas: 5. Total 106.
  assert.deepEqual([c.vendas_afiliados, c.vendas_diretas, c.vendas_total], [101, 5, 106])
  // Receita líquida: A1 48x7500 = 360000; A2 2x7500 + 7990 (sem taxa, estimada) = 22990; A3 50x7500 = 375000 -> 757990
  assert.equal(c.receita_liquida_afiliados_centavos, 757990)
  assert.equal(c.vendas_com_valor_estimado, 1)
  // Custo: base = 48x1500 + 3x1500 + 51x1500 (a 51a foi estornada depois) = 153000; bônus de novembro ainda não existe = 0;
  // ajuste -500; estorno -1500 -> 153000 + 0 - 500 - 1500 = 151000
  assert.deepEqual(c.custo_programa, { total_centavos: 151000, base_centavos: 153000, bonus_centavos: 0, ajustes_centavos: -500, estornos_centavos: -1500 })
  // Lucro: 757990 - 151000 = 606990. CPA: 151000 / 101 = 1495,05 -> 1495
  assert.equal(c.lucro_afiliados_centavos, 606990)
  assert.equal(c.cpa_centavos, 1495)
  // % afiliados: 101 / 106 = 95,28% -> 95,3
  assert.equal(c.pct_vendas_afiliados, 95.3)
})

test('lucro por venda: afiliado, direta e por nível do mês', async () => {
  const { d } = await dados()
  const l = d.compensa.lucro_por_venda
  // afiliado: 606990 / 101 = 6009,8 -> 6010. Direta: 5x7500 / 5 = 7500
  assert.equal(l.afiliado_centavos, 6010)
  assert.equal(l.direta_centavos, 7500)
  // Bronze (A2): 3 vendas, receita 22990, custo 3x1500 = 4500, lucro 18490, 18490/3 = 6163,3 -> 6163
  // Prata (A1, 48 vendas): receita 360000, custo 48x2000 = 96000, lucro 264000, por venda 5500
  // Ouro (A3, 50 vendas): receita 375000, custo 50x3000 = 150000, lucro 225000, por venda 4500
  assert.deepEqual(l.por_nivel, [
    { nivel: 'Bronze', vendas: 3, receita_liquida_centavos: 22990, custo_centavos: 4500, lucro_centavos: 18490, lucro_por_venda_centavos: 6163 },
    { nivel: 'Prata', vendas: 48, receita_liquida_centavos: 360000, custo_centavos: 96000, lucro_centavos: 264000, lucro_por_venda_centavos: 5500 },
    { nivel: 'Ouro', vendas: 50, receita_liquida_centavos: 375000, custo_centavos: 150000, lucro_centavos: 225000, lucro_por_venda_centavos: 4500 },
  ])
})

test('comparação com o período anterior (outubro)', async () => {
  const { d } = await dados()
  const c = d.compensa.comparacao
  // Outubro: afiliados 25 (A4 20 + A1 5, a de 31/10 23:30 conta), diretas 10, total 35; receita 25x7500 = 187500;
  // custo = base 25x1500 = 37500 + bônus de A4 (Prata: 20x(2000-1500)) 10000 = 47500; lucro 140000; CPA 47500/25 = 1900; % = 25/35 = 71,4
  assert.deepEqual(c.vendas_afiliados, { atual: 101, anterior: 25, pct: 304 }) // (101-25)/25
  assert.deepEqual(c.vendas_total, { atual: 106, anterior: 35, pct: 202.9 }) // 71/35
  assert.deepEqual(c.receita_liquida, { atual: 757990, anterior: 187500, pct: 304.3 }) // 570490/187500
  assert.deepEqual(c.custo, { atual: 151000, anterior: 47500, pct: 217.9 }) // 103500/47500
  assert.deepEqual(c.lucro, { atual: 606990, anterior: 140000, pct: 333.6 }) // 466990/140000
  assert.deepEqual(c.cpa, { atual: 1495, anterior: 1900, pct: -21.3 }) // -405/1900
  assert.deepEqual(c.pct_vendas_afiliados, { atual: 95.3, anterior: 71.4, pct: 33.5 }) // 23,9/71,4
})

test('variação sem base de comparação não inventa porcentagem', () => {
  assert.deepEqual(variacao(5, 0), { atual: 5, anterior: 0, pct: null })
  assert.deepEqual(variacao(0, 0), { atual: 0, anterior: 0, pct: 0 })
  assert.deepEqual(variacao(null, 10), { atual: null, anterior: 10, pct: null })
})

test('afiliados: contagens, nível do mês e perto de subir', async () => {
  const { d } = await dados()
  const a = d.afiliados
  // 6 cadastrados; ativos A1 A2 A3 A6 = 4; pendente A5; suspenso A4; novos em novembro A2 e A5 = 2;
  // venderam em novembro A1 A2 A3 = 3; inativo (30+ dias sem venda) só A6 = 1
  assert.deepEqual([a.cadastrados, a.ativos, a.pendentes, a.suspensos, a.novos, a.venderam, a.inativos_30d], [6, 4, 1, 1, 2, 3, 1])
  // Novembro: A1 48 vendas = Prata, A2 3 = Bronze, A3 50 = Ouro; A6 ativo sem vendas
  assert.deepEqual(a.por_nivel_mes_atual, { mes: '2026-11', niveis: { Bronze: 1, Prata: 1, Ouro: 1 }, ativos_sem_vendas: 1 })
  // Perto de subir (faltam 3 ou menos): só A1, que falta 50 - 48 = 2 para Ouro
  assert.equal(a.perto_de_subir, 1)
})

test('dinheiro a pagar', async () => {
  const { d } = await dados()
  const m = d.dinheiro
  // Disponível (soma do saldo positivo de cada afiliado, carência de 7 dias vencida em 30/11):
  // A4 20x1500 + bônus 10000 = 40000; A1 5x1500 + 48x1500 = 79500; A2 2x1500 - 500 (ajuste) = 2500; A3 51x1500 - 1500 (estorno) = 75000 -> 197000
  assert.equal(m.disponivel_centavos, 197000)
  // Liberando: só a venda de A2 de 30/11 23:30 (libera em 08/12) = 1500, que também cai nos próximos 15 dias
  assert.equal(m.liberando_centavos, 1500)
  // Bônus previsto de novembro (fecha em 08/12): A1 48x(2000-1500) = 24000 + A3 50x(3000-1500) = 75000 -> 99000. Outubro já fechou.
  assert.deepEqual(m.bonus_previsto, { total_centavos: 99000, partes: [{ mes: '2026-11', valor_centavos: 99000, fecha_em: '2026-12-08' }] })
  assert.deepEqual(m.previsao_15_dias, { libera_centavos: 1500, bonus_centavos: 99000, total_centavos: 100500 })
  assert.deepEqual(m.saques_pendentes, { quantidade: 1, valor_centavos: 12345 })
  assert.deepEqual(m.pago_no_periodo, { quantidade: 1, valor_centavos: 40000 })
  assert.deepEqual(m.pago_desde_o_inicio, { quantidade: 2, valor_centavos: 60000 })
})

test('séries: vendas por dia, mês a mês, funil, top 10, níveis, novos e origem', async () => {
  const { d } = await dados()
  const s = d.series
  assert.equal(s.vendas_por_dia.length, 30)
  const dia = (x) => s.vendas_por_dia.find((p) => p.dia === x)
  // 10/11: A1 40 + 2 diretas. 14/11: A3 25 (a estornada não conta). 30/11 23:30 em Brasília: 1 de A2.
  assert.deepEqual([dia('2026-11-10').afiliados, dia('2026-11-10').diretas], [40, 2])
  assert.equal(dia('2026-11-14').afiliados, 25)
  assert.equal(dia('2026-11-30').afiliados, 1)
  assert.equal(dia('2026-11-20').diretas, 3)
  assert.equal(s.vendas_por_dia.reduce((t, p) => t + p.afiliados, 0), 101)
  assert.equal(s.vendas_por_dia.reduce((t, p) => t + p.diretas, 0), 5)

  const mes = (x) => s.receita_custo_mensal.find((p) => p.mes === x)
  assert.equal(s.receita_custo_mensal.length, 12)
  assert.deepEqual(mes('2026-10'), { mes: '2026-10', vendas: 25, receita_liquida_centavos: 187500, custo_centavos: 47500, lucro_centavos: 140000 })
  assert.deepEqual(mes('2026-11'), { mes: '2026-11', vendas: 101, receita_liquida_centavos: 757990, custo_centavos: 151000, lucro_centavos: 606990 })

  // Funil: 7 cliques (A1 5 + A2 2), 4 checkouts (A1 3 + A3 1), 101 vendas, estornos: 2 reembolsos + 1 chargeback
  assert.deepEqual(s.funil, {
    cliques: 7, checkouts: 4, vendas: 101, estornos: { reembolsos: 2, chargebacks: 1, total: 3 },
    taxa_clique_checkout: 57.1, taxa_checkout_venda: 2525, // 4/7 e 101/4
  })
  assert.deepEqual(s.top_afiliados.map((t) => [t.nome, t.vendas, t.receita_liquida_centavos]),
    [['Caio Rocha', 50, 375000], ['Ana Lima', 48, 360000], ['=HYPERLINK(x)', 3, 22990]])
  const niv = (x) => s.distribuicao_niveis.meses.find((p) => p.mes === x).contagens
  assert.deepEqual(niv('2026-10'), { Bronze: 1, Prata: 1, Ouro: 0 }) // fechado: A1 Bronze, A4 Prata
  assert.deepEqual(niv('2026-11'), { Bronze: 1, Prata: 1, Ouro: 1 })
  const novos = (x) => s.novos_afiliados_por_mes.find((p) => p.mes === x).novos
  assert.deepEqual([novos('2026-09'), novos('2026-10'), novos('2026-11')], [4, 0, 2])
  // Origem em novembro (afiliados): A1 48 Pix; A2 2 Pix + 1 cartão; A3 50 cartão. Todas: + diretas 3 Pix, 1 cartão, 1 sem informação
  assert.deepEqual(s.origem.forma_pagamento.afiliados, { pix: 50, cartao: 51, outro: 0, sem_info: 0 })
  assert.deepEqual(s.origem.forma_pagamento.todas, { pix: 53, cartao: 52, outro: 0, sem_info: 1 })
  assert.equal(s.origem.codigo_digitado_vs_link, null) // o banco não guarda como o código chegou
})

test('frase automática em português simples', async () => {
  const { d } = await dados()
  assert.match(d.frase, /^De 01\/11 a 30\/11, os afiliados trouxeram 101 vendas \(95,3% das vendas\)\./)
  assert.match(d.frase, /Entraram R\$ 7\.579,90 líquidos e as comissões custaram R\$ 1\.510,00, então o programa deixou R\$ 6\.069,90 de lucro\./)
  assert.match(d.frase, /Cada venda custou R\$ 14,95 em comissão\./)
  assert.match(d.frase, /subiram 304%/)
  assert.match(d.frase, /1 venda antiga não tem a taxa do Mercado Pago/)
  const vazia = fraseDoPeriodo({ de: '2026-11-01', ate: '2026-11-30', vendasAfil: 0, vendasTotal: 4, comparaVendas: variacao(0, 0) })
  assert.match(vazia, /nenhuma venda veio de afiliados \(houve 4 vendas no total\)/)
})

test('o dashboard cabe em poucas consultas e um único lote', async () => {
  const { db } = await dados()
  db.consultas = 0
  db.lotes = 0
  await dashboardAfiliados(db, periodo, AGORA)
  assert.equal(db.lotes, 1)
  assert.ok(db.consultas <= 20, `consultas: ${db.consultas}`)
})

test('período sem nada devolve zeros e nulos, sem quebrar', async () => {
  const db = novoDb()
  const d = await dashboardAfiliados(db, validarPeriodo('2026-11-01', '2026-11-30'), AGORA)
  assert.equal(d.compensa.vendas_afiliados, 0)
  assert.equal(d.compensa.cpa_centavos, null)
  assert.equal(d.compensa.pct_vendas_afiliados, null)
  assert.equal(d.dinheiro.disponivel_centavos, 0)
  assert.match(d.frase, /nenhuma venda veio de afiliados/)
})

test('resumo mensal: bruto, taxas, líquido, comissões, bônus, estornos e lucro', async () => {
  const { db } = await dados()
  const r = await resumoMensal(db, validarPeriodo('2026-10-01', '2026-11-30'))
  const [out, nov] = r.meses
  // Outubro: 25 vendas, bruto 25x7990 = 199750, taxas 25x490 = 12250, líquido 187500, base 37500, bônus 10000, lucro 187500-47500 = 140000
  assert.deepEqual(out, { mes: '2026-10', vendas: 25, bruto: 199750, taxas: 12250, liquido: 187500, estimadas: 0, comissoes_base: 37500, bonus: 10000, ajustes: 0, estornos: 0, custo: 47500, lucro: 140000 })
  // Novembro: 101 vendas, bruto 101x7990 = 806990 (a sem taxa conta pelo valor), taxas 100x490 = 49000, líquido 806990-49000 = 757990,
  // base 153000, bônus 0, ajustes -500, estornos -1500, custo 151000, lucro 606990
  assert.deepEqual(nov, { mes: '2026-11', vendas: 101, bruto: 806990, taxas: 49000, liquido: 757990, estimadas: 1, comissoes_base: 153000, bonus: 0, ajustes: -500, estornos: -1500, custo: 151000, lucro: 606990 })
  // Totais: 126 vendas, líquido 945490, custo 198500, lucro 746990
  assert.deepEqual([r.totais.vendas, r.totais.liquido, r.totais.custo, r.totais.lucro], [126, 945490, 198500, 746990])
})

test('extrato: filtros, soma e paginação', async () => {
  const { db, ids } = await dados()
  const tudo = await extrato(db, { periodo: validarPeriodo('2026-10-01', '2026-11-30') })
  // Lançamentos: vendas 25 (out) + 102+... = 25 + 48+4+51 = 128 de venda... conferido por tipo abaixo
  assert.equal(tudo.por_pagina, 50)
  assert.equal(tudo.itens.length, 50)
  const bonus = await extrato(db, { tipo: 'bonus_nivel', periodo })
  // O bônus de outubro nasceu em 30/11 (fechamento): 1 lançamento de R$ 100,00 (A4)
  assert.equal(bonus.total_itens, 1)
  assert.equal(bonus.soma_centavos, 10000)
  assert.equal(bonus.itens[0].afiliado.id, ids.A4)
  const estornos = await extrato(db, { tipo: 'estorno', periodo })
  assert.deepEqual([estornos.total_itens, estornos.soma_centavos], [1, -1500])
  const doA2 = await extrato(db, { afiliadoId: ids.A2, periodo })
  // A2 em novembro: 4 vendas (1 cancelada) + 1 ajuste = 5 lançamentos; soma 3x1500 + 1500 (cancelada continua no extrato) - 500 = 5500
  assert.deepEqual([doA2.total_itens, doA2.soma_centavos], [5, 5500])
  const pag2 = await extrato(db, { periodo: validarPeriodo('2026-10-01', '2026-11-30'), pagina: 2 })
  assert.equal(pag2.pagina, 2)
  assert.notEqual(pag2.itens[0].id, tudo.itens[0].id)
})

test('filtros do extrato recusam valores estranhos', () => {
  assert.equal(validarFiltrosExtrato({ tipo: 'x' }).ok, false)
  assert.equal(validarFiltrosExtrato({ afiliado: '1; DROP' }).ok, false)
  assert.deepEqual(validarFiltrosExtrato({ tipo: 'venda', afiliado: '12' }), { ok: true, tipo: 'venda', afiliadoId: 12 })
})

test('CSV de saques pagos leva nome, CPF e chave Pix de quem recebeu', async () => {
  const { db } = await dados()
  const csv = await dadosCsv(db, 'saques_pagos', periodo)
  assert.equal(csv.linhas.length, 1)
  const [pagoEm, afiliado, cpf, titular, cpfTitular, tipo, chave, valor] = csv.linhas[0]
  assert.deepEqual([pagoEm, afiliado, cpf, titular, cpfTitular, tipo, chave, valor.numero],
    ['20/11/2026 12:00', 'Duda Souza', '111.111.111-03', 'Duda Souza', '123.456.789-01', 'email', '+5527999990000', '400,00'])
})

test('número de planilha só aceita dígitos: negativo não vira texto, fórmula continua protegida', () => {
  assert.equal(celulaCsv(numeroCsv('-5,00')), '-5,00')
  assert.equal(celulaCsv(numeroCsv('=1+1')), "'=1+1")
  assert.equal(celulaCsv('-5,00'), "'-5,00")
})
