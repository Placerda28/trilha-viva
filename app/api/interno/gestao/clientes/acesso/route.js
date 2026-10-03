import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { idClienteValido, reenviarAcesso } from '@/lib/gestao/corrigir-email'
import { criarToken } from '@/lib/clientes'
import { enviarCriarSenha, enviarRecuperarSenha } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Reenvia o e-mail de acesso (criar senha, ou redefinir se já criou).
const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* cai na validação */
  }
  const clienteId = idClienteValido(corpo?.id)
  if (!clienteId) {
    return NextResponse.json({ ok: false, erro: 'Cliente inválido.' }, { status: 400, headers: cabecalhosPrivados })
  }

  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }

  const resultado = await reenviarAcesso(db, clienteId, { criarToken, enviarCriarSenha, enviarRecuperarSenha })
  if (!resultado.ok) {
    return NextResponse.json(
      { ok: false, erro: resultado.erro },
      { status: resultado.status || 400, headers: cabecalhosPrivados }
    )
  }

  const quem = String(admin.cliente.email || '').trim().toLowerCase()
  await gravarRegistro(db, { quem, acao: 'acesso_reenviado', alvo: resultado.para, detalhe: { tipo: resultado.tipo } })
  return NextResponse.json({ ok: true, para: resultado.para, tipo: resultado.tipo }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
