import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { idClienteValido } from '@/lib/gestao/corrigir-email'
import { marcarTeste } from '@/lib/gestao/testes'

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
  if (typeof corpo?.teste !== 'boolean') return resposta({ ok: false, erro: 'Informe teste como verdadeiro ou falso.' }, 400)
  const id = idClienteValido(corpo?.id)
  if (!id) return resposta({ ok: false, erro: 'Informe um cliente válido.' }, 400)
  const cliente = await db.prepare('SELECT email FROM clientes WHERE id = ? LIMIT 1').bind(id).first()
  if (!cliente) return resposta({ ok: false, erro: 'Cliente não encontrado.' }, 404)
  const email = cliente.email
  await marcarTeste(db, { email, teste: corpo.teste, quem })
  await gravarRegistro(db, { quem, acao: corpo.teste ? 'compra_teste_marcada' : 'compra_teste_desmarcada', alvo: email })
  return resposta({ ok: true })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
