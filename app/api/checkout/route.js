import { NextResponse } from 'next/server'
import { getStripe, PRODUCT_NAME } from '@/lib/stripe'
import { site } from '@/lib/site'
import { criarPreferencia, provedorAtivo } from '@/lib/mercadopago'
import { enviarEventoMeta, ipDoPedido, lerCookiesMeta } from '@/lib/meta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DESCRICAO =
  'Acesso vitalício ao acervo com mais de 2.000 multitracks gospel (VS) com clique, guia e canais separados.'

const hits = new Map()
function limited(ip) {
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000)
  arr.push(now)
  hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 8
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  if (limited(ip)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde um minuto.' }, { status: 429 })
  }

  let body = {}
  try {
    body = await req.json()
  } catch {
    /* noop */
  }

  const email = String(body.email || '').trim().toLowerCase()
  const nome = String(body.nome || '').trim().slice(0, 80)

  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
    return NextResponse.json({ error: 'Informe um e-mail válido para receber o acesso.' }, { status: 400 })
  }

  const origin =
    req.headers.get('origin') ||
    (process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL : site.url)

  // Dados que a Conversions API usa para reconhecer a pessoa. Vão também
  // gravados no pagamento, para o aviso da operadora mandar a compra com eles.
  const { fbp, fbc } = lerCookiesMeta(req)
  const rastreio = {
    fbp,
    fbc,
    ip: ipDoPedido(req),
    ua: (req.headers.get('user-agent') || '').slice(0, 400),
  }
  const eventoId = String(body.eventoId || '').slice(0, 64) || crypto.randomUUID()
  const inicioCheckout = () =>
    enviarEventoMeta({
      nome: 'InitiateCheckout',
      id: eventoId,
      email,
      ...rastreio,
      url: `${site.url}/assinar`,
      valor: site.price,
    })

  if (provedorAtivo() === 'mercadopago') {
    try {
      const url = await criarPreferencia({
        email,
        nome,
        referencia: crypto.randomUUID(),
        origem: origin,
        titulo: PRODUCT_NAME,
        descricao: DESCRICAO,
        valor: site.price,
        rastreio,
      })
      if (!url) throw new Error('preferência sem init_point')
      await inicioCheckout()
      return NextResponse.json({ url, mode: 'mercadopago' })
    } catch (err) {
      console.error('checkout mp error', err?.message)
      return NextResponse.json(
        { error: 'Não conseguimos abrir o pagamento agora. Tente novamente em instantes.' },
        { status: 500 }
      )
    }
  }

  const stripe = getStripe()

  if (!stripe) {
    const link = process.env.NEXT_PUBLIC_PAYMENT_LINK
    if (link) {
      const url = new URL(link)
      url.searchParams.set('prefilled_email', email)
      return NextResponse.json({ url: url.toString(), mode: 'link' })
    }
    return NextResponse.json(
      { error: 'O checkout ainda não foi configurado. Fale com o suporte.' },
      { status: 503 }
    )
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'pt-BR',
      customer_email: email,
      client_reference_id: nome || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: Math.round(site.price * 100),
            product_data: {
              name: PRODUCT_NAME,
              description: DESCRICAO,
            },
          },
        },
      ],
      metadata: { nome, produto: 'pacote-4000-vs', ...rastreio },
      payment_intent_data: {
        description: 'Trilha Viva — Pacote 2.000 Multitracks Gospel',
        metadata: { nome, email },
      },
      success_url: `${origin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/assinar?cancelado=1`,
      allow_promotion_codes: true,
    })

    await inicioCheckout()
    return NextResponse.json({ url: session.url, mode: 'checkout' })
  } catch (err) {
    console.error('checkout error', err?.message)
    return NextResponse.json(
      { error: 'Não conseguimos abrir o pagamento agora. Tente novamente em instantes.' },
      { status: 500 }
    )
  }
}
