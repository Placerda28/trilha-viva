import { mudarEstadoIa } from '@/lib/gestao/whatsapp-rascunho'
import { rotaPost } from '@/lib/gestao/instagram-rota'
import { naoEncontrado, soMasterComAviso } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = rotaPost(async (db, corpo, quem) => {
  const r = await mudarEstadoIa(db, { ligada: corpo?.ia_ligada, quem })
  return r.ok ? { ...r, registro: { acao: r.ia_ligada ? 'whatsapp_ia_ligada' : 'whatsapp_ia_desligada' } } : r
}, soMasterComAviso) // só o master liga/desliga a IA
export const GET = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
