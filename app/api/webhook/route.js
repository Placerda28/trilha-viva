import { NextResponse } from 'next/server'
import { getCryptoProvider, getStripe } from '@/lib/stripe'
import { acharOuCriar, registrarCompra, criarToken } from '@/lib/clientes'
import { enviarCriarSenha } from '@/lib/email'
import { normalizarEmail } from '@/lib/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O aviso da Stripe é o caminho de quem FECHA A ABA depois de pagar.
//
// Quem fica na tela cria a senha ali mesmo, por /api/conta/criar. Quem sai
// antes depende desta rota: é ela que grava a compra e manda o link para
// criar a senha. Sem isso, a pessoa pagou e não tem como entrar.
//
// As duas rotas gravam a mesma compra, e isso é de propósito: o banco recusa
// stripe_session_id repetido, então quem chegar primeiro grava e a segunda
// passa sem estragar nada.
async function liberarAcesso(session) {
  const email = normalizarEmail(session.customer_details?.email)
  if (!email) {
    console.error('webhook sem e-mail', session.id)
    return
  }
  const nome = session.metadata?.nome || session.customer_details?.name || ''

  const cliente = await acharOuCriar({ email, nome })
  if (!cliente) {
    console.error('webhook sem banco', session.id)
    return
  }

  await registrarCompra({
    clienteId: cliente.id,
    sessionId: session.id,
    paymentIntent: session.payment_intent,
    valor: session.amount_total,
    moeda: session.currency,
  })

  // Sete dias é folga de sobra para quem viajou ou só abre o e-mail no fim de
  // semana. Vencido, o "esqueci minha senha" resolve sem falar com ninguém.
  const token = await criarToken({ clienteId: cliente.id, tipo: 'criar_senha', horas: 24 * 7 })
  if (token) await enviarCriarSenha({ para: email, nome, token })
}

export async function POST(req) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json({ received: true, skipped: 'not_configured' })
  }

  const sig = req.headers.get('stripe-signature')
  const raw = await req.text()

  let event
  try {
    // constructEventAsync + SubtleCrypto: o constructEvent síncrono depende do
    // crypto do Node e não roda nos Cloudflare Workers.
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret, undefined, getCryptoProvider())
  } catch (err) {
    console.error('webhook signature error', err?.message)
    return NextResponse.json({ error: 'assinatura inválida' }, { status: 400 })
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object
    if (session.payment_status === 'paid') {
      try {
        await liberarAcesso(session)
      } catch (err) {
        // Nunca devolver erro à Stripe por uma falha nossa de gravação: ela
        // reenviaria o aviso várias vezes. O registro no log é o que permite
        // achar e consertar o caso na mão.
        console.error('liberar acesso', session.id, err?.message)
      }
    }
  }

  return NextResponse.json({ received: true })
}
