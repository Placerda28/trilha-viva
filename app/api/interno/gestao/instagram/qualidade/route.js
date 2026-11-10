import { naoEncontrado } from '@/lib/gestao/permissao'
import { consultarQualidade } from '@/lib/gestao/instagram-qualidade'
import { responder, rotaGet } from '@/lib/gestao/instagram-rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = rotaGet(async (req, db) => responder({ ok: true, ...(await consultarQualidade(db)) }))
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
