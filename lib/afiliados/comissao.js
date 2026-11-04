// Comissão base de uma venda e estorno. Chamadas na Fase 4, de dentro de
// registrarCompra (e do tratamento de reembolso). Ambas são idempotentes por compra.
import { configuracao, niveisDoMes } from './niveis.js'
import { dataDeTexto, mesDe, somarDias, textoUtc } from './datas.js'

// Grava a comissão base (valor do menor nível do mês, carência em dias).
// aprovadoEm: Date ou texto UTC do momento da aprovação; define o mês e a carência.
export async function gravarComissaoBase(db, { afiliadoId, compraId, aprovadoEm }) {
  const quando = aprovadoEm instanceof Date ? aprovadoEm : dataDeTexto(aprovadoEm)
  const mes = mesDe(quando)
  const [niveis, cfg] = await Promise.all([niveisDoMes(db, mes), configuracao(db)])
  if (niveis.length === 0) return { criado: false, motivo: 'sem-niveis' }
  const r = await db
    .prepare(
      `INSERT OR IGNORE INTO afiliados_lancamentos
         (afiliado_id, compra_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, descricao, criado_em)
       VALUES (?, ?, 'venda', ?, ?, 'pendente', ?, ?, ?)`,
    )
    .bind(
      afiliadoId,
      compraId,
      mes,
      niveis[0].valor_por_venda_centavos,
      textoUtc(somarDias(quando, cfg.carencia_dias)),
      `Venda #${compraId}`,
      textoUtc(quando),
    )
    .run()
  return { criado: r.meta.changes > 0, mes }
}

// Reembolso/chargeback de uma venda.
// - antes do fechamento e sem saque: cancela o lançamento da venda;
// - senão (mês fechado, ou valor já preso/pago): estorno negativo, descontado do próximo saque.
// O nível de um mês fechado nunca é recalculado.
export async function estornarVenda(db, compraId, agora = new Date()) {
  const venda = await db
    .prepare("SELECT id, afiliado_id, mes_referencia, valor_centavos, status, saque_id FROM afiliados_lancamentos WHERE compra_id = ? AND tipo = 'venda'")
    .bind(compraId)
    .first()
  if (!venda) return { acao: 'nenhuma' }
  if (venda.status === 'cancelada') return { acao: 'ja_cancelada' }

  const fechado = await db
    .prepare('SELECT 1 AS ok FROM afiliados_fechamentos WHERE afiliado_id = ? AND mes_referencia = ?')
    .bind(venda.afiliado_id, venda.mes_referencia)
    .first()

  if (!fechado) {
    const r = await db
      .prepare("UPDATE afiliados_lancamentos SET status = 'cancelada' WHERE id = ? AND status = 'pendente' AND saque_id IS NULL")
      .bind(venda.id)
      .run()
    if (r.meta.changes > 0) return { acao: 'cancelada' }
  }

  const t = textoUtc(agora)
  const r = await db
    .prepare(
      `INSERT OR IGNORE INTO afiliados_lancamentos
         (afiliado_id, compra_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, descricao, criado_em)
       VALUES (?, ?, 'estorno', ?, ?, 'pendente', ?, ?, ?)`,
    )
    .bind(venda.afiliado_id, compraId, mesDe(agora), -venda.valor_centavos, t, `Estorno da venda #${compraId}`, t)
    .run()
  return { acao: 'estorno', criado: r.meta.changes > 0 }
}
