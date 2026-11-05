// ÚNICA fonte dos números do afiliado (painel dele e Gestão usam esta função).
// Sempre filtra por afiliadoId: quem chama deriva o id da sessão, nunca da requisição.
import { calcularNivel, niveisDoMes, nivelFixoDe } from './niveis.js'
import { ATE_FECHAR, textoUtc } from './datas.js'

// Venda válida = lançamento de venda do mês, não cancelado e sem estorno.
export const SQL_VENDA_VALIDA = `l.tipo = 'venda' AND l.status != 'cancelada'
  AND NOT EXISTS (SELECT 1 FROM afiliados_lancamentos e WHERE e.compra_id = l.compra_id AND e.tipo = 'estorno')`

// disponivel_em de um lançamento para MOSTRAR (Gestão): o marcador ATE_FECHAR vira o instante previsto do fechamento
// (00:00 de Brasília do dia_fechamento do mês seguinte). Nunca usar para decidir saldo: o saldo lê o disponivel_em cru.
export const SQL_DISPONIVEL_PREVISTO = (a) => `CASE WHEN ${a}.disponivel_em = '${ATE_FECHAR}'
  THEN datetime(${a}.mes_referencia || '-01', '+1 month', '+' || ((SELECT dia_fechamento FROM afiliados_config WHERE id = 1) - 1) || ' days', '+3 hours')
  ELSE ${a}.disponivel_em END`

export async function contarVendasDoMes(db, afiliadoId, mes) {
  const r = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM afiliados_lancamentos l
        WHERE l.afiliado_id = ? AND l.mes_referencia = ? AND ${SQL_VENDA_VALIDA}`,
    )
    .bind(afiliadoId, mes)
    .first()
  return Number(r?.n || 0)
}

export async function saldosDoAfiliado(db, afiliadoId, agora) {
  const t = textoUtc(agora)
  const r = await db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'pendente' AND saque_id IS NULL AND disponivel_em <= ?1 THEN valor_centavos END), 0) AS disponivel,
         COALESCE(SUM(CASE WHEN status = 'pendente' AND saque_id IS NULL AND disponivel_em > ?1 THEN valor_centavos END), 0) AS liberando,
         MIN(CASE WHEN status = 'pendente' AND saque_id IS NULL AND disponivel_em > ?1 THEN disponivel_em END) AS proxima,
         COALESCE(SUM(CASE WHEN status = 'em_saque' THEN valor_centavos END), 0) AS em_saque,
         COALESCE(SUM(CASE WHEN status = 'paga' THEN valor_centavos END), 0) AS ja_recebido
       FROM afiliados_lancamentos WHERE afiliado_id = ?2`,
    )
    .bind(t, afiliadoId)
    .first()
  return {
    disponivel: Number(r.disponivel),
    liberando: Number(r.liberando),
    proximaLiberacao: r.proxima || null,
    emSaque: Number(r.em_saque),
    jaRecebido: Number(r.ja_recebido),
  }
}

export async function statusDoMes(db, afiliadoId, mes, agora = new Date()) {
  const fechamento = await db
    .prepare('SELECT * FROM afiliados_fechamentos WHERE afiliado_id = ? AND mes_referencia = ?')
    .bind(afiliadoId, mes)
    .first()
  const saldos = await saldosDoAfiliado(db, afiliadoId, agora)

  // Mês fechado: vale o que foi gravado. Estorno tardio não recalcula o nível.
  if (fechamento) {
    const nivel = JSON.parse(fechamento.niveis_snapshot).nivel || null
    return {
      mes,
      fechado: true,
      vendasValidas: fechamento.vendas_validas,
      nivel,
      proximo: null,
      faltam: 0,
      garantido: fechamento.base_centavos,
      bonusPrevisto: fechamento.bonus_centavos,
      totalPrevisto: fechamento.total_centavos,
      saldos: { ...saldos, bonusAReceber: 0 },
    }
  }

  const [vendas, niveis, fixo] = await Promise.all([
    contarVendasDoMes(db, afiliadoId, mes),
    niveisDoMes(db, mes),
    nivelFixoDe(db, afiliadoId),
  ])
  const c = calcularNivel(vendas, niveis, fixo)
  return {
    mes,
    fechado: false,
    vendasValidas: vendas,
    nivel: c.nivel,
    proximo: c.proximo,
    faltam: c.faltam,
    garantido: c.base,
    bonusPrevisto: c.bonus,
    totalPrevisto: c.total,
    saldos: { ...saldos, bonusAReceber: c.bonus },
  }
}
