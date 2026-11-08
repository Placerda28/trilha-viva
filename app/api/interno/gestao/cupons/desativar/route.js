import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { desativarCupom } from '@/lib/gestao/cupons'
import {
  cabecalhosPrivados,
  naoEncontrado,
  soMasterComAviso,
} from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* id inválido termina no mesmo 404 de um cupom inexistente */
  }
  const id = Number(corpo.id)
  if (!Number.isSafeInteger(id) || id < 1) return naoEncontrado()

  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }
  const cupom = await desativarCupom(
    db,
    id,
    String(admin.cliente.email || '').trim().toLowerCase()
  )
  if (!cupom) return naoEncontrado()
  await gravarRegistro(db, {
    quem: String(admin.cliente.email || '').trim().toLowerCase(),
    acao: 'cupom_desativado',
    alvo: cupom.codigo,
  })
  return NextResponse.json({ ok: true, cupom }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soMasterComAviso(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
