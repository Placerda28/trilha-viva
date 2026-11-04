import { getDB } from '@/lib/d1'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { emailDe, resposta } from '@/lib/gestao/saques-rota'
import { MES_VALIDO } from '@/lib/afiliados/relatorio'
import { csvDoFechamento } from '@/lib/afiliados/gestao-metas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req, admin) => {
  const mes = new URL(req.url).searchParams.get('mes') || ''
  if (!MES_VALIDO.test(mes)) return resposta({ ok: false, erro: 'Informe o mês no formato AAAA-MM.', campo: 'mes' }, 400)
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const csv = await csvDoFechamento(db, mes)
  await gravarRegistro(db, { quem: emailDe(admin), acao: 'afiliados_exportar', alvo: mes, detalhe: { relatorio: 'fechamento' } })
  return new Response(csv, {
    headers: {
      ...cabecalhosPrivados,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="afiliados-fechamento-${mes}.csv"`,
    },
  })
}

export const GET = soAdmin(get)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
