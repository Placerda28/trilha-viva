import { getDB, getEnv } from '@/lib/d1'
import { responderDescadastro } from '@/lib/descadastro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function segredo() {
  return process.env.LEMBRETE_SEGREDO || getEnv().LEMBRETE_SEGREDO || ''
}

export function GET(req) {
  return responderDescadastro(req, { db: getDB(), segredo: segredo() })
}

export function POST(req) {
  return responderDescadastro(req, { db: getDB(), segredo: segredo() })
}
