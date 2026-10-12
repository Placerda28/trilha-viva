import { executar } from './d1.js'
import { limparOrigem } from './rastreio.js'

// Grava na compra a origem e o resultado do envio à Meta. O Mercado Pago avisa
// o mesmo pagamento várias vezes: um "ok" já gravado não é apagado por uma
// falha numa repetição, e a hora do envio é a do primeiro sucesso.
export async function gravarRastreioCompra(db, { compraId, origem, metaStatus } = {}) {
  if (!db || !compraId) return null
  const o = limparOrigem(origem)
  const status = String(metaStatus || '').slice(0, 40) || null
  return executar(
    db,
    `UPDATE compras
        SET utm_source = COALESCE(utm_source, ?),
            utm_medium = COALESCE(utm_medium, ?),
            utm_campaign = COALESCE(utm_campaign, ?),
            utm_content = COALESCE(utm_content, ?),
            meta_status = CASE WHEN meta_status = 'ok' THEN 'ok' ELSE ? END,
            meta_enviado_em = CASE
              WHEN meta_enviado_em IS NULL AND ? = 'ok' THEN datetime('now')
              ELSE meta_enviado_em
            END
      WHERE stripe_session_id = ?`,
    o.source || null,
    o.medium || null,
    o.campaign || null,
    o.content || null,
    status,
    status,
    String(compraId)
  )
}
