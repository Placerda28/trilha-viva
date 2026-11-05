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

// Membro da equipe (papel conhecido) recebe 403 em JSON; quem nao e admin continua com o 404 do soAdmin.
export const MSG_SO_MASTER = 'Só o Administrador Master pode fazer esta ação.'
export const recusaMembro = (admin) => (admin.papel === 'master' ? null : resposta({ ok: false, erro: MSG_SO_MASTER }, 403))
export const comIdMaster = (handler) => (req, ctx) => soAdmin((r, admin) => recusaMembro(admin) || handler(r, admin, ctx))(req)

export const emailDe = (admin) => String(admin.cliente.email || '').trim().toLowerCase()

export const extDe = (caminho) => String(caminho).split('.').pop()

export { irPara } from '@/lib/afiliados/rota'
