// Peças comuns das rotas do painel do afiliado: resposta sem cache e login + afiliado da sessão.
import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { clienteAtual } from '@/lib/sessao'
import { afiliadoDoCliente } from './conta.js'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }
export const resposta = (corpo, status = 200) => NextResponse.json(corpo, { status, headers: semCache })
export const erro = (msg, status, extra = {}) => resposta({ ok: false, erro: msg, ...extra }, status)

// { cliente, afiliado, db } ou { falha: Response }. O id do afiliado vem sempre da sessão.
export async function afiliadoLogado() {
  const cliente = await clienteAtual()
  if (!cliente) return { falha: erro('Entre na sua conta.', 401) }
  if (cliente.bloqueado) return { falha: erro('Pedido recusado.', 403) }
  const db = getDB()
  if (!db) return { falha: erro('Indisponível no momento. Tente novamente mais tarde.', 503) }
  const afiliado = await afiliadoDoCliente(db, cliente.id)
  if (!afiliado) return { falha: erro('Você ainda não é afiliado.', 404) }
  return { cliente, afiliado, db }
}

export async function lerJson(req) {
  try {
    const c = await req.json()
    return c && typeof c === 'object' && !Array.isArray(c) ? c : null
  } catch {
    return null
  }
}
