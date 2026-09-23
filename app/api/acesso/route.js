import { NextResponse } from 'next/server'
import { confirmarPagamento } from '@/lib/confirmar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Diz à página de sucesso se o pagamento saiu, e para qual e-mail.
//
// Antes esta rota devolvia o link de uma pasta do Drive. O acervo passou a ser
// entregue numa conta com senha, então ela só confirma o pagamento — quem cria
// a conta é /api/conta/criar, que faz a mesma conferência (lib/confirmar.js),
// seja o pagamento da Stripe ou do Mercado Pago.

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
  const ip = req.headers.get('cf-connecting-ip') || 'anon'
  if (limited(ip)) {
    return NextResponse.json({ status: 'error', error: 'Muitas tentativas.' }, { status: 429, headers: noStore })
  }

  let body = {}
  try {
    body = await req.json()
  } catch {
    /* cai na validação abaixo */
  }

  const r = await confirmarPagamento(body)

  if (r.status === 'invalid') {
    return NextResponse.json(
      { status: 'invalid', error: 'Link de confirmação inválido.' },
      { status: 400, headers: noStore }
    )
  }

  if (r.status === 'unconfigured') {
    return NextResponse.json(
      { status: 'unconfigured', error: 'A confirmação automática está fora do ar. Seu acesso será enviado por e-mail.' },
      { status: 503, headers: noStore }
    )
  }

  if (r.status === 'error') {
    return NextResponse.json(
      { status: 'error', error: 'Não localizamos esse pagamento. Fale com o suporte.' },
      { status: 404, headers: noStore }
    )
  }

  if (r.status === 'failed') {
    return NextResponse.json(
      { status: 'error', error: 'O pagamento não foi aprovado. Você pode tentar de novo pela página de compra.' },
      { headers: noStore }
    )
  }

  if (r.status !== 'paid') {
    return NextResponse.json(
      {
        status: 'pending',
        email: r.email || null,
        message: 'Estamos aguardando a confirmação do pagamento. No Pix, costuma levar poucos segundos depois que você paga.',
      },
      { headers: noStore }
    )
  }

  return NextResponse.json(
    {
      status: 'paid',
      email: r.email || null,
      nome: r.nome || null,
      // Diz à tela se o e-mail de apoio realmente sai, para ela não prometer
      // uma mensagem que nunca vai chegar.
      mailed: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    },
    { headers: noStore }
  )
}
