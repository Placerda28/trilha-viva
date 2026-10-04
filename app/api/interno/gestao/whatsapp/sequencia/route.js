import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { mudarSequencia, validarAcaoSequencia } from '@/lib/gestao/whatsapp'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// "Parar sequência" de uma pessoa, ou "Retomar" a que pausou porque ela
// respondeu. Só admin; a origem é conferida depois da sessão.
const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* cai na validação */
  }
  const pedido = validarAcaoSequencia(corpo)
  if (!pedido.ok) {
    return NextResponse.json({ ok: false, erro: pedido.erro }, { status: 400, headers: cabecalhosPrivados })
  }

  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }

  const resultado = await mudarSequencia(db, pedido)
  if (!resultado.ok) {
    return NextResponse.json(
      { ok: false, erro: resultado.erro },
      { status: resultado.status || 400, headers: cabecalhosPrivados }
    )
  }

  const quem = String(admin.cliente.email || '').trim().toLowerCase()
  await gravarRegistro(db, { quem, acao: `whatsapp_sequencia_${pedido.acao}`, alvo: pedido.telefone })
  return NextResponse.json({ ok: true }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
