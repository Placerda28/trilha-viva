import { getDB } from '@/lib/d1'
import { validarPeriodo } from '@/lib/gestao/datas'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { dashboardAfiliados } from '@/lib/afiliados/gestao-painel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  const url = new URL(req.url)
  const periodo = validarPeriodo(url.searchParams.get('de'), url.searchParams.get('ate'))
  if (!periodo.ok) {
    return Response.json({ ok: false, erro: periodo.erro }, { status: 400, headers: cabecalhosPrivados })
  }
  const db = getDB()
  if (!db) return Response.json({ ok: false, erro: 'Banco indisponível no momento.' }, { status: 503, headers: cabecalhosPrivados })
  return Response.json({ ok: true, ...(await dashboardAfiliados(db, periodo)) }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
