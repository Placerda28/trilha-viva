import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { consultarClientes, clienteDaLinha } from '@/lib/gestao/clientes'
import { preencherFormas } from '@/lib/gestao/forma'
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

  const url = new URL(req.url)
  const resultado = await consultarClientes(db, {
    q: url.searchParams.get('q'),
    pagina: url.searchParams.get('pagina'),
  })
  await preencherFormas(resultado.linhas)

  return NextResponse.json(
    {
      ok: true,
      pagina: resultado.pagina,
      por_pagina: resultado.por_pagina,
      total: resultado.total,
      itens: resultado.linhas.map(clienteDaLinha),
    },
    { headers: cabecalhosPrivados }
  )
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
