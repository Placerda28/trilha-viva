// Planilha de conferência do Dashboard e do Resumo mensal dos afiliados (Fase 8A).
//
// Monta os mesmos dados de teste (tests/afiliados/_cenario.mjs) num banco em memória, roda as funções
// do sistema e grava tasks/afiliados-conferencia.csv com duas colunas lado a lado:
//   "Calculado à mão": a conta feita aqui, só em cima das listas do cenário, SEM chamar as funções do sistema;
//   "Sistema": o que o sistema devolveu.
// Uso: node scripts/afiliados/conferencia.mjs   (sai com código 1 se algum número não bater)
import { writeFileSync } from 'node:fs'
import { novoDb } from '../../tests/afiliados/_base.mjs'
import { AFILIADOS, AGORA, AJUSTES, ATE, CLIQUES, DE, EVENTOS, SAQUES, VENDAS, montarCenario } from '../../tests/afiliados/_cenario.mjs'
import { validarPeriodo } from '../../lib/gestao/datas.js'
import { dashboardAfiliados } from '../../lib/afiliados/gestao-painel.js'
import { resumoMensal } from '../../lib/afiliados/gestao-financeiro.js'
import { gerarCsv, numeroCsv } from '../../lib/gestao/csv.js'

// ---------- A conta à mão (regras do programa escritas aqui, de novo) ----------
const BRASILIA = 3 * 3600000
const DIA = 86400000
const diaBr = (iso) => new Date(new Date(iso).getTime() - BRASILIA).toISOString().slice(0, 10)
const mesBr = (iso) => diaBr(iso).slice(0, 7)
const VALOR_CHEIO = 7990 // preço da venda; vale como "líquido" quando o Mercado Pago não informou a taxa
const NIVEIS = [{ nome: 'Bronze', min: 1, valor: 1500 }, { nome: 'Prata', min: 20, valor: 2000 }, { nome: 'Ouro', min: 50, valor: 3000 }]
const BASE = 1500 // valor por venda do menor nível
const nivelDe = (n) => [...NIVEIS].reverse().find((x) => n >= x.min) || null
const proximoDe = (n) => NIVEIS.find((x) => x.min > n) || null
const FECHADOS = ['2026-10'] // o cenário fecha outubro em 30/11
const CUR = { de: DE, ate: ATE }
const ANT = { de: '2026-10-02', ate: '2026-10-31' }
const dentro = (iso, p) => diaBr(iso) >= p.de && diaBr(iso) <= p.ate
const pct1 = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null)
const soma = (xs) => xs.reduce((s, x) => s + x, 0)

const vendas = VENDAS.flatMap((v) => Array.from({ length: v.n }, () => ({ ...v })))
const pagas = vendas.filter((v) => !v.estado)
const comAf = (xs) => xs.filter((v) => v.af)
const validasNoMes = (af, mes) => vendas.filter((v) => v.af === af && !v.estado && mesBr(v.quando) === mes).length
const afiliadosDoMes = (mes) => AFILIADOS.map((a) => ({ ...a, n: validasNoMes(a.chave, mes) })).filter((a) => a.n > 0)

function periodo(p) {
  const pg = pagas.filter((v) => dentro(v.quando, p))
  const afil = comAf(pg)
  const liq = (v) => v.liq ?? VALOR_CHEIO
  const base = BASE * comAf(vendas).filter((v) => v.estado !== 'cancelada' && dentro(v.quando, p)).length
  // regra de caixa: o bônus entra no dia em que o fechamento o gravou (aqui, 30/11)
  const bonus = dentro(AGORA.toISOString(), p) ? soma(FECHADOS.flatMap((m) => afiliadosDoMes(m).map((a) => a.n * (nivelDe(a.n).valor - BASE)))) : 0
  const ajustes = soma(AJUSTES.filter((a) => dentro(a.quando, p)).map((a) => a.valor))
  const estornos = -BASE * vendas.filter((v) => v.estado === 'estornada' && dentro(v.refundadoEm, p)).length
  const custo = base + bonus + ajustes + estornos
  const receita = soma(afil.map(liq))
  return {
    total: pg.length, afil: afil.length, dir: pg.length - afil.length, receita, base, bonus, ajustes, estornos, custo,
    lucro: receita - custo, estimadas: afil.filter((v) => v.liq == null).length,
    cpa: afil.length ? Math.round(custo / afil.length) : null, pct: pct1(afil.length, pg.length),
    receitaDireta: soma(pg.filter((v) => !v.af).map(liq)), pg,
  }
}
const variacao = (a, b) => (b == null || a == null ? null : b !== 0 ? Math.round(((a - b) / Math.abs(b)) * 1000) / 10 : a === 0 ? 0 : null)

// ---------- Monta, roda o sistema ----------
const db = novoDb()
await montarCenario(db)
const periodoSis = validarPeriodo(DE, ATE)
const d = await dashboardAfiliados(db, periodoSis, AGORA)
const resumo = await resumoMensal(db, validarPeriodo('2026-10-01', ATE))
const c = d.compensa
const a = periodo(CUR)
const p = periodo(ANT)

const linhas = []
const linha = (secao, nome, mao, sis, tipo = 'n') => linhas.push({ secao, nome, mao, sis, tipo })

// Dashboard: está compensando?
const S1 = 'Dashboard: está compensando? (01/11 a 30/11)'
linha(S1, 'Vendas por afiliado', a.afil, c.vendas_afiliados)
linha(S1, 'Vendas diretas', a.dir, c.vendas_diretas)
linha(S1, 'Vendas no total', a.total, c.vendas_total)
linha(S1, '% das vendas vindas de afiliados', a.pct, c.pct_vendas_afiliados, 'pct')
linha(S1, 'Receita líquida via afiliados', a.receita, c.receita_liquida_afiliados_centavos, 'din')
linha(S1, 'Vendas com valor estimado (sem a taxa do Mercado Pago)', a.estimadas, c.vendas_com_valor_estimado)
linha(S1, 'Comissões base', a.base, c.custo_programa.base_centavos, 'din')
linha(S1, 'Bônus de nível (pelo dia do fechamento)', a.bonus, c.custo_programa.bonus_centavos, 'din')
linha(S1, 'Ajustes manuais', a.ajustes, c.custo_programa.ajustes_centavos, 'din')
linha(S1, 'Estornos', a.estornos, c.custo_programa.estornos_centavos, 'din')
linha(S1, 'Custo do programa', a.custo, c.custo_programa.total_centavos, 'din')
linha(S1, 'Lucro via afiliados', a.lucro, c.lucro_afiliados_centavos, 'din')
linha(S1, 'Custo por venda (CPA)', a.cpa, c.cpa_centavos, 'din')
linha(S1, 'Lucro por venda: afiliado', Math.round(a.lucro / a.afil), c.lucro_por_venda.afiliado_centavos, 'din')
linha(S1, 'Lucro por venda: direta', Math.round(a.receitaDireta / a.dir), c.lucro_por_venda.direta_centavos, 'din')
for (const n of NIVEIS) {
  // venda do nível = venda de um afiliado que fechou o mês naquele nível; custo = vendas x valor por venda do nível
  const grupos = AFILIADOS.map((x) => ({ x, n: validasNoMes(x.chave, '2026-11') })).filter((g) => g.n > 0 && nivelDe(g.n).nome === n.nome)
  const vs = pagas.filter((v) => v.af && mesBr(v.quando) === '2026-11' && dentro(v.quando, CUR) && grupos.some((g) => g.x.chave === v.af))
  const receita = soma(vs.map((v) => v.liq ?? VALOR_CHEIO))
  const custo = vs.length * n.valor
  const sis = c.lucro_por_venda.por_nivel.find((x) => x.nivel === n.nome)
  linha(S1, `Nível ${n.nome}: vendas`, vs.length, sis.vendas)
  linha(S1, `Nível ${n.nome}: receita líquida`, receita, sis.receita_liquida_centavos, 'din')
  linha(S1, `Nível ${n.nome}: custo (vendas x valor do nível)`, custo, sis.custo_centavos, 'din')
  linha(S1, `Nível ${n.nome}: lucro por venda`, vs.length ? Math.round((receita - custo) / vs.length) : null, sis.lucro_por_venda_centavos, 'din')
}
const S2 = 'Dashboard: comparação com o período anterior (02/10 a 31/10), em %'
linha(S2, 'Vendas por afiliado', variacao(a.afil, p.afil), c.comparacao.vendas_afiliados.pct, 'pct')
linha(S2, 'Receita líquida', variacao(a.receita, p.receita), c.comparacao.receita_liquida.pct, 'pct')
linha(S2, 'Custo do programa', variacao(a.custo, p.custo), c.comparacao.custo.pct, 'pct')
linha(S2, 'Lucro', variacao(a.lucro, p.lucro), c.comparacao.lucro.pct, 'pct')
linha(S2, 'Custo por venda (CPA)', variacao(a.cpa, p.cpa), c.comparacao.cpa.pct, 'pct')
linha(S2, 'Período anterior: custo do programa', p.custo, c.comparacao.custo.anterior, 'din')
linha(S2, 'Período anterior: lucro', p.lucro, c.comparacao.lucro.anterior, 'din')

// Afiliados
const S3 = 'Dashboard: afiliados'
const ativos = AFILIADOS.filter((x) => x.status === 'ativo')
const ultimaVenda = (ch) => Math.max(0, ...pagas.filter((v) => v.af === ch).map((v) => new Date(v.quando).getTime()))
const trinta = AGORA.getTime() - 30 * DIA
const nov = afiliadosDoMes('2026-11')
linha(S3, 'Cadastrados', AFILIADOS.length, d.afiliados.cadastrados)
linha(S3, 'Ativos', ativos.length, d.afiliados.ativos)
linha(S3, 'Pendentes', AFILIADOS.filter((x) => x.status === 'pendente').length, d.afiliados.pendentes)
linha(S3, 'Suspensos', AFILIADOS.filter((x) => x.status === 'suspenso').length, d.afiliados.suspensos)
linha(S3, 'Novos no período', AFILIADOS.filter((x) => diaBr(x.criado.replace(' ', 'T') + 'Z') >= DE && diaBr(x.criado.replace(' ', 'T') + 'Z') <= ATE).length, d.afiliados.novos)
linha(S3, 'Que venderam no período', new Set(a.pg.filter((v) => v.af).map((v) => v.af)).size, d.afiliados.venderam)
linha(S3, 'Inativos (30 dias ou mais sem venda)', ativos.filter((x) => Math.max(ultimaVenda(x.chave), new Date(x.criado.replace(' ', 'T') + 'Z').getTime()) < trinta).length, d.afiliados.inativos_30d)
for (const n of NIVEIS) linha(S3, `Em ${n.nome} no mês atual`, nov.filter((x) => nivelDe(x.n).nome === n.nome).length, d.afiliados.por_nivel_mes_atual.niveis[n.nome])
linha(S3, 'Ativos sem vendas no mês', ativos.length - nov.filter((x) => x.status === 'ativo').length, d.afiliados.por_nivel_mes_atual.ativos_sem_vendas)
linha(S3, 'Perto de subir (faltam 3 ou menos)', nov.filter((x) => x.status === 'ativo' && proximoDe(x.n) && proximoDe(x.n).min - x.n <= 3).length, d.afiliados.perto_de_subir)

// Dinheiro a pagar: monta as linhas do extrato à mão
const S4 = 'Dashboard: dinheiro a pagar'
const extrato = [
  ...comAf(vendas).filter((v) => v.estado !== 'cancelada').map((v) => ({ af: v.af, valor: BASE, disp: new Date(v.quando).getTime() + 7 * DIA })), // carência de 7 dias
  ...AFILIADOS.flatMap((x) => (FECHADOS.map((m) => ({ af: x.chave, valor: (validasNoMes(x.chave, m) ? nivelDe(validasNoMes(x.chave, m)).valor - BASE : 0) * validasNoMes(x.chave, m), disp: AGORA.getTime() })))).filter((l) => l.valor > 0),
  ...AJUSTES.map((x) => ({ af: x.af, valor: x.valor, disp: new Date(x.quando).getTime() })),
  ...vendas.filter((v) => v.estado === 'estornada').map((v) => ({ af: v.af, valor: -BASE, disp: new Date(v.refundadoEm).getTime() })),
]
const porAf = (f) => AFILIADOS.map((x) => soma(extrato.filter((l) => l.af === x.chave && f(l)).map((l) => l.valor)))
const em15 = AGORA.getTime() + 15 * DIA
const bonusAberto = soma(afiliadosDoMes('2026-11').map((x) => x.n * (nivelDe(x.n).valor - BASE)))
const libera15 = soma(extrato.filter((l) => l.disp > AGORA.getTime() && l.disp <= em15).map((l) => l.valor))
linha(S4, 'Disponível para saque (saldo positivo de cada um)', soma(porAf((l) => l.disp <= AGORA.getTime()).map((s) => Math.max(s, 0))), d.dinheiro.disponivel_centavos, 'din')
linha(S4, 'Liberando (carência)', soma(extrato.filter((l) => l.disp > AGORA.getTime()).map((l) => l.valor)), d.dinheiro.liberando_centavos, 'din')
linha(S4, 'Bônus previsto do próximo fechamento (novembro)', bonusAberto, d.dinheiro.bonus_previsto.total_centavos, 'din')
linha(S4, 'Próximos 15 dias: o que libera', libera15, d.dinheiro.previsao_15_dias.libera_centavos, 'din')
linha(S4, 'Próximos 15 dias: bônus que cai (fecha em 08/12)', bonusAberto, d.dinheiro.previsao_15_dias.bonus_centavos, 'din')
linha(S4, 'Próximos 15 dias: total', libera15 + bonusAberto, d.dinheiro.previsao_15_dias.total_centavos, 'din')
const pend = SAQUES.filter((s) => s.status === 'solicitado')
const pagoPer = SAQUES.filter((s) => s.status === 'pago' && dentro(s.pagoEm, CUR))
const pagoTot = SAQUES.filter((s) => s.status === 'pago')
linha(S4, 'Saques pendentes: quantidade', pend.length, d.dinheiro.saques_pendentes.quantidade)
linha(S4, 'Saques pendentes: valor', soma(pend.map((s) => s.valor)), d.dinheiro.saques_pendentes.valor_centavos, 'din')
linha(S4, 'Pago no período: valor', soma(pagoPer.map((s) => s.valor)), d.dinheiro.pago_no_periodo.valor_centavos, 'din')
linha(S4, 'Pago desde o início: quantidade', pagoTot.length, d.dinheiro.pago_desde_o_inicio.quantidade)
linha(S4, 'Pago desde o início: valor', soma(pagoTot.map((s) => s.valor)), d.dinheiro.pago_desde_o_inicio.valor_centavos, 'din')

// Séries
const S5 = 'Dashboard: gráficos'
const ev = (nome) => soma(EVENTOS.filter((e) => e.evento === nome && dentro(e.quando, CUR)).map((e) => e.n))
linha(S5, 'Funil: cliques', soma(CLIQUES.filter((x) => dentro(x.quando, CUR)).map((x) => x.n)), d.series.funil.cliques)
linha(S5, 'Funil: checkouts iniciados', ev('checkout_iniciado'), d.series.funil.checkouts)
linha(S5, 'Funil: vendas', a.afil, d.series.funil.vendas)
linha(S5, 'Funil: reembolsos', ev('reembolso'), d.series.funil.estornos.reembolsos)
linha(S5, 'Funil: chargebacks', ev('chargeback'), d.series.funil.estornos.chargebacks)
const ranking = AFILIADOS.map((x) => ({ x, n: a.pg.filter((v) => v.af === x.chave).length })).filter((r) => r.n > 0).sort((u, v) => v.n - u.n)
ranking.forEach((r, i) => linha(S5, `Top ${i + 1} (${r.x.nome}): vendas`, r.n, d.series.top_afiliados[i].vendas))
const forma = (f, soAfil) => a.pg.filter((v) => (soAfil ? v.af : true) && (v.forma ?? 'sem_info') === f).length
for (const f of ['pix', 'cartao']) linha(S5, `Origem, afiliados: ${f}`, forma(f, true), d.series.origem.forma_pagamento.afiliados[f])
for (const f of ['pix', 'cartao', 'sem_info']) linha(S5, `Origem, todas as vendas: ${f}`, forma(f, false), d.series.origem.forma_pagamento.todas[f])
linha(S5, 'Código digitado x link: o banco não guarda esse dado', 'sem dado', d.series.origem.codigo_digitado_vs_link === null ? 'sem dado' : 'ERRO')
linha(S5, 'Vendas por dia: soma das de afiliados', a.afil, d.series.vendas_por_dia.reduce((t, x) => t + x.afiliados, 0))
linha(S5, 'Vendas por dia: soma das diretas', a.dir, d.series.vendas_por_dia.reduce((t, x) => t + x.diretas, 0))

// Resumo mensal
const S6 = 'Resumo mensal do Financeiro'
for (const mes of ['2026-10', '2026-11']) {
  const vs = pagas.filter((v) => v.af && mesBr(v.quando) === mes)
  const m = resumo.meses.find((x) => x.mes === mes)
  const lanc = (f) => comAf(vendas).filter((v) => f(v) && mesBr(v.quando) === mes)
  const base = BASE * lanc((v) => v.estado !== 'cancelada').length
  const bonus = FECHADOS.includes(mes) ? soma(afiliadosDoMes(mes).map((x) => x.n * (nivelDe(x.n).valor - BASE))) : 0
  const ajustes = soma(AJUSTES.filter((x) => mesBr(x.quando) === mes).map((x) => x.valor))
  const estornos = -BASE * vendas.filter((v) => v.estado === 'estornada' && mesBr(v.refundadoEm) === mes).length
  const liquido = soma(vs.map((v) => v.liq ?? VALOR_CHEIO))
  const custo = base + bonus + ajustes + estornos
  const rot = `${mes.slice(5)}/${mes.slice(0, 4)}`
  linha(S6, `${rot}: vendas via afiliado`, vs.length, m.vendas)
  linha(S6, `${rot}: receita bruta`, VALOR_CHEIO * vs.length, m.bruto, 'din')
  linha(S6, `${rot}: taxas do Mercado Pago`, 490 * vs.filter((v) => v.liq != null).length, m.taxas, 'din')
  linha(S6, `${rot}: receita líquida`, liquido, m.liquido, 'din')
  linha(S6, `${rot}: comissões base`, base, m.comissoes_base, 'din')
  linha(S6, `${rot}: bônus de nível`, bonus, m.bonus, 'din')
  linha(S6, `${rot}: ajustes`, ajustes, m.ajustes, 'din')
  linha(S6, `${rot}: estornos`, estornos, m.estornos, 'din')
  linha(S6, `${rot}: lucro`, liquido - custo, m.lucro, 'din')
}

// ---------- Grava a planilha ----------
const reais = (c) => (c / 100).toFixed(2).replace('.', ',')
const fmt = (v, tipo) => (v == null ? 'n/d' : typeof v === 'string' ? v : tipo === 'din' ? numeroCsv(reais(v)) : tipo === 'pct' ? numeroCsv(String(v).replace('.', ',')) : v)
const dif = linhas.filter((l) => l.mao !== l.sis)
const corpo = linhas.map((l) => [l.secao, l.nome, fmt(l.mao, l.tipo), fmt(l.sis, l.tipo), l.mao === l.sis ? 'Sim' : 'NÃO'])
const alvo = new URL('../../tasks/afiliados-conferencia.csv', import.meta.url)
writeFileSync(alvo, gerarCsv(['Seção', 'Número', 'Calculado à mão', 'Sistema', 'Confere?'], corpo))
console.log(`${linhas.length} números conferidos, ${dif.length} diferentes. Planilha: tasks/afiliados-conferencia.csv`)
for (const l of dif) console.log(`  DIFERENTE: ${l.secao} / ${l.nome}: à mão ${l.mao} x sistema ${l.sis}`)
process.exit(dif.length ? 1 : 0)
