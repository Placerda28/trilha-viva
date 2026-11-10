import { responderConversa, validarEnvio } from '@/lib/gestao/instagram-envio'
import { ambienteInstagram, rotaPost } from '@/lib/gestao/instagram-rota'
import { naoEncontrado } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O único caminho de envio do sistema: o clique de um admin.
export const POST = rotaPost(async (db, corpo, quem) => {
  const v = validarEnvio(corpo)
  if (!v.ok) return v
  const r = await responderConversa(db, ambienteInstagram(), { igsid: v.igsid, texto: v.texto, rascunhoId: v.rascunhoId, quem })
  return r.ok ? { ...r, registro: { acao: 'instagram_respondido', alvo: v.igsid } } : r
})
export const GET = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
