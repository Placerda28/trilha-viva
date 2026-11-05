// Dashboard de afiliados da Gestão (Fase 8A). Só leitura, sem `@/`.
// Um único db.batch com poucas consultas agregadas, todas com LIMIT; nenhum laço por afiliado
// (o nível de cada afiliado sai em memória das linhas agrupadas, com a regra pura de niveis.js).
// Vendas sempre de compras_reais com status = 'pago' (reembolso/chargeback saem da conta).
import { montarSerie, periodoAnterior } from '../gestao/datas.js'
import { ATE_FECHAR, diaDe, mesAnterior, mesDe, mesSeguinte, somarDias, textoUtc } from './datas.js'
import { SQL_VENDA_VALIDA } from './status.js'
import { montarResumoMensal, prepararResumoMensal } from './gestao-financeiro.js'
import { fraseDoPeriodo } from './gestao-painel-frase.js'
import { nivelDoGrupo, niveisVigentes, resumoAbertos } from './gestao-painel-niveis.js'
import { inicioDoMesUtc, linhas, mesesAte, mesesDoPeriodo, num, sqlMesBr, variacao } from './gestao-periodo.js'

const LIQ = 'COALESCE(c.liquido_centavos, c.valor_centavos, 0)'
const COMO_CONTADO = 'Conta de caixa: a comissão base entra no dia da venda; o bônus de nível, os ajustes e os estornos entram no dia em que foram gravados (o bônus, no dia do fechamento do mês). Por isso um período sem fechamento não mostra bônus.'
const pct1 = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null)

// Colunas de vendas para um dos dois períodos (?2 = início do período atual).
const colunasVendas = (suf, cond) => `
  COALESCE(SUM(CASE WHEN ${cond} THEN 1 END), 0) AS total_${suf},
  COALESCE(SUM(CASE WHEN ${cond} AND c.afiliado_id IS NOT NULL THEN 1 END), 0) AS afil_${suf},
  COALESCE(SUM(CASE WHEN ${cond} AND c.afiliado_id IS NOT NULL THEN ${LIQ} END), 0) AS liq_afil_${suf},
  COALESCE(SUM(CASE WHEN ${cond} AND c.afiliado_id IS NOT NULL AND c.liquido_centavos IS NULL THEN 1 END), 0) AS est_afil_${suf},
  COALESCE(SUM(CASE WHEN ${cond} AND c.afiliado_id IS NULL THEN ${LIQ} END), 0) AS liq_dir_${suf}`

// Custo do programa de um período (regra de caixa): base pela data da venda; bônus, ajustes e estornos pela data em que o
// lançamento foi gravado (o bônus nasce no fechamento do mês).
const colunasCusto = (suf, a, b) => `
  COALESCE(SUM(CASE WHEN tipo = 'venda' AND status != 'cancelada' AND criado_em >= ${a} AND criado_em < ${b} THEN valor_centavos END), 0) AS base_${suf},
  COALESCE(SUM(CASE WHEN tipo = 'bonus_nivel' AND criado_em >= ${a} AND criado_em < ${b} THEN valor_centavos END), 0) AS bonus_${suf},
  COALESCE(SUM(CASE WHEN tipo = 'ajuste' AND criado_em >= ${a} AND criado_em < ${b} THEN valor_centavos END), 0) AS ajustes_${suf},
  COALESCE(SUM(CASE WHEN tipo = 'estorno' AND criado_em >= ${a} AND criado_em < ${b} THEN valor_centavos END), 0) AS estornos_${suf}`

function numeros(v, l, suf) {
  const total = num(v[`total_${suf}`])
  const afil = num(v[`afil_${suf}`])
  const liquido = num(v[`liq_afil_${suf}`])
  const base = num(l[`base_${suf}`])
  const bonus = num(l[`bonus_${suf}`])
  const ajustes = num(l[`ajustes_${suf}`])
  const estornos = num(l[`estornos_${suf}`])
  const custo = base + bonus + ajustes + estornos
  return {
    total, afil, liquido, custo, base, bonus, ajustes, estornos,
    estimadas: num(v[`est_afil_${suf}`]),
    liquidoDireta: num(v[`liq_dir_${suf}`]),
    lucro: liquido - custo,
    cpa: afil > 0 ? Math.round(custo / afil) : null,
    pct: pct1(afil, total),
  }
}

const GRUPOS_SQL = `
  WITH v AS (
    SELECT c.afiliado_id AS aid, ${sqlMesBr('c.criado_em')} AS mes, COUNT(*) AS n, SUM(${LIQ}) AS liq
      FROM compras_reais c
     WHERE c.status = 'pago' AND c.afiliado_id IS NOT NULL AND c.criado_em >= ?1 AND c.criado_em < ?2
     GROUP BY aid, mes LIMIT 5000)
  SELECT v.aid, v.mes, v.n, v.liq,
         (SELECT COUNT(*) FROM afiliados_lancamentos l WHERE l.afiliado_id = v.aid AND l.mes_referencia = v.mes AND ${SQL_VENDA_VALIDA}) AS validas,
         (f.id IS NOT NULL) AS fechado,
         json_extract(f.niveis_snapshot, '$.nivel.nome') AS fech_nome,
         json_extract(f.niveis_snapshot, '$.nivel.valor_por_venda_centavos') AS fech_valor,
         fn.nome AS fixo_nome, fn.valor_por_venda_centavos AS fixo_valor
    FROM v
    JOIN afiliados a ON a.id = v.aid
    LEFT JOIN afiliados_niveis fn ON fn.id = a.nivel_fixo_id
    LEFT JOIN afiliados_fechamentos f ON f.afiliado_id = v.aid AND f.mes_referencia = v.mes`

const ABERTOS_SQL = `
  SELECT l.afiliado_id AS aid, l.mes_referencia AS mes, a.status, fn.nome AS fixo_nome, fn.valor_por_venda_centavos AS fixo_valor,
         COUNT(*) AS validas, (f.id IS NOT NULL) AS fechado
    FROM afiliados_lancamentos l
    JOIN afiliados a ON a.id = l.afiliado_id
    LEFT JOIN afiliados_niveis fn ON fn.id = a.nivel_fixo_id
    LEFT JOIN afiliados_fechamentos f ON f.afiliado_id = l.afiliado_id AND f.mes_referencia = l.mes_referencia
   WHERE l.mes_referencia IN (?1, ?2) AND ${SQL_VENDA_VALIDA}
   GROUP BY l.afiliado_id, l.mes_referencia LIMIT 5000`

// Vendas por nível (nível do mês da venda): receita, custo = vendas x valor por venda do nível, lucro.
function lucroPorNivel(grupos, todos, mesAtual) {
  const ordem = niveisVigentes(todos, mesAtual).map((n) => n.nome)
  const mapa = new Map(ordem.map((nome) => [nome, { nivel: nome, vendas: 0, receita_liquida_centavos: 0, custo_centavos: 0 }]))
  for (const g of grupos) {
    const { nome, valor } = nivelDoGrupo(g, todos)
    const m = mapa.get(nome) || mapa.set(nome, { nivel: nome, vendas: 0, receita_liquida_centavos: 0, custo_centavos: 0 }).get(nome)
    m.vendas += num(g.n)
    m.receita_liquida_centavos += num(g.liq)
    m.custo_centavos += num(g.n) * valor
  }
  return [...mapa.values()].map((m) => {
    const lucro = m.receita_liquida_centavos - m.custo_centavos
    return { ...m, lucro_centavos: lucro, lucro_por_venda_centavos: m.vendas > 0 ? Math.round(lucro / m.vendas) : null }
  })
}

function distribuicao(meses, todos, mesAtual, fechadosRows, abertosRows) {
  const nomes = niveisVigentes(todos, mesAtual).map((n) => n.nome)
  const mapa = new Map(meses.map((mes) => [mes, {}]))
  const soma = (mes, nome, n) => {
    const m = mapa.get(mes)
    if (!m) return
    if (!nomes.includes(nome)) nomes.push(nome)
    m[nome] = (m[nome] || 0) + n
  }
  for (const r of fechadosRows) soma(r.mes, r.nivel, num(r.n))
  for (const r of abertosRows) if (!r.fechado) soma(r.mes, nivelDoGrupo(r, todos).nome, 1)
  return {
    niveis: nomes,
    meses: meses.map((mes) => ({ mes, contagens: Object.fromEntries(nomes.map((nome) => [nome, mapa.get(mes)[nome] || 0])) })),
  }
}

function origemForma(rows) {
  const vazio = () => ({ pix: 0, cartao: 0, outro: 0, sem_info: 0 })
  const afiliados = vazio()
  const todas = vazio()
  for (const r of rows) {
    todas[r.forma] += num(r.n)
    if (num(r.afil)) afiliados[r.forma] += num(r.n)
  }
  return { afiliados, todas }
}

export async function dashboardAfiliados(db, periodo, agora = new Date()) {
  const ant = periodoAnterior(periodo.de, periodo.ate)
  const mesAtual = mesDe(agora)
  const mesPrev = mesAnterior(mesAtual)
  const janela = mesesAte(periodo.ate.slice(0, 7), Math.min(24, Math.max(12, mesesDoPeriodo(periodo, { maximo: 24 }).length)))
  const iniJan = inicioDoMesUtc(janela[0])
  const fimJan = inicioDoMesUtc(mesSeguinte(janela[janela.length - 1]))
  const t = textoUtc(agora)
  const em15 = textoUtc(somarDias(agora, 15))
  const antes30 = textoUtc(somarDias(agora, -30))
  const p = { ini: periodo.inicioUtc, fim: periodo.fimUtc }

  const [vendas, forma, custo, grupos, dia, mensalC, mensalL, funil, top, abertos, niveis, cfg, distFech, novos, cont, saldos, saques] = await db.batch([
    db.prepare(`SELECT ${colunasVendas('atual', 'c.criado_em >= ?2')}, ${colunasVendas('ant', 'c.criado_em < ?2')}
                  FROM compras_reais c WHERE c.status = 'pago' AND c.criado_em >= ?1 AND c.criado_em < ?3`).bind(ant.inicioUtc, p.ini, p.fim),
    db.prepare(`SELECT CASE WHEN f IN ('pix', 'cartao', 'sem_info') THEN f ELSE 'outro' END AS forma, afil, COUNT(*) AS n FROM (
                  SELECT COALESCE(c.forma_pagamento, CASE WHEN c.stripe_session_id LIKE 'cs_live_%' OR c.stripe_session_id LIKE 'cs_test_%' THEN 'cartao' END, 'sem_info') AS f,
                         c.afiliado_id IS NOT NULL AS afil
                    FROM compras_reais c WHERE c.status = 'pago' AND c.criado_em >= ?1 AND c.criado_em < ?2)
                 GROUP BY forma, afil LIMIT 20`).bind(p.ini, p.fim),
    db.prepare(`SELECT ${colunasCusto('atual', '?2', '?3')}, ${colunasCusto('ant', '?1', '?2')}
                  FROM afiliados_lancamentos WHERE criado_em >= ?1`)
      .bind(ant.inicioUtc, p.ini, p.fim),
    db.prepare(GRUPOS_SQL).bind(p.ini, p.fim),
    db.prepare(`SELECT date(criado_em, '-3 hours') AS chave, COALESCE(SUM(afiliado_id IS NULL), 0) AS diretas, COALESCE(SUM(afiliado_id IS NOT NULL), 0) AS afil
                  FROM compras_reais WHERE status = 'pago' AND criado_em >= ?1 AND criado_em < ?2 GROUP BY chave ORDER BY chave LIMIT 800`).bind(p.ini, p.fim),
    ...prepararResumoMensal(db, iniJan, fimJan, { bonusPor: 'fechamento' }),
    db.prepare(`SELECT (SELECT COUNT(*) FROM afiliados_cliques WHERE criado_em >= ?1 AND criado_em < ?2) AS cliques,
                       COALESCE(SUM(evento = 'checkout_iniciado'), 0) AS checkouts, COALESCE(SUM(evento = 'reembolso'), 0) AS reembolsos,
                       COALESCE(SUM(evento = 'chargeback'), 0) AS chargebacks
                  FROM afiliados_eventos WHERE criado_em >= ?1 AND criado_em < ?2`).bind(p.ini, p.fim),
    db.prepare(`SELECT a.id, a.nome, a.codigo, COUNT(*) AS vendas, SUM(${LIQ}) AS liq
                  FROM compras_reais c JOIN afiliados a ON a.id = c.afiliado_id
                 WHERE c.status = 'pago' AND c.criado_em >= ?1 AND c.criado_em < ?2
                 GROUP BY a.id ORDER BY vendas DESC, liq DESC, a.id LIMIT 10`).bind(p.ini, p.fim),
    db.prepare(ABERTOS_SQL).bind(mesPrev, mesAtual),
    db.prepare('SELECT nome, vendas_minimas, valor_por_venda_centavos, valido_desde_mes FROM afiliados_niveis ORDER BY valido_desde_mes, vendas_minimas LIMIT 200'),
    db.prepare('SELECT dia_fechamento FROM afiliados_config WHERE id = 1'),
    db.prepare(`SELECT f.mes_referencia AS mes, COALESCE(json_extract(f.niveis_snapshot, '$.nivel.nome'), 'Sem nível') AS nivel, COUNT(*) AS n
                  FROM afiliados_fechamentos f WHERE f.mes_referencia >= ?1 AND f.mes_referencia <= ?2 GROUP BY mes, nivel LIMIT 200`)
      .bind(janela[0], janela[janela.length - 1]),
    db.prepare(`SELECT ${sqlMesBr('criado_em')} AS mes, COUNT(*) AS n FROM afiliados WHERE criado_em >= ?1 AND criado_em < ?2 GROUP BY mes LIMIT 40`).bind(iniJan, fimJan),
    db.prepare(`SELECT COUNT(*) AS cadastrados, COALESCE(SUM(status = 'ativo'), 0) AS ativos, COALESCE(SUM(status = 'pendente'), 0) AS pendentes,
                       COALESCE(SUM(status = 'suspenso'), 0) AS suspensos, COALESCE(SUM(criado_em >= ?1 AND criado_em < ?2), 0) AS novos,
                       COALESCE(SUM(a.status = 'ativo' AND COALESCE(u.ult, a.criado_em) < ?3), 0) AS inativos,
                       (SELECT COUNT(DISTINCT c.afiliado_id) FROM compras_reais c WHERE c.status = 'pago' AND c.afiliado_id IS NOT NULL AND c.criado_em >= ?1 AND c.criado_em < ?2) AS venderam
                  FROM afiliados a
                  LEFT JOIN (SELECT afiliado_id, MAX(criado_em) AS ult FROM compras_reais WHERE status = 'pago' AND afiliado_id IS NOT NULL GROUP BY afiliado_id) u
                    ON u.afiliado_id = a.id`).bind(p.ini, p.fim, antes30), // um GROUP BY só: MAX correlacionado por afiliado varria a tabela inteira
    db.prepare(`SELECT (SELECT COALESCE(SUM(MAX(d, 0)), 0) FROM (SELECT SUM(valor_centavos) AS d FROM afiliados_lancamentos
                         WHERE status = 'pendente' AND saque_id IS NULL AND disponivel_em <= ?1 GROUP BY afiliado_id)) AS disponivel,
                       COALESCE(SUM(CASE WHEN status = 'pendente' AND saque_id IS NULL AND disponivel_em > ?1 THEN valor_centavos END), 0) AS liberando,
                       COALESCE(SUM(CASE WHEN status = 'pendente' AND saque_id IS NULL AND disponivel_em > ?1
                                          AND (disponivel_em <= ?2
                                               OR (disponivel_em = '${ATE_FECHAR}' AND date(mes_referencia || '-01', '+1 month',
                                                     '+' || ((SELECT dia_fechamento FROM afiliados_config WHERE id = 1) - 1) || ' days') <= ?3))
                                     THEN valor_centavos END), 0) AS libera_15d
                  FROM afiliados_lancamentos`).bind(t, em15, diaDe(somarDias(agora, 15))),
    db.prepare(`SELECT COALESCE(SUM(status = 'solicitado'), 0) AS pend_n, COALESCE(SUM(CASE WHEN status = 'solicitado' THEN valor_centavos END), 0) AS pend_v,
                       COALESCE(SUM(status = 'pago' AND pago_em >= ?1 AND pago_em < ?2), 0) AS per_n,
                       COALESCE(SUM(CASE WHEN status = 'pago' AND pago_em >= ?1 AND pago_em < ?2 THEN valor_centavos END), 0) AS per_v,
                       COALESCE(SUM(status = 'pago'), 0) AS tot_n, COALESCE(SUM(CASE WHEN status = 'pago' THEN valor_centavos END), 0) AS tot_v
                  FROM afiliados_saques`).bind(p.ini, p.fim),
  ])

  const v = linhas(vendas)[0]
  const l = linhas(custo)[0]
  const cur = numeros(v, l, 'atual')
  const prev = numeros(v, l, 'ant')
  const todosNiveis = linhas(niveis)
  const aberto = resumoAbertos(linhas(abertos), todosNiveis, mesAtual, num(linhas(cfg)[0]?.dia_fechamento) || 8)
  const nomesAtuais = niveisVigentes(todosNiveis, mesAtual).map((n) => n.nome)
  const c = linhas(cont)[0]
  const f = linhas(funil)[0]
  const s = linhas(saldos)[0]
  const q = linhas(saques)[0]
  const diretas = cur.total - cur.afil
  const comparaVendas = variacao(cur.afil, prev.afil)
  const bonusAte = diaDe(new Date(agora.getTime() + 15 * 86400000))
  const bonus15 = aberto.partes.filter((x) => x.fecha_em <= bonusAte).reduce((soma, x) => soma + x.valor_centavos, 0)
  const resumo = montarResumoMensal(janela, linhas(mensalC), linhas(mensalL))

  const diarias = linhas(dia)
  const serieDe = (campo) => montarSerie({ de: periodo.de, ate: periodo.ate, agrupar: 'dia', linhas: diarias.map((r) => ({ chave: r.chave, compras: r[campo] })) })
  const diretasSerie = serieDe('diretas')
  const afilSerie = serieDe('afil')

  return {
    periodo: { de: periodo.de, ate: periodo.ate, dias: periodo.dias, anterior: { de: ant.de, ate: ant.ate } },
    gerado_em: agora.toISOString(),
    frase: fraseDoPeriodo({
      de: periodo.de, ate: periodo.ate, vendasAfil: cur.afil, vendasTotal: cur.total, pctAfil: cur.pct, liquido: cur.liquido,
      custo: cur.custo, lucro: cur.lucro, cpa: cur.cpa, estimadas: cur.estimadas, comparaVendas,
    }),
    compensa: {
      receita_liquida_afiliados_centavos: cur.liquido,
      vendas_com_valor_estimado: cur.estimadas,
      custo_programa: { como_contado: COMO_CONTADO, total_centavos: cur.custo, base_centavos: cur.base, bonus_centavos: cur.bonus, ajustes_centavos: cur.ajustes, estornos_centavos: cur.estornos },
      lucro_afiliados_centavos: cur.lucro,
      vendas_afiliados: cur.afil,
      vendas_diretas: diretas,
      vendas_total: cur.total,
      pct_vendas_afiliados: cur.pct,
      cpa_centavos: cur.cpa,
      lucro_por_venda: {
        afiliado_centavos: cur.afil > 0 ? Math.round(cur.lucro / cur.afil) : null,
        direta_centavos: diretas > 0 ? Math.round(cur.liquidoDireta / diretas) : null,
        por_nivel: lucroPorNivel(linhas(grupos), todosNiveis, mesAtual),
      },
      comparacao: {
        vendas_afiliados: comparaVendas,
        vendas_total: variacao(cur.total, prev.total),
        receita_liquida: variacao(cur.liquido, prev.liquido),
        custo: variacao(cur.custo, prev.custo),
        lucro: variacao(cur.lucro, prev.lucro),
        cpa: variacao(cur.cpa, prev.cpa),
        pct_vendas_afiliados: variacao(cur.pct, prev.pct),
      },
    },
    afiliados: {
      cadastrados: num(c.cadastrados), ativos: num(c.ativos), pendentes: num(c.pendentes), suspensos: num(c.suspensos),
      novos: num(c.novos), venderam: num(c.venderam), inativos_30d: num(c.inativos),
      por_nivel_mes_atual: {
        mes: mesAtual,
        niveis: Object.fromEntries([...nomesAtuais, ...Object.keys(aberto.porNivel).filter((n) => !nomesAtuais.includes(n))].map((n) => [n, aberto.porNivel[n] || 0])),
        ativos_sem_vendas: Math.max(0, num(c.ativos) - aberto.ativosComVenda),
      },
      perto_de_subir: aberto.pertoDeSubir,
    },
    dinheiro: {
      disponivel_centavos: num(s.disponivel),
      liberando_centavos: num(s.liberando),
      bonus_previsto: { total_centavos: aberto.partes.reduce((soma, x) => soma + x.valor_centavos, 0), partes: aberto.partes },
      previsao_15_dias: { libera_centavos: num(s.libera_15d), bonus_centavos: bonus15, total_centavos: num(s.libera_15d) + bonus15 },
      saques_pendentes: { quantidade: num(q.pend_n), valor_centavos: num(q.pend_v) },
      pago_no_periodo: { quantidade: num(q.per_n), valor_centavos: num(q.per_v) },
      pago_desde_o_inicio: { quantidade: num(q.tot_n), valor_centavos: num(q.tot_v) },
    },
    series: {
      vendas_por_dia: diretasSerie.map((d, i) => ({ dia: d.chave, rotulo: d.rotulo, diretas: d.compras, afiliados: afilSerie[i].compras })),
      receita_custo_mensal: resumo.meses.map((m) => ({ mes: m.mes, vendas: m.vendas, receita_liquida_centavos: m.liquido, custo_centavos: m.custo, lucro_centavos: m.lucro })),
      funil: {
        cliques: num(f.cliques), checkouts: num(f.checkouts), vendas: cur.afil,
        estornos: { reembolsos: num(f.reembolsos), chargebacks: num(f.chargebacks), total: num(f.reembolsos) + num(f.chargebacks) },
        taxa_clique_checkout: pct1(num(f.checkouts), num(f.cliques)),
        taxa_checkout_venda: pct1(cur.afil, num(f.checkouts)),
      },
      top_afiliados: linhas(top).map((r) => ({ afiliado_id: Number(r.id), nome: r.nome, codigo: r.codigo, vendas: num(r.vendas), receita_liquida_centavos: num(r.liq) })),
      distribuicao_niveis: distribuicao(janela, todosNiveis, mesAtual, linhas(distFech), linhas(abertos)),
      novos_afiliados_por_mes: janela.map((mes) => ({ mes, novos: num(linhas(novos).find((r) => r.mes === mes)?.n) })),
      origem: { forma_pagamento: origemForma(linhas(forma)), codigo_digitado_vs_link: null },
    },
  }
}
