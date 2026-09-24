import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { normalizarEmailEquipe, removerMembro } from '@/lib/gestao/equipe'
import { gravarRegistro } from '@/lib/gestao/registro'
import {
  cabecalhosPrivados,
  naoEncontrado,
  soMaster,
} from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* id inválido recebe o mesmo 404 de um membro inexistente */
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
  const quem = normalizarEmailEquipe(admin.cliente.email)
  const membro = await removerMembro(db, id, quem)
  if (!membro) return naoEncontrado()

  await gravarRegistro(db, {
    quem,
    acao: 'membro_removido',
    alvo: membro.email,
  })
  return NextResponse.json({ ok: true, membro }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soMaster(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
