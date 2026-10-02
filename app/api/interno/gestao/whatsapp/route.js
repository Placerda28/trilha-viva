import { NextResponse } from 'next/server'
import { getDB, getEnv } from '@/lib/d1'
import { consultarConversas, totaisWhatsapp } from '@/lib/gestao/whatsapp'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async () => {
  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }
  const env = getEnv()
  const [conversas, totais] = await Promise.all([consultarConversas(db), totaisWhatsapp(db)])
  return NextResponse.json(
    {
      ok: true,
      configurado: Boolean((env.WA_TOKEN || process.env.WA_TOKEN) && (env.WA_PHONE_NUMBER_ID || process.env.WA_PHONE_NUMBER_ID)),
      totais,
      conversas,
    },
    { headers: cabecalhosPrivados }
  )
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
