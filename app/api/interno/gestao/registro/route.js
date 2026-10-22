import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { validarPeriodo } from '@/lib/gestao/datas'
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
  const params = new URL(req.url).searchParams
  const de = params.get('de')
  const ate = params.get('ate')
  const periodo = de || ate ? validarPeriodo(de, ate) : null
  if (periodo && !periodo.ok) {
    return NextResponse.json(
      { ok: false, erro: periodo.erro },
      { status: 400, headers: cabecalhosPrivados }
    )
  }
  const resultado = await consultarRegistro(db, params.get('pagina'), {
    quem: params.get('quem'),
    tipo: params.get('tipo'),
    inicioUtc: periodo?.inicioUtc,
    fimUtc: periodo?.fimUtc,
  })
  return NextResponse.json({ ok: true, ...resultado }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
