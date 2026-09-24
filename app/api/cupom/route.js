import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { consultarCupomValido, ERRO_CUPOM_PUBLICO } from '@/lib/gestao/cupons'
import { site } from '@/lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Confere um cupom e diz o preço com desconto, para o formulário mostrar antes
// de a pessoa ir pagar. Isto só informa: quem decide o preço cobrado é o
// /api/checkout, que confere o cupom de novo na hora de abrir o pagamento.
//
// Com freio por IP: sem ele, dava para chutar códigos à vontade.
const hits = new Map()
function limited(ip) {
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000)
  arr.push(now)
  hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 6
}

const semCache = { 'Cache-Control': 'no-store, max-age=0' }

export async function POST(req) {
  const ip = req.headers.get('cf-connecting-ip') || 'anon'
  if (limited(ip)) {
    return NextResponse.json({ ok: false, erro: 'Muitas tentativas. Aguarde um minuto.' }, { status: 429, headers: semCache })
  }

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* cai na validação abaixo */
  }

  const cupom = await consultarCupomValido(
    getDB(),
    String(corpo.cupom || ''),
    Math.round(site.price * 100)
  )
  if (!cupom) {
    return NextResponse.json(
      { ok: false, erro: ERRO_CUPOM_PUBLICO },
      { status: 400, headers: semCache }
    )
  }
  return NextResponse.json(
    { ok: true, cupom: cupom.codigo, preco: cupom.preco_centavos / 100, de: site.price },
    { headers: semCache }
  )
}
