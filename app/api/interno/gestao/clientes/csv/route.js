import { getDB } from '@/lib/d1'
import { consultarClientesCsv } from '@/lib/gestao/clientes'
import {
  CABECALHO_CLIENTES,
  gerarCsv,
  hojeBrasilia,
  linhaClienteCsv,
} from '@/lib/gestao/csv'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  const db = getDB()
  if (!db) {
    return Response.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }
  const url = new URL(req.url)
  const linhas = await consultarClientesCsv(db, url.searchParams.get('q'))
  return new Response(gerarCsv(CABECALHO_CLIENTES, linhas.map(linhaClienteCsv)), {
    headers: {
      ...cabecalhosPrivados,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clientes-${hojeBrasilia()}.csv"`,
    },
  })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
