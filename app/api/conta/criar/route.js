import { NextResponse } from 'next/server'
import { confirmarPagamento } from '@/lib/confirmar'
import { criarConta, senhasConfiguradas } from '@/lib/senhas'
import { acharOuCriar, registrarCompra, usarToken, salvarSupabaseId } from '@/lib/clientes'
import { criarSessao, normalizarEmail } from '@/lib/sessao'
import { mesmaOrigem } from '@/lib/origem'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }
const erro = (msg, status) => NextResponse.json({ ok: false, erro: msg }, { status, headers: semCache })

// Cria a senha do comprador. Dois caminhos chegam aqui:
//
//   session_id  quem acabou de pagar na Stripe e está na página de sucesso
//   payment_id  o mesmo, pelo Mercado Pago (junto com ref, a referência
//               aleatória da compra — ver lib/confirmar.js)
//   token       quem fechou a aba e voltou pelo link do e-mail
//
// Em nenhum deles o visitante escolhe o e-mail: ele vem da compra. É isso
// que impede alguém de criar conta com o endereço de outra pessoa.
export async function POST(req) {
  if (!mesmaOrigem(req)) {
    return NextResponse.json({ ok: false, erro: 'Pedido recusado.' }, { status: 403, headers: semCache })
  }

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
    const r = await confirmarPagamento(corpo)
    if (r.status === 'invalid') return erro('Link de confirmação inválido.', 400)
    if (r.status === 'unconfigured') return erro('Pagamento indisponível no momento.', 503)
    if (r.status === 'error') return erro('Não localizamos esse pagamento.', 404)
    if (r.status !== 'paid') return erro('O pagamento ainda não foi confirmado.', 409)

    email = r.email
    nome = r.nome || ''
    if (!email) return erro('O pagamento não trouxe e-mail. Fale com o suporte.', 422)

    const cliente = await acharOuCriar({ email, nome })
    if (!cliente) return erro('Banco indisponível no momento.', 503)
    await registrarCompra({
      clienteId: cliente.id,
      sessionId: r.compraId,
      paymentIntent: r.pagamentoId,
      valor: r.valorCentavos,
      moeda: r.moeda,
      forma: r.forma,
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
    // O link de uso único já foi queimado antes desta linha, de propósito:
    // queimar só no fim deixaria o mesmo link valer duas vezes. Por isso a
    // mensagem manda para a recuperação, e não para "tente de novo".
    return erro(
      'Não consegui criar a conta agora. Use "Esqueci minha senha" na página de entrada para receber um novo link.',
      502
    )
  }

  await salvarSupabaseId({ clienteId: cliente.id, supabaseId: conta.id })
  await criarSessao(cliente.id, req)
  return NextResponse.json({ ok: true, email }, { headers: semCache })
}
