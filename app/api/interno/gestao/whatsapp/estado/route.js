import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { acaoDeEstadoValida, mudarEstadoWhatsapp } from '@/lib/gestao/whatsapp'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O "desligar de emergência" do WhatsApp, sem deploy: pausar, retomar ou
// ligar depois do teste. Só admin; a origem é conferida depois da sessão.
const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* cai na validação */
  }
  const acao = acaoDeEstadoValida(corpo?.acao)
  if (!acao) {
    return NextResponse.json({ ok: false, erro: 'Ação inválida.' }, { status: 400, headers: cabecalhosPrivados })
  }

  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }

  const quem = String(admin.cliente.email || '').trim().toLowerCase()
  const resultado = await mudarEstadoWhatsapp(db, acao, quem)
  if (!resultado.ok) {
    return NextResponse.json(
      { ok: false, erro: resultado.erro },
      { status: resultado.status || 400, headers: cabecalhosPrivados }
    )
  }

  await gravarRegistro(db, { quem, acao: `whatsapp_${acao}` })
  return NextResponse.json({ ok: true, estado: resultado.estado }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
