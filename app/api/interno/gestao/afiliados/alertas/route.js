import { getDB } from '@/lib/d1'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { calcularAlertas } from '@/lib/afiliados/gestao-alertas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async () => {
  const db = getDB()
  if (!db) return Response.json({ ok: false, erro: 'Banco indisponível no momento.' }, { status: 503, headers: cabecalhosPrivados })
  return Response.json({ ok: true, ...(await calcularAlertas(db)) }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
