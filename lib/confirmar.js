import { getStripe } from '@/lib/stripe'
import { buscarPagamento, idPagamentoValido, referenciaValida, resumirPagamento, mpConfigurado } from '@/lib/mercadopago'
import { normalizarEmail } from '@/lib/sessao'

function sessaoStripeValida(id) {
  return (id.startsWith('cs_live_') || id.startsWith('cs_test_')) && id.length > 28 && id.length < 200
}

// Confere, direto na operadora, se o pagamento que chegou em /sucesso saiu de
// verdade. Serve às duas rotas que dependem disso (/api/acesso e
// /api/conta/criar), para as duas nunca discordarem.
//
// Aceita os dois formatos de retorno:
//   Stripe        { session_id }
//   Mercado Pago  { payment_id, ref }  — ref é a external_reference
//
// Devolve { status, email, nome, compraId, pagamentoId, valorCentavos, moeda }
// com status 'paid' | 'pending' | 'failed' | 'invalid' | 'unconfigured' | 'error'.
export async function confirmarPagamento(corpo) {
  const sessionId = String(corpo?.session_id || '')
  const paymentId = String(corpo?.payment_id || '')
  const ref = String(corpo?.ref || '')

  if (paymentId || ref) {
    if (!idPagamentoValido(paymentId) || !referenciaValida(ref)) return { status: 'invalid' }
    if (!mpConfigurado()) return { status: 'unconfigured' }
    let p
    try {
      p = await buscarPagamento(paymentId)
    } catch (err) {
      console.error('confirmar mp', paymentId, err?.message)
      return { status: 'error' }
    }
    const r = resumirPagamento(p)
    // O número do pagamento é sequencial. É a referência aleatória, que só
    // quem passou pelo checkout conhece, que prova que o pagamento é desta
    // pessoa.
    if (r.referencia !== ref) return { status: 'invalid' }
    return { ...r, email: normalizarEmail(r.email) }
  }

  if (!sessaoStripeValida(sessionId)) return { status: 'invalid' }
  const stripe = getStripe()
  if (!stripe) return { status: 'unconfigured' }
  let s
  try {
    s = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (err) {
    console.error('confirmar stripe', err?.message)
    return { status: 'error' }
  }
  return {
    status: s.payment_status === 'paid' ? 'paid' : 'pending',
    email: normalizarEmail(s.customer_details?.email),
    nome: s.metadata?.nome || s.customer_details?.name || '',
    compraId: s.id,
    pagamentoId: s.payment_intent || null,
    valorCentavos: s.amount_total,
    moeda: s.currency,
  }
}
