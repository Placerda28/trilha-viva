import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { emailNovoValido } from '@/lib/gestao/corrigir-email'
import { pararLembretes } from '@/lib/gestao/testes'

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
  const email = emailNovoValido(corpo?.email)
  if (!email) return resposta({ ok: false, erro: 'Informe um e-mail válido.' }, 400)
  await pararLembretes(db, email)
  await gravarRegistro(db, { quem, acao: 'lembretes_parados', alvo: email })
  return resposta({ ok: true })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
