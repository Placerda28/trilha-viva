import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import {
  consultarRecuperacao,
  filtroRecuperacaoValido,
} from '@/lib/gestao/recuperacao'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  const url = new URL(req.url)
  const filtro = url.searchParams.get('filtro') || 'todos'
  if (!filtroRecuperacaoValido(filtro)) {
    return NextResponse.json(
      { ok: false, erro: 'Filtro de recuperação inválido.' },
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

  const resultado = await consultarRecuperacao(db, {
    filtro,
    busca: url.searchParams.get('busca'),
    pagina: url.searchParams.get('pagina'),
    whatsappAtivo: process.env.WHATSAPP_ATIVO === 'sim',
  })
  return NextResponse.json({ ok: true, ...resultado }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
