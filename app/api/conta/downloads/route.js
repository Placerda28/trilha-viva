import { NextResponse } from 'next/server'
import { clienteAtual } from '@/lib/sessao'
import { getDB } from '@/lib/d1'
import { downloadsDoCliente } from '@/lib/conta-downloads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store' }

export async function GET() {
  const cliente = await clienteAtual()
  if (!cliente) return NextResponse.json({ ok: false }, { status: 401, headers })
  try {
    const db = getDB()
    if (!db) throw new Error('Banco indisponível')
    const itens = await downloadsDoCliente(db, cliente.id)
    return NextResponse.json({ ok: true, itens }, { headers })
  } catch {
    return NextResponse.json({ ok: false, erro: 'Não consegui carregar seus downloads.' }, { status: 503, headers })
  }
}
