import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { POR_DIA } from '@/lib/cota'
import { consultarClienteDetalhe, idClienteValido } from '@/lib/gestao/cliente-detalhe'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function erro(mensagem, status) {
  return NextResponse.json({ ok: false, erro: mensagem }, { status, headers: cabecalhosPrivados })
}

const get = async (req) => {
  const id = idClienteValido(new URL(req.url).searchParams.get('id'))
  if (!id) return erro('Informe o id do cliente.', 400)
  const db = getDB()
  if (!db) return erro('Banco indisponível no momento.', 503)
  const detalhe = await consultarClienteDetalhe(db, id, { limiteDia: POR_DIA })
  if (!detalhe) return erro('Cliente não encontrado.', 404)
  return NextResponse.json({ ok: true, ...detalhe }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
