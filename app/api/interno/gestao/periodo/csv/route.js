import { getDB } from '@/lib/d1'
import { CABECALHO_CLIENTES, gerarCsv, linhaClienteCsv } from '@/lib/gestao/csv'
import { validarPeriodo } from '@/lib/gestao/datas'
import { consultarPeriodoCsv } from '@/lib/gestao/periodo'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  const url = new URL(req.url)
  const periodo = validarPeriodo(url.searchParams.get('de'), url.searchParams.get('ate'))
  if (!periodo.ok) {
    return Response.json(
      { ok: false, erro: periodo.erro },
      { status: 400, headers: cabecalhosPrivados }
    )
  }
  const db = getDB()
  if (!db) {
    return Response.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }
  const linhas = await consultarPeriodoCsv(db, periodo)
  const nome = `vendas-${periodo.de}-a-${periodo.ate}.csv`
  return new Response(gerarCsv(CABECALHO_CLIENTES, linhas.map(linhaClienteCsv)), {
    headers: {
      ...cabecalhosPrivados,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nome}"`,
    },
  })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
