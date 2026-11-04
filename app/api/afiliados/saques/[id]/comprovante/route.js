import { linkDeDownload } from '@/lib/b2'
import { afiliadoLogado, erro, irPara } from '@/lib/afiliados/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O afiliado só abre o comprovante do PRÓPRIO saque pago; qualquer outro caso é 404.
export async function GET(_req, ctx) {
  const { falha, afiliado, db } = await afiliadoLogado()
  if (falha) return falha
  const id = Number((await ctx.params).id)
  const s = Number.isSafeInteger(id)
    ? await db
        .prepare("SELECT comprovante_caminho AS c FROM afiliados_saques WHERE id = ? AND afiliado_id = ? AND status = 'pago'")
        .bind(id, afiliado.id)
        .first()
    : null
  if (!s?.c) return erro('Comprovante não encontrado.', 404)
  try {
    const link = await linkDeDownload(s.c, `comprovante-saque-${id}.${String(s.c).split('.').pop()}`, 300)
    if (link) return irPara(link)
  } catch (falhou) {
    console.error('afiliado comprovante', falhou?.message)
  }
  return erro('Não foi possível abrir o comprovante agora.', 503)
}
