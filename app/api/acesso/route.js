import { NextResponse } from 'next/server'
import { confirmarPagamento } from '@/lib/confirmar'
import { chaveDaCompraNoPrazo } from '@/lib/mercadopago'
import { acharPorEmail } from '@/lib/clientes'
import { getDB } from '@/lib/d1'
import { ehTeste } from '@/lib/teste'
import { mascararEmail } from '@/lib/pos-pagamento'
import { acessoPorWhatsappLigado } from '@/lib/whatsapp-acesso'

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
  // A /sucesso consulta a cada 3 s (20 por minuto) e ainda sobra para o
  // botão "Já paguei, conferir de novo".
  return arr.length > 30
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

  // Daqui em diante o pagamento é desta pessoa (número + referência
  // conferidos). Mesmo assim, enquanto não estiver pago, a tela só recebe o
  // e-mail mascarado: é o que ela mostra.
  const avisos = {
    emailMascarado: mascararEmail(r.email),
    whatsapp: acessoPorWhatsappLigado(process.env) && Boolean(r.telefone),
  }

  if (r.status === 'failed') {
    return NextResponse.json(
      { status: 'failed', ...avisos, error: 'O pagamento não foi aprovado. Você pode tentar de novo pela página de compra.' },
      { headers: noStore }
    )
  }

  if (r.status !== 'paid') {
    return NextResponse.json(
      {
        status: 'pending',
        ...avisos,
        message: 'Estamos aguardando a confirmação do pagamento. No Pix, costuma levar poucos segundos depois que você paga.',
      },
      { headers: noStore }
    )
  }

  // Já tem senha? A tela manda para a entrada em vez de pedir outra.
  // Compra de teste? A tela não manda a compra ao Pixel da Meta.
  const db = getDB()
  const [cliente, teste] = await Promise.all([
    r.email ? acharPorEmail(r.email).catch(() => null) : null,
    db ? ehTeste(db, { email: r.email, telefone: r.telefone, referencia: r.referencia }) : false,
  ])

  // Chave da compra com mais de 24 h (achado M-3 de 19/10): a tela não recebe
  // mais o e-mail nem o nome completos. A criação da senha também recusa.
  const noPrazo = !body.payment_id || chaveDaCompraNoPrazo(r.aprovadoEm)

  return NextResponse.json(
    {
      status: 'paid',
      ...avisos,
      temConta: Boolean(cliente?.supabase_id),
      teste: Boolean(teste),
      email: noPrazo ? r.email || null : null,
      nome: noPrazo ? r.nome || null : null,
      // Diz à tela se o e-mail de apoio realmente sai, para ela não prometer
      // uma mensagem que nunca vai chegar.
      mailed: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    },
    { headers: noStore }
  )
}
