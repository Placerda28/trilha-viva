import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { consultarAvisos } from '@/lib/gestao/avisos'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req, admin) => {
  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }
  const avisos = await consultarAvisos(db, { master: admin.papel === 'master' })
  return NextResponse.json({ ok: true, ...avisos }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
