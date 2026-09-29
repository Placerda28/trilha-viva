import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { consultarCarrinhosGestao, periodoCarrinhos } from '@/lib/gestao/carrinhos'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  // Esta validação só acontece depois de soAdmin confirmar a sessão no D1.
  const url = new URL(req.url)
  const periodo = url.searchParams.get('periodo') || '7d'
  if (!periodoCarrinhos(periodo)) {
    return NextResponse.json(
      { ok: false, erro: 'O período deve ser hoje, 7d ou 30d.' },
      { status: 400, headers: cabecalhosPrivados }
    )
  }

  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }

  const resultado = await consultarCarrinhosGestao(db, {
    periodo,
    pagina: url.searchParams.get('pagina'),
  })
  return NextResponse.json({ ok: true, ...resultado }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
