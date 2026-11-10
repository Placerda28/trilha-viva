import { regenerarRascunho } from '@/lib/gestao/instagram-envio'
import { rotaPost } from '@/lib/gestao/instagram-rota'
import { naoEncontrado } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Só marca o rascunho como substituído; o robô escreve o novo em até 10 min.
export const POST = rotaPost(async (db, corpo) => {
  const r = await regenerarRascunho(db, { igsid: corpo?.igsid })
  return r.ok ? { ok: true, registro: { acao: 'instagram_regenerado', alvo: corpo.igsid } } : r
})
export const GET = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
