// Comissão base de uma venda e estorno. Chamadas na Fase 4, de dentro de
// registrarCompra (e do tratamento de reembolso). Ambas são idempotentes por compra.
import { configuracao, niveisDoMes } from './niveis.js'
import { dataDeTexto, mesDe, somarDias, textoUtc } from './datas.js'

// Valor por venda do nível FECHADO do afiliado naquele mês (vem do snapshot), ou NULL se não fechou.
const valorFechado = (a, m) => `(SELECT json_extract(f.niveis_snapshot, '$.nivel.valor_por_venda_centavos')
  FROM afiliados_fechamentos f WHERE f.afiliado_id = ${a} AND f.mes_referencia = ${m})`
const estaFechado = (a, m) =>
  `EXISTS (SELECT 1 FROM afiliados_fechamentos f WHERE f.afiliado_id = ${a} AND f.mes_referencia = ${m})`

// Grava a comissão base. Só grava se a compra ESTÁ paga agora (conferido dentro do próprio INSERT:
// um reembolso concorrente nunca deixa nascer comissão). A venda é sempre do mês de aprovação. Se esse mês já foi fechado,
// recebe o valor por venda do nível fechado (sem recalcular nível nem contagem); senão, o do menor nível.
// aprovadoEm: Date ou texto UTC; define o mês e a carência (a normal, contada da aprovação).
export async function gravarComissaoBase(db, { afiliadoId, compraId, aprovadoEm }) {
  const quando = aprovadoEm instanceof Date ? aprovadoEm : dataDeTexto(aprovadoEm)
  const mes = mesDe(quando)
  const [niveis, cfg] = await Promise.all([niveisDoMes(db, mes), configuracao(db)])
  if (niveis.length === 0) return { criado: false, motivo: 'sem-niveis' }
  const r = await db
    .prepare(
      `INSERT OR IGNORE INTO afiliados_lancamentos
         (afiliado_id, compra_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, descricao, criado_em)
       SELECT ?1, ?2, 'venda', ?3, COALESCE(${valorFechado('?1', '?3')}, ?4), 'pendente', ?5, ?6, ?7
        WHERE EXISTS (SELECT 1 FROM compras c WHERE c.id = ?2 AND c.status = 'pago' AND c.teste = 0)`,
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

// Reembolso/chargeback de uma venda. Cancelar e estornar são mutuamente exclusivos e saem no
// mesmo db.batch condicional (pedidos simultâneos nunca descontam duas vezes):
// - mês aberto e venda ainda pendente, sem saque: cancela o lançamento;
// - senão (valor preso/pago, ou mês fechado): estorno negativo. Mês fechado desconta o valor por
//   venda do nível fechado (base + bônus daquela venda); antes do fechamento, só a base.
// O nível de um mês fechado nunca é recalculado.
export async function estornarVenda(db, compraId, agora = new Date()) {
  const venda = await db
    .prepare("SELECT id, status FROM afiliados_lancamentos WHERE compra_id = ? AND tipo = 'venda'")
    .bind(compraId)
    .first()
  if (!venda) return { acao: 'nenhuma' }
  if (venda.status === 'cancelada') return { acao: 'ja_cancelada' }
  const antes = await db
    .prepare("SELECT 1 AS ok FROM afiliados_lancamentos WHERE compra_id = ? AND tipo = 'estorno'")
    .bind(compraId)
    .first()
  if (antes) return { acao: 'estorno', criado: false }

  const t = textoUtc(agora)
  const [cancelou, inseriu] = await db.batch([
    db
      .prepare(
        `UPDATE afiliados_lancamentos AS l SET status = 'cancelada'
          WHERE l.id = ?1 AND l.tipo = 'venda' AND l.status = 'pendente' AND l.saque_id IS NULL
            AND NOT ${estaFechado('l.afiliado_id', 'l.mes_referencia')}
            AND NOT EXISTS (SELECT 1 FROM afiliados_lancamentos e WHERE e.compra_id = l.compra_id AND e.tipo = 'estorno')
         RETURNING id`,
      )
      .bind(venda.id),
    db
      .prepare(
        `INSERT OR IGNORE INTO afiliados_lancamentos
           (afiliado_id, compra_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, descricao, criado_em)
         SELECT v.afiliado_id, v.compra_id, 'estorno', ?2,
                -COALESCE(${valorFechado('v.afiliado_id', 'v.mes_referencia')}, v.valor_centavos),
                'pendente', ?3, ?4, ?3
           FROM afiliados_lancamentos v
          WHERE v.id = ?1 AND v.tipo = 'venda' AND v.status != 'cancelada'
            AND (v.status IN ('em_saque', 'paga') OR ${estaFechado('v.afiliado_id', 'v.mes_referencia')})
         RETURNING id`,
      )
      .bind(venda.id, mesDe(agora), t, `Estorno da venda #${compraId}`),
  ])

  // Os resultados do lote dizem exatamente o que ESTA chamada fez.
  if (cancelou.results.length > 0) return { acao: 'cancelada' }
  if (inseriu.results.length > 0) return { acao: 'estorno', criado: true }
  const depois = await db.prepare('SELECT status FROM afiliados_lancamentos WHERE id = ?').bind(venda.id).first()
  return depois.status === 'cancelada' ? { acao: 'ja_cancelada' } : { acao: 'estorno', criado: false }
}
