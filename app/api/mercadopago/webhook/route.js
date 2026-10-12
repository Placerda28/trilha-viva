import { NextResponse } from 'next/server'
import { assinaturaValida, buscarPagamento, idPagamentoValido, mpConfigurado, resumirPagamento } from '@/lib/mercadopago'
import { acharOuCriar, registrarCompra, criarToken } from '@/lib/clientes'
import { enviarCriarSenha } from '@/lib/email'
import { normalizarEmail } from '@/lib/sessao'
import { enviarEventoMeta } from '@/lib/meta'
import { site } from '@/lib/site'
import { getDB } from '@/lib/d1'
import { cancelarReservaCupom, estenderReservaCupom } from '@/lib/gestao/cupons'
import { marcarCarrinhosPagos } from '@/lib/carrinhos'
import { gravarRastreioCompra } from '@/lib/rastreio-compra'
import { ehTeste, enviarMetaSeReal } from '@/lib/teste'
import { enviarAcessoLiberado } from '@/lib/whatsapp-acesso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O aviso do Mercado Pago faz o mesmo papel do aviso da Stripe
// (app/api/webhook): é o caminho de quem FECHA A ABA depois de pagar. Grava a
// compra e manda por e-mail o link para criar a senha.
//
// Uma diferença importa: o Mercado Pago avisa o mesmo pagamento várias vezes
// (quando ele nasce, quando o Pix cai, a cada atualização). O e-mail só sai na
// primeira vez que a compra entra no banco, para ninguém receber três iguais.
async function liberarAcesso(r, teste) {
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
    teste,
  })
  if (!nova) return

  const token = await criarToken({ clienteId: cliente.id, tipo: 'criar_senha', horas: 24 * 7 })
  if (!token) return
  await enviarCriarSenha({ para: email, nome: r.nome, token })
  // O mesmo link também pelo WhatsApp, para quem fechou a tela do Mercado
  // Pago sem voltar ao site. Só sai depois que a Meta aprovar o modelo e o
  // WA_ACESSO estiver "ativo"; nunca derruba o aviso (ver lib/whatsapp-acesso.js).
  const whatsapp = await enviarAcessoLiberado(process.env, getDB(), { telefone: r.telefone, nome: r.nome, token })
  if (whatsapp !== 'desligado') console.log('whatsapp acesso liberado', whatsapp, r.pagamentoId)
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
      const teste = await ehTeste(getDB(), r)
      const meta = await enviarMetaSeReal(teste, {
        nome: 'Purchase',
        id: r.referencia || r.compraId,
        email: r.email,
        telefone: r.telefone,
        nomeCliente: r.nome,
        ...r.rastreio,
        url: `${site.url}/sucesso`,
        valor: r.valorCentavos / 100,
        moeda: String(r.moeda || 'brl').toUpperCase(),
        referencia: r.referencia || r.compraId,
      }, enviarEventoMeta)
      await liberarAcesso(r, teste)
      try {
        // Origem da venda e resultado do envio à Meta, na própria compra.
        await gravarRastreioCompra(getDB(), { compraId: r.compraId, origem: r.utm, metaStatus: meta.status })
      } catch (err) {
        // Acompanhamento: nunca pode atrapalhar a compra já liberada.
        console.error('mp gravar rastreio', r.pagamentoId, err?.message)
      }
      try {
        await marcarCarrinhosPagos(getDB(), { referencia: r.referencia, email: r.email })
      } catch (err) {
        // O carrinho é acompanhamento: a compra já foi liberada e não pode ser
        // prejudicada por uma falha nesta atualização.
        console.error('mp marcar carrinhos pagos', r.pagamentoId, err?.message)
      }
    } else if (r.status === 'pending' && r.cupom && r.referencia) {
      // Pix gerado ou cartão em análise: segura a vaga do cupom até a
      // resposta final.
      await estenderReservaCupom(getDB(), r.referencia)
    } else if (r.status === 'failed' && r.cupom && r.referencia) {
      // Pagamento recusado ou cancelado: devolve a vaga na hora, para outra
      // pessoa poder usar o cupom sem esperar a reserva vencer.
      await cancelarReservaCupom(getDB(), r.referencia)
    }
  } catch (err) {
    // Nunca devolver erro por uma falha nossa: o Mercado Pago reenviaria o
    // aviso sem parar. O log é o que permite achar o caso e resolver na mão.
    // O "Simular notificação" do painel cai aqui (pagamento que não existe).
    console.error('mp liberar acesso', dataId, err?.message)
  }

  return NextResponse.json({ received: true })
}
