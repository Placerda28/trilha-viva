import { getDB } from '@/lib/d1'
import { validarPeriodo } from '@/lib/gestao/datas'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { extrato, resumoMensal, validarFiltrosExtrato } from '@/lib/afiliados/gestao-financeiro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const erro = (corpo, status) => Response.json({ ok: false, ...corpo }, { status, headers: cabecalhosPrivados })

const get = async (req) => {
  const q = new URL(req.url).searchParams
  const periodo = validarPeriodo(q.get('de'), q.get('ate'))
  if (!periodo.ok) return erro({ erro: periodo.erro }, 400)
  const filtros = validarFiltrosExtrato({ tipo: q.get('tipo'), afiliado: q.get('afiliado') })
  if (!filtros.ok) return erro({ erro: filtros.erro, campo: filtros.campo }, 400)
  const db = getDB()
  if (!db) return erro({ erro: 'Banco indisponível no momento.' }, 503)
  const [lista, resumo] = await Promise.all([
    extrato(db, { tipo: filtros.tipo, afiliadoId: filtros.afiliadoId, periodo, pagina: q.get('pagina') }),
    resumoMensal(db, periodo),
  ])
  return Response.json({ ok: true, de: periodo.de, ate: periodo.ate, extrato: lista, resumo_mensal: resumo }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
