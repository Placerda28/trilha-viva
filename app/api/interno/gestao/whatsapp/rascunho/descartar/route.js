import { descartarRascunho } from '@/lib/gestao/whatsapp-rascunho'
import { rotaPost } from '@/lib/gestao/instagram-rota'
import { naoEncontrado } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = rotaPost(async (db, corpo, quem) => {
  const r = await descartarRascunho(db, { rascunhoId: corpo?.rascunho_id, quem })
  return r.ok ? { ok: true, registro: { acao: 'whatsapp_rascunho_descartado', alvo: r.telefone } } : r
})
export const GET = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
