import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { carrinhoParaPreencher } from '@/lib/carrinhos'
import { referenciaValida } from '@/lib/mercadopago'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const hits = new Map()
function limited(ip) {
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000)
  arr.push(now)
  hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 8
}

const semCache = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  if (limited(ip)) {
    return NextResponse.json({ ok: false }, { status: 429, headers: semCache })
  }

  const referencia = new URL(req.url).searchParams.get('r') || ''
  if (!referenciaValida(referencia)) {
    return NextResponse.json({ ok: false }, { status: 404, headers: semCache })
  }

  const carrinho = await carrinhoParaPreencher(getDB(), referencia)
  if (!carrinho) {
    return NextResponse.json({ ok: false }, { status: 404, headers: semCache })
  }

  return NextResponse.json(
    { ok: true, nome: carrinho.nome || '', email: carrinho.email },
    { headers: semCache }
  )
}

function metodoNaoPermitido() {
  return NextResponse.json(
    { ok: false },
    { status: 405, headers: { ...semCache, Allow: 'GET' } }
  )
}

export const POST = metodoNaoPermitido
export const PUT = metodoNaoPermitido
export const DELETE = metodoNaoPermitido
