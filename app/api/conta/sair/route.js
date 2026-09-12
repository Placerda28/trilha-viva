import { NextResponse } from 'next/server'
import { encerrarSessao } from '@/lib/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  await encerrarSessao()
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
