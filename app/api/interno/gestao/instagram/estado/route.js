import { ligadaValida, mudarEstadoInstagram } from '@/lib/gestao/instagram-envio'
import { rotaPost } from '@/lib/gestao/instagram-rota'
import { naoEncontrado, soMasterComAviso } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = rotaPost(async (db, corpo, quem) => {
  const ligada = ligadaValida(corpo?.ia_ligada)
  if (ligada === null) return { ok: false, erro: 'Ação inválida.' }
  const r = await mudarEstadoInstagram(db, { ligada, quem })
  return { ...r, registro: { acao: ligada ? 'instagram_ia_ligada' : 'instagram_ia_desligada' } }
}, soMasterComAviso) // só o master liga/desliga a IA, como no WhatsApp
export const GET = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
