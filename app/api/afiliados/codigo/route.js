import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { clienteAtual } from '@/lib/sessao'
import { consultarCodigo } from '@/lib/afiliados/conta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }
const erro = (msg, status) => NextResponse.json({ ok: false, erro: msg }, { status, headers: semCache })

export async function GET(req) {
  const cliente = await clienteAtual()
  if (!cliente) return erro('Entre na sua conta.', 401)
  const db = getDB()
  if (!db) return erro('Indisponível no momento.', 503)
  const c = new URL(req.url).searchParams.get('c') || ''
  try {
    const r = await consultarCodigo(db, c.slice(0, 40))
    return NextResponse.json({ ok: true, ...r }, { headers: semCache })
  } catch (falha) {
    console.error('afiliado codigo', falha?.message)
    return erro('Indisponível no momento.', 503)
  }
}
