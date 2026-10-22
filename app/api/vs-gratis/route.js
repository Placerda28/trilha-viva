import { getDB, getEnv } from '@/lib/d1'
import { responderCadastroLead } from '@/lib/leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(req) {
  return responderCadastroLead(req, {
    db: getDB(),
    segredo: process.env.TURNSTILE_SECRET_KEY || getEnv().TURNSTILE_SECRET_KEY || '',
    ambiente: process.env.NODE_ENV,
  })
}
