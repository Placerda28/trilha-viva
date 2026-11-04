import { mesmaOrigem } from '@/lib/origem'
import { afiliadoLogado, erro, lerJson, resposta } from '@/lib/afiliados/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  if (!mesmaOrigem(req)) return erro('Pedido recusado.', 403)
  const { falha, afiliado, db } = await afiliadoLogado()
  if (falha) return falha
  const c = await lerJson(req)
  if (typeof c?.avisar_cada_venda !== 'boolean') return erro('Informe se quer o aviso a cada venda.', 400)
  try {
    await db
      .prepare('UPDATE afiliados SET avisar_cada_venda = ? WHERE id = ?')
      .bind(c.avisar_cada_venda ? 1 : 0, afiliado.id)
      .run()
    return resposta({ ok: true, avisar_cada_venda: c.avisar_cada_venda })
  } catch (falhou) {
    console.error('afiliado preferencias', falhou?.message)
    return erro('Não foi possível salvar agora.', 503)
  }
}
