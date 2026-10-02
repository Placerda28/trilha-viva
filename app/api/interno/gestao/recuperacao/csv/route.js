import { getDB } from '@/lib/d1'
import {
  CABECALHO_RECUPERACAO,
  consultarRecuperacaoCsv,
  filtroRecuperacaoValido,
  linhaRecuperacaoCsv,
} from '@/lib/gestao/recuperacao'
import { gerarCsv, hojeBrasilia } from '@/lib/gestao/csv'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  const url = new URL(req.url)
  const filtro = url.searchParams.get('filtro') || 'todos'
  if (!filtroRecuperacaoValido(filtro)) {
    return Response.json(
      { ok: false, erro: 'Filtro de recuperação inválido.' },
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

  const linhas = await consultarRecuperacaoCsv(db, {
    filtro,
    busca: url.searchParams.get('busca'),
    whatsappAtivo: process.env.WHATSAPP_ATIVO === 'sim',
  })
  return new Response(gerarCsv(CABECALHO_RECUPERACAO, linhas.map(linhaRecuperacaoCsv)), {
    headers: {
      ...cabecalhosPrivados,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="recuperacao-${hojeBrasilia()}.csv"`,
    },
  })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
