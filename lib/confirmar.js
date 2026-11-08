import { buscarPagamento, idPagamentoValido, referenciaValida, resumirPagamento, mpConfigurado } from '@/lib/mercadopago'
import { normalizarEmail } from '@/lib/sessao'

// Confere, direto na operadora, se o pagamento que chegou em /sucesso saiu de
// verdade. Serve às duas rotas que dependem disso (/api/acesso e
// /api/conta/criar), para as duas nunca discordarem.
//
// Formato do retorno do Mercado Pago: { payment_id, ref } — ref é a
// external_reference. O retorno antigo da Stripe ({ session_id }) saiu do site
// em 07/11/2026 (auditoria, B6) e agora é recusado como inválido.
//
// Devolve { status, email, nome, compraId, pagamentoId, valorCentavos, moeda, forma }
// com status 'paid' | 'pending' | 'failed' | 'invalid' | 'unconfigured' | 'error'.
export async function confirmarPagamento(corpo) {
  const paymentId = String(corpo?.payment_id || '')
  const ref = String(corpo?.ref || '')

  if (!paymentId && !ref) return { status: 'invalid' }
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
  if (r.status === 'alheio' || r.referencia !== ref) return { status: 'invalid' }
  return { ...r, email: normalizarEmail(r.email) }
}
