// ÚNICA fonte dos números do afiliado (painel dele e Gestão usam esta função).
// Sempre filtra por afiliadoId: quem chama deriva o id da sessão, nunca da requisição.
import { calcularNivel, niveisDoMes, nivelFixoDe } from './niveis.js'
import { textoUtc } from './datas.js'

// Venda válida = lançamento de venda do mês, não cancelado e sem estorno.
export const SQL_VENDA_VALIDA = `l.tipo = 'venda' AND l.status != 'cancelada'
  AND NOT EXISTS (SELECT 1 FROM afiliados_lancamentos e WHERE e.compra_id = l.compra_id AND e.tipo = 'estorno')`

// REGRA ÚNICA DE DISPONIBILIDADE (decisão do dono, 05/11). Venda: disponível SE E SÓ SE o mês do afiliado tem linha em
// afiliados_fechamentos (índice único afiliado+mês); o disponivel_em dela é IGNORADO (versão antiga no ar, 0022, restauração
// ou marcador preso nunca liberam dinheiro de mês aberto, nem seguram o de mês fechado). Os outros tipos (bonus_nivel, ajuste,
// estorno, devolução) seguem disponivel_em <= agora. `a` = alias da tabela; `t` = SQL do instante (ex.: '?1').
const COND_DISPONIVEL = (a, t) => `CASE WHEN ${a}.tipo = 'venda'
    THEN EXISTS (SELECT 1 FROM afiliados_fechamentos zf WHERE zf.afiliado_id = ${a}.afiliado_id AND zf.mes_referencia = ${a}.mes_referencia)
    ELSE ${a}.disponivel_em <= ${t} END`
export const SQL_DISPONIVEL = (a, t) => `(${a}.status = 'pendente' AND ${a}.saque_id IS NULL AND ${COND_DISPONIVEL(a, t)})`
// Pendente que ainda não liberou: venda de mês sem fechamento (e, em tese, outro tipo com data futura).
export const SQL_LIBERANDO = (a, t) => `(${a}.status = 'pendente' AND ${a}.saque_id IS NULL AND NOT (${COND_DISPONIVEL(a, t)}))`

// disponivel_em de um lançamento para MOSTRAR (Gestão). Venda: o fechado_em REAL se o mês fechou; senão a data prevista do
// fechamento, nunca antes de `agora` + 1 min (mês ainda aberto não pode aparecer como "disponível" só porque a data passou).
// Outros tipos: o próprio disponivel_em. `agora`: Date. Só exibição: nunca decide saldo.
export const SQL_DISPONIVEL_PREVISTO = (a, agora) => `CASE WHEN ${a}.tipo = 'venda' THEN COALESCE(
    (SELECT zf.fechado_em FROM afiliados_fechamentos zf WHERE zf.afiliado_id = ${a}.afiliado_id AND zf.mes_referencia = ${a}.mes_referencia),
    MAX(datetime(${a}.mes_referencia || '-01', '+1 month', '+' || ((SELECT dia_fechamento FROM afiliados_config WHERE id = 1) - 1) || ' days', '+3 hours'),
        '${textoUtc(new Date(agora.getTime() + 60000))}'))
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
         COALESCE(SUM(CASE WHEN ${SQL_DISPONIVEL('l', '?1')} THEN l.valor_centavos END), 0) AS disponivel,
         COALESCE(SUM(CASE WHEN ${SQL_LIBERANDO('l', '?1')} THEN l.valor_centavos END), 0) AS liberando,
         COALESCE(SUM(CASE WHEN l.status = 'em_saque' THEN l.valor_centavos END), 0) AS em_saque,
         COALESCE(SUM(CASE WHEN l.status = 'paga' THEN l.valor_centavos END), 0) AS ja_recebido
       FROM afiliados_lancamentos l WHERE l.afiliado_id = ?2`,
    )
    .bind(t, afiliadoId)
    .first()
  return {
    disponivel: Number(r.disponivel),
    liberando: Number(r.liberando),
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
