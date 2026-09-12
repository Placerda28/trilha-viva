import { NextResponse } from 'next/server'
import { encerrarSessao } from '@/lib/sessao'
import { mesmaOrigem } from '@/lib/origem'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  if (!mesmaOrigem(req)) {
    return NextResponse.json({ ok: false, erro: 'Pedido recusado.' }, { status: 403 })
  }
  await encerrarSessao()
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
