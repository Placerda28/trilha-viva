import { getDB } from '@/lib/d1'
import { consultarClientesCsv } from '@/lib/gestao/clientes'
import {
  CABECALHO_CLIENTES_COM_WHATSAPP,
  gerarCsv,
  hojeBrasilia,
  linhaClienteComWhatsappCsv,
} from '@/lib/gestao/csv'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { registrarExportacao } from '@/lib/gestao/registro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req, admin) => {
  const db = getDB()
  if (!db) {
    return Response.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }
  const url = new URL(req.url)
  const linhas = await consultarClientesCsv(db, url.searchParams.get('q'))
  if (linhas.length > 5000) return Response.json({ ok: false, erro: 'A planilha tem mais de 5000 linhas. Escolha um filtro menor.' }, { status: 400, headers: cabecalhosPrivados })
  const recusa = await registrarExportacao(db, admin, 'clientes', { busca: url.searchParams.get('q') || '', linhas: linhas.length })
  if (recusa) return recusa
  return new Response(gerarCsv(CABECALHO_CLIENTES_COM_WHATSAPP, linhas.map(linhaClienteComWhatsappCsv)), {
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
