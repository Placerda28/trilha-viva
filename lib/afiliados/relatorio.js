// Relatório do fechamento de um mês, lido só de afiliados_fechamentos (Gestão, botão manual).
import { configuracao } from './niveis.js'
import { mesParaFechar } from './datas.js'

export const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/

export async function relatorioDoMes(db, mes, agora = new Date()) {
  const [tot, porNivel, faltam, cfg] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS afiliados, COALESCE(SUM(base_centavos), 0) AS base, COALESCE(SUM(bonus_centavos), 0) AS bonus,
        COALESCE(SUM(total_centavos), 0) AS total, MAX(fechado_em) AS rodou_em
        FROM afiliados_fechamentos WHERE mes_referencia = ?`).bind(mes).first(),
    db.prepare(`SELECT COALESCE(json_extract(niveis_snapshot, '$.nivel.nome'), 'Sem nível') AS nivel, COUNT(*) AS afiliados
        FROM afiliados_fechamentos WHERE mes_referencia = ? GROUP BY 1 ORDER BY 2 DESC LIMIT 20`).bind(mes).all(),
    db.prepare(`SELECT COUNT(DISTINCT l.afiliado_id) AS n FROM afiliados_lancamentos l
        WHERE l.mes_referencia = ?1 AND l.tipo = 'venda'
          AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos f WHERE f.afiliado_id = l.afiliado_id AND f.mes_referencia = ?1)`).bind(mes).first(),
    configuracao(db),
  ])
  const feitos = Number(tot.afiliados)
  const faltando = Number(faltam.n)
  return {
    mes,
    liberado: mes <= mesParaFechar(agora, cfg.dia_fechamento),
    status: faltando === 0 ? 'rodado' : feitos === 0 ? 'pendente' : 'parcial',
    faltam: faltando,
    rodou_em: tot.rodou_em || null,
    afiliados: feitos,
    por_nivel: porNivel.results.map((r) => ({ nivel: r.nivel, afiliados: Number(r.afiliados) })),
    total_base_centavos: Number(tot.base),
    total_bonus_centavos: Number(tot.bonus),
    total_mes_centavos: Number(tot.total),
  }
}
