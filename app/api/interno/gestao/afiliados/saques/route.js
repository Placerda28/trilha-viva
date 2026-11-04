import { getDB } from '@/lib/d1'
import { naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { resposta } from '@/lib/gestao/saques-rota'
import { listarSaques } from '@/lib/afiliados/saques-gestao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const q = new URL(req.url).searchParams
  return resposta({ ok: true, ...(await listarSaques(db, { status: q.get('status') || 'pendentes', pagina: q.get('pagina') || 1 })) })
}

export const GET = soAdmin(get)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
