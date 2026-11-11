import { regenerarRascunho } from '@/lib/gestao/whatsapp-rascunho'
import { rotaPost } from '@/lib/gestao/instagram-rota'
import { naoEncontrado } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Só marca como substituído; o robô escreve a nova sugestão em até 10 min.
export const POST = rotaPost(async (db, corpo) => {
  const r = await regenerarRascunho(db, { telefone: corpo?.telefone })
  return r.ok ? { ok: true, registro: { acao: 'whatsapp_rascunho_regenerado', alvo: r.telefone } } : r
})
export const GET = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
