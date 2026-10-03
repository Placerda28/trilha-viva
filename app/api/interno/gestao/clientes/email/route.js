import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { corrigirEmailCliente, emailNovoValido, idClienteValido } from '@/lib/gestao/corrigir-email'
import { trocarEmailConta } from '@/lib/senhas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Corrigir e-mail digitado errado na compra. Só admin; a origem é conferida
// depois da sessão, como nas outras rotas de escrita.
const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* cai na validação */
  }
  const clienteId = idClienteValido(corpo?.id)
  const novoEmail = emailNovoValido(corpo?.email)
  if (!clienteId || !novoEmail) {
    return NextResponse.json({ ok: false, erro: 'Informe um e-mail válido.' }, { status: 400, headers: cabecalhosPrivados })
  }

  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }

  const resultado = await corrigirEmailCliente(
    db,
    { clienteId, novoEmail, protegidos: [process.env.ADMIN_MASTER] },
    { trocarEmailConta }
  )
  if (!resultado.ok) {
    return NextResponse.json(
      { ok: false, erro: resultado.erro },
      { status: resultado.status || 400, headers: cabecalhosPrivados }
    )
  }

  const quem = String(admin.cliente.email || '').trim().toLowerCase()
  await gravarRegistro(db, {
    quem,
    acao: 'cliente_email_corrigido',
    alvo: resultado.novo,
    detalhe: { de: resultado.antigo, para: resultado.novo },
  })
  return NextResponse.json({ ok: true, email: resultado.novo }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
