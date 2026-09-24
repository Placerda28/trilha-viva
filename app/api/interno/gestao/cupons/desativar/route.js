import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { desativarCupom } from '@/lib/gestao/cupons'
import {
  adminAtual,
  cabecalhosPrivados,
  naoEncontrado,
  soAdmin,
} from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const post = async (req) => {
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
  const admin = await adminAtual()
  if (!admin) return naoEncontrado()

  const cupom = await desativarCupom(
    db,
    id,
    String(admin.cliente.email || '').trim().toLowerCase()
  )
  if (!cupom) return naoEncontrado()
  return NextResponse.json({ ok: true, cupom }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
