import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { consultarRegistro } from '@/lib/gestao/registro'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }
  const pagina = new URL(req.url).searchParams.get('pagina')
  const resultado = await consultarRegistro(db, pagina)
  return NextResponse.json({ ok: true, ...resultado }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
