import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { validarPeriodo } from '@/lib/gestao/datas'
import { consultarPainel } from '@/lib/gestao/painel'
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
  const agrupar = url.searchParams.get('agrupar') || 'dia'
  if (!['dia', 'semana', 'mes'].includes(agrupar)) return erro('O agrupamento deve ser dia, semana ou mês.')

  const db = getDB()
  if (!db) return erro('Banco indisponível no momento.', 503)
  const painel = await consultarPainel(db, periodo, agrupar)
  return NextResponse.json({ ok: true, ...painel }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
