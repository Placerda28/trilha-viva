import { getDB } from '@/lib/d1'
import { lerEstadoWhatsapp } from '@/lib/gestao/whatsapp'
import {
  CABECALHO_RECUPERACAO,
  consultarRecuperacaoCsv,
  filtroRecuperacaoValido,
  linhaRecuperacaoCsv,
} from '@/lib/gestao/recuperacao'
import { gerarCsv, hojeBrasilia } from '@/lib/gestao/csv'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { registrarExportacao } from '@/lib/gestao/registro'
import { validarPeriodo } from '@/lib/gestao/datas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req, admin) => {
  const url = new URL(req.url)
  const filtro = url.searchParams.get('filtro') || 'todos'
  if (!filtroRecuperacaoValido(filtro)) {
    return Response.json(
      { ok: false, erro: 'Filtro de recuperação inválido.' },
      { status: 400, headers: cabecalhosPrivados }
    )
  }
  const de = url.searchParams.get('de')
  const ate = url.searchParams.get('ate')
  const periodo = de || ate ? validarPeriodo(de, ate) : null
  if (periodo && !periodo.ok) {
    return Response.json({ ok: false, erro: periodo.erro }, { status: 400, headers: cabecalhosPrivados })
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
    periodo,
    mostrarTestes: url.searchParams.get('testes') === '1',
    whatsappAtivo: (await lerEstadoWhatsapp(db)).estado === 'ativo',
  })
  if (linhas.length > 5000) return Response.json({ ok: false, erro: 'O período tem mais de 5000 linhas. Escolha um período ou filtro menor.' }, { status: 400, headers: cabecalhosPrivados })
  const recusa = await registrarExportacao(db, admin, 'recuperacao', { filtro, linhas: linhas.length })
  if (recusa) return recusa
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
