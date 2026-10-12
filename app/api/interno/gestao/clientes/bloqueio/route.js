import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { idClienteValido } from '@/lib/gestao/corrigir-email'
import { bloquearCliente } from '@/lib/gestao/testes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resposta = (corpo, status = 200) => NextResponse.json(corpo, { status, headers: cabecalhosPrivados })

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  let corpo = {}
  try { corpo = await req.json() } catch { /* cai na validação */ }
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const quem = String(admin.cliente.email || '').trim().toLowerCase()
  const clienteId = idClienteValido(corpo?.id)
  if (!clienteId || typeof corpo?.bloqueado !== 'boolean') return resposta({ ok: false, erro: 'Informe o cliente e o bloqueio como verdadeiro ou falso.' }, 400)
  const resultado = await bloquearCliente(db, { clienteId, bloqueado: corpo.bloqueado, protegidos: [process.env.ADMIN_MASTER] })
  if (!resultado.ok) return resposta({ ok: false, erro: resultado.erro }, resultado.status)
  await gravarRegistro(db, { quem, acao: corpo.bloqueado ? 'cliente_bloqueado' : 'cliente_liberado', alvo: resultado.email })
  return resposta({ ok: true })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
