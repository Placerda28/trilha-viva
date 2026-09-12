import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { criarConta, senhasConfiguradas } from '@/lib/senhas'
import { acharOuCriar, registrarCompra, usarToken } from '@/lib/clientes'
import { criarSessao, normalizarEmail } from '@/lib/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }
const erro = (msg, status) => NextResponse.json({ ok: false, erro: msg }, { status, headers: semCache })

function sessaoValida(id) {
  return (id.startsWith('cs_live_') || id.startsWith('cs_test_')) && id.length > 28 && id.length < 200
}

// Cria a senha do comprador. Dois caminhos chegam aqui:
//
//   session_id  quem acabou de pagar e está na página de sucesso
//   token       quem fechou a aba e voltou pelo link do e-mail
//
// Em nenhum dos dois o visitante escolhe o e-mail: ele vem da compra. É isso
// que impede alguém de criar conta com o endereço de outra pessoa.
export async function POST(req) {
  if (!senhasConfiguradas()) {
    return erro('A criação de conta ainda não está ativa. Fale com o suporte.', 503)
  }

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* corpo vazio cai na validação abaixo */
  }

  const senha = String(corpo.senha || '')
  if (senha.length < 8) return erro('A senha precisa ter pelo menos 8 caracteres.', 400)
  if (senha.length > 200) return erro('Senha longa demais.', 400)

  let email = ''
  let nome = ''

  if (corpo.token) {
    const linha = await usarToken({ token: String(corpo.token), tipo: 'criar_senha' })
    if (!linha) return erro('Este link já foi usado ou venceu. Use "Esqueci minha senha" para receber outro.', 400)
    email = linha.email
    nome = linha.nome || ''
  } else {
    const sessionId = String(corpo.session_id || '')
    if (!sessaoValida(sessionId)) return erro('Link de confirmação inválido.', 400)

    const stripe = getStripe()
    if (!stripe) return erro('Pagamento indisponível no momento.', 503)

    let sessao
    try {
      sessao = await stripe.checkout.sessions.retrieve(sessionId)
    } catch {
      return erro('Não localizamos esse pagamento.', 404)
    }
    if (sessao.payment_status !== 'paid') return erro('O pagamento ainda não foi confirmado.', 409)

    email = normalizarEmail(sessao.customer_details?.email)
    nome = sessao.metadata?.nome || sessao.customer_details?.name || ''
    if (!email) return erro('O pagamento não trouxe e-mail. Fale com o suporte.', 422)

    const cliente = await acharOuCriar({ email, nome })
    if (!cliente) return erro('Banco indisponível no momento.', 503)
    await registrarCompra({
      clienteId: cliente.id,
      sessionId,
      paymentIntent: sessao.payment_intent,
      valor: sessao.amount_total,
      moeda: sessao.currency,
    })
  }

  const cliente = await acharOuCriar({ email, nome })
  if (!cliente) return erro('Banco indisponível no momento.', 503)

  const conta = await criarConta({ email, senha, nome })
  if (!conta.ok) {
    if (conta.jaExiste) {
      return NextResponse.json(
        { ok: false, jaExiste: true, erro: 'Você já tem uma conta com este e-mail. Entre com sua senha.' },
        { status: 409, headers: semCache }
      )
    }
    console.error('criar conta', conta.erro)
    return erro('Não consegui criar a conta agora. Tente de novo em instantes.', 502)
  }

  await criarSessao(cliente.id, req)
  return NextResponse.json({ ok: true, email }, { headers: semCache })
}
