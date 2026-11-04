// Relatório do fechamento de um ou mais meses, lido só de afiliados_fechamentos (Gestão, botão manual e aba Metas).
import { configuracao } from './niveis.js'
import { mesParaFechar } from './datas.js'

export const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/

// 5 consultas no total, qualquer que seja o número de meses (a aba Metas pede 6).
export async function relatoriosDosMeses(db, meses, agora = new Date()) {
  const lista = [...new Set(meses)].filter((m) => MES_VALIDO.test(m)).slice(0, 24)
  if (lista.length === 0) return []
  const marcas = lista.map(() => '?').join(',')
  const [tot, porNivel, faltam, cfg] = await Promise.all([
    db.prepare(`SELECT mes_referencia AS mes, COUNT(*) AS afiliados, COALESCE(SUM(base_centavos), 0) AS base,
        COALESCE(SUM(bonus_centavos), 0) AS bonus, COALESCE(SUM(total_centavos), 0) AS total, MAX(fechado_em) AS rodou_em
        FROM afiliados_fechamentos WHERE mes_referencia IN (${marcas}) GROUP BY mes_referencia LIMIT 24`).bind(...lista).all(),
    db.prepare(`SELECT mes_referencia AS mes, COALESCE(json_extract(niveis_snapshot, '$.nivel.nome'), 'Sem nível') AS nivel, COUNT(*) AS afiliados
        FROM afiliados_fechamentos WHERE mes_referencia IN (${marcas}) GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 200`).bind(...lista).all(),
    db.prepare(`SELECT l.mes_referencia AS mes, COUNT(DISTINCT l.afiliado_id) AS n FROM afiliados_lancamentos l
        WHERE l.mes_referencia IN (${marcas}) AND l.tipo = 'venda'
          AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos f WHERE f.afiliado_id = l.afiliado_id AND f.mes_referencia = l.mes_referencia)
        GROUP BY l.mes_referencia LIMIT 24`).bind(...lista).all(),
    configuracao(db),
  ])
  return lista.map((mes) => {
    const t = tot.results.find((r) => r.mes === mes)
    const feitos = Number(t?.afiliados || 0)
    const faltando = Number(faltam.results.find((r) => r.mes === mes)?.n || 0)
    return {
      mes,
      liberado: mes <= mesParaFechar(agora, cfg.dia_fechamento),
      status: faltando === 0 ? 'rodado' : feitos === 0 ? 'pendente' : 'parcial',
      faltam: faltando,
      rodou_em: t?.rodou_em || null,
      afiliados: feitos,
      por_nivel: porNivel.results
        .filter((r) => r.mes === mes)
        .map((r) => ({ nivel: r.nivel, afiliados: Number(r.afiliados) })),
      total_base_centavos: Number(t?.base || 0),
      total_bonus_centavos: Number(t?.bonus || 0),
      total_mes_centavos: Number(t?.total || 0),
    }
  })
}

export async function relatorioDoMes(db, mes, agora = new Date()) {
  return (await relatoriosDosMeses(db, [mes], agora))[0]
}
