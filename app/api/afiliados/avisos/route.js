import { mesmaOrigem } from '@/lib/origem'
import { afiliadoLogado, erro, lerJson, resposta } from '@/lib/afiliados/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  if (!mesmaOrigem(req)) return erro('Pedido recusado.', 403)
  const { falha, afiliado, db } = await afiliadoLogado()
  if (falha) return falha
  const ids = (await lerJson(req))?.ids
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50 || !ids.every((i) => Number.isSafeInteger(i) && i > 0)) {
    return erro('Envie a lista de avisos.', 400)
  }
  try {
    // O filtro por afiliado_id é o que impede marcar aviso de outra pessoa.
    await db
      .prepare(
        `UPDATE afiliados_avisos SET lido_em = datetime('now')
          WHERE afiliado_id = ? AND lido_em IS NULL AND id IN (${ids.map(() => '?').join(',')})`,
      )
      .bind(afiliado.id, ...ids)
      .run()
    return resposta({ ok: true })
  } catch (falhou) {
    console.error('afiliado avisos', falhou?.message)
    return erro('Não foi possível salvar agora.', 503)
  }
}
