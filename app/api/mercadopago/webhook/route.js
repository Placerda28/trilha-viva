import { NextResponse } from 'next/server'
import { assinaturaValida, buscarPagamento, idPagamentoValido, mpConfigurado, resumirPagamento } from '@/lib/mercadopago'
import { acharOuCriar, registrarCompra, criarToken } from '@/lib/clientes'
import { enviarCriarSenha } from '@/lib/email'
import { normalizarEmail } from '@/lib/sessao'
import { enviarEventoMeta } from '@/lib/meta'
import { site } from '@/lib/site'
import { getDB } from '@/lib/d1'
import { estenderReservaCupom } from '@/lib/gestao/cupons'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O aviso do Mercado Pago faz o mesmo papel do aviso da Stripe
// (app/api/webhook): é o caminho de quem FECHA A ABA depois de pagar. Grava a
// compra e manda por e-mail o link para criar a senha.
//
// Uma diferença importa: o Mercado Pago avisa o mesmo pagamento várias vezes
// (quando ele nasce, quando o Pix cai, a cada atualização). O e-mail só sai na
// primeira vez que a compra entra no banco, para ninguém receber três iguais.
async function liberarAcesso(r) {
  const email = normalizarEmail(r.email)
  if (!email) {
    console.error('mp webhook sem e-mail', r.pagamentoId)
    return
  }
  const cliente = await acharOuCriar({ email, nome: r.nome })
  if (!cliente) {
    console.error('mp webhook sem banco', r.pagamentoId)
    return
  }
  const nova = await registrarCompra({
    clienteId: cliente.id,
    sessionId: r.compraId,
    paymentIntent: r.pagamentoId,
    valor: r.valorCentavos,
    moeda: r.moeda,
    forma: r.forma,
    cupom: r.cupom,
    referencia: r.referencia,
  })
  if (!nova) return

  const token = await criarToken({ clienteId: cliente.id, tipo: 'criar_senha', horas: 24 * 7 })
  if (token) await enviarCriarSenha({ para: email, nome: r.nome, token })
}

export async function POST(req) {
  const segredo = process.env.MP_WEBHOOK_SECRET
  if (!mpConfigurado() || !segredo) {
    return NextResponse.json({ received: true, skipped: 'not_configured' })
  }

  const url = new URL(req.url)
  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* sem corpo: o id vem do endereço */
  }

  const dataId = url.searchParams.get('data.id') || String(corpo?.data?.id || '')
  const tipo = url.searchParams.get('type') || corpo?.type || ''

  const ok = await assinaturaValida({
    assinatura: req.headers.get('x-signature'),
    requestId: req.headers.get('x-request-id'),
    dataId,
    segredo,
  })
  if (!ok) {
    return NextResponse.json({ error: 'assinatura inválida' }, { status: 400 })
  }

  if (tipo !== 'payment' || !idPagamentoValido(dataId)) {
    return NextResponse.json({ received: true, ignored: tipo || 'sem tipo' })
  }

  try {
    // O aviso só diz "o pagamento X mudou". O estado verdadeiro é consultado
    // direto no Mercado Pago, com a nossa chave.
    const r = resumirPagamento(await buscarPagamento(dataId))
    if (r.status === 'paid') {
      // Compra para a Meta pelo servidor. O id é a referência do pagamento, a
      // mesma que volta em /sucesso e que a tela usa no Pixel. O Mercado Pago
      // avisa o mesmo pagamento várias vezes; a Meta descarta as repetições.
      await enviarEventoMeta({
        nome: 'Purchase',
        id: r.referencia || r.compraId,
        email: r.email,
        ...r.rastreio,
        url: `${site.url}/sucesso`,
        valor: r.valorCentavos / 100,
        moeda: String(r.moeda || 'brl').toUpperCase(),
      })
      await liberarAcesso(r)
    } else if (r.status === 'pending' && r.cupom && r.referencia) {
      // Cartão em análise: segura a vaga do cupom até a resposta final.
      await estenderReservaCupom(getDB(), r.referencia)
    }
  } catch (err) {
    // Nunca devolver erro por uma falha nossa: o Mercado Pago reenviaria o
    // aviso sem parar. O log é o que permite achar o caso e resolver na mão.
    // O "Simular notificação" do painel cai aqui (pagamento que não existe).
    console.error('mp liberar acesso', dataId, err?.message)
  }

  return NextResponse.json({ received: true })
}
