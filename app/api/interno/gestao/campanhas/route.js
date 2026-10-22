import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { consultarCampanhas } from '@/lib/gestao/campanhas'
import { validarPeriodo } from '@/lib/gestao/datas'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function erro(mensagem, status = 400) {
  return NextResponse.json({ ok: false, erro: mensagem }, { status, headers: cabecalhosPrivados })
}

const get = async (req) => {
  const url = new URL(req.url)
  const periodo = validarPeriodo(url.searchParams.get('de'), url.searchParams.get('ate'))
  if (!periodo.ok) return erro(periodo.erro)
  const db = getDB()
  if (!db) return erro('Banco indisponível no momento.', 503)
  const campanhas = await consultarCampanhas(db, periodo)
  return NextResponse.json(
    { ok: true, de: periodo.de, ate: periodo.ate, ...campanhas },
    { headers: cabecalhosPrivados }
  )
}

export const GET = soAdmin(get)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
