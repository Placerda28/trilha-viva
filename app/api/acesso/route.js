import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const hits = new Map()
function limited(ip) {
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000)
  arr.push(now)
  hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 20
}

const noStore = { 'Cache-Control': 'no-store, max-age=0' }

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  if (limited(ip)) {
    return NextResponse.json({ status: 'error', error: 'Muitas tentativas.' }, { status: 429, headers: noStore })
  }

  let body = {}
  try {
    body = await req.json()
  } catch {
    /* noop */
  }

  const sessionId = String(body.session_id || '')
  if (!/^cs_(test|live)_[A-Za-z0-9]{20,}$/.test(sessionId)) {
    return NextResponse.json(
      { status: 'invalid', error: 'Link de confirmação inválido.' },
      { status: 400, headers: noStore }
    )
  }

  const stripe = getStripe()
  const driveUrl = process.env.DRIVE_URL

  if (!stripe) {
    return NextResponse.json(
      {
        status: 'unconfigured',
        error:
          'A verificação automática ainda não está ativa. Seu acesso será enviado por e-mail em instantes.',
      },
      { status: 503, headers: noStore }
    )
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        {
          status: 'pending',
          email: session.customer_details?.email || null,
          message:
            'Estamos aguardando a confirmação do pagamento. No Pix isso costuma levar menos de um minuto.',
        },
        { headers: noStore }
      )
    }

    if (!driveUrl) {
      return NextResponse.json(
        {
          status: 'paid_no_link',
          email: session.customer_details?.email || null,
          error: 'Pagamento confirmado. O link do acervo será enviado ao seu e-mail.',
        },
        { headers: noStore }
      )
    }

    return NextResponse.json(
      {
        status: 'paid',
        url: driveUrl,
        email: session.customer_details?.email || null,
        nome: session.metadata?.nome || null,
      },
      { headers: noStore }
    )
  } catch (err) {
    console.error('acesso error', err?.message)
    return NextResponse.json(
      { status: 'error', error: 'Não localizamos esse pagamento. Fale com o suporte.' },
      { status: 404, headers: noStore }
    )
  }
}
