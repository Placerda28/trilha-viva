import { consultarConversa, consultarConversas, IGSID_VALIDO } from '@/lib/gestao/instagram'
import { ambienteInstagram, responder, rotaGet } from '@/lib/gestao/instagram-rota'
import { configuracaoInstagram } from '@/lib/instagram-meta'
import { naoEncontrado } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /instagram: lista de conversas + estado da IA. GET ?conversa=<igsid>: uma conversa.
const get = async (req, db) => {
  const igsid = new URL(req.url).searchParams.get('conversa')
  const configurado = configuracaoInstagram(ambienteInstagram()).ok
  if (igsid === null) return responder({ ok: true, configurado, ...(await consultarConversas(db)) })
  if (!IGSID_VALIDO.test(igsid)) return responder({ ok: false, erro: 'Conversa inválida.' }, 400)
  const conversa = await consultarConversa(db, igsid)
  return responder({ ok: true, configurado, conversa })
}

export const GET = rotaGet(get)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
