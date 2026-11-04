// Peças comuns das rotas de saque da Gestão (soAdmin com o parâmetro [id] da rota).
import { NextResponse } from 'next/server'
import { cabecalhosPrivados, soAdmin } from '@/lib/gestao/permissao'

export const resposta = (corpo, status = 200) => NextResponse.json(corpo, { status, headers: cabecalhosPrivados })

export async function idDe(ctx) {
  const n = Number((await ctx?.params)?.id)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

// soAdmin só repassa (req, admin); aqui o contexto da rota segue junto.
export const comId = (handler) => (req, ctx) => soAdmin((r, admin) => handler(r, admin, ctx))(req)

export const emailDe = (admin) => String(admin.cliente.email || '').trim().toLowerCase()

export const extDe = (caminho) => String(caminho).split('.').pop()

export { irPara } from '@/lib/afiliados/rota'
