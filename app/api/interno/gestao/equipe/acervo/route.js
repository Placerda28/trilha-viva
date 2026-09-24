import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { alterarAcervoMembro, normalizarEmailEquipe } from '@/lib/gestao/equipe'
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
    /* valores inválidos recebem 404 sem revelar a rota */
  }
  const id = Number(corpo.id)
  if (!Number.isSafeInteger(id) || id < 1 || typeof corpo.libera !== 'boolean') {
    return naoEncontrado()
  }

  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }
  const membro = await alterarAcervoMembro(db, id, corpo.libera)
  if (!membro) return naoEncontrado()

  const quem = normalizarEmailEquipe(admin.cliente.email)
  await gravarRegistro(db, {
    quem,
    acao: corpo.libera ? 'acervo_liberado' : 'acervo_retirado',
    alvo: membro.email,
  })
  return NextResponse.json({ ok: true, membro }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soMaster(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
