// Mercado Pago pelo fetch, sem biblioteca.
//
// O SDK oficial puxa módulos do Node que não existem nos Cloudflare Workers, e
// o que o site precisa são só três chamadas: abrir o pagamento, consultar um
// pagamento e conferir a assinatura do aviso. Com fetch não há nada a adaptar.

import { formaDoMP } from './gestao/forma.js'
import { normalizarCodigoCupom } from './gestao/cupons.js'

const API = 'https://api.mercadopago.com'

export function mpConfigurado() {
  return Boolean(process.env.MP_ACCESS_TOKEN)
}

// Quem cobra hoje. O Mercado Pago é o padrão quando a chave dele existe. A
// Stripe continua no código como reserva: para voltar a ela basta cadastrar
// PAGAMENTO=stripe no painel da Cloudflare, sem mexer em nada aqui.
export function provedorAtivo() {
  if (process.env.PAGAMENTO === 'stripe') return 'stripe'
  return mpConfigurado() ? 'mercadopago' : 'stripe'
}

async function chamar(caminho, { method = 'GET', corpo, idempotencia } = {}) {
  const headers = {
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
  if (idempotencia) headers['X-Idempotency-Key'] = idempotencia
  const res = await fetch(`${API}${caminho}`, {
    method,
    headers,
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  const texto = await res.text()
  let dados = null
  try {
    dados = texto ? JSON.parse(texto) : null
  } catch {
    /* resposta sem JSON cai no erro abaixo */
  }
  if (!res.ok) {
    const msg = dados?.message || texto.slice(0, 200)
    throw new Error(`mercadopago ${res.status} ${msg}`)
  }
  return dados
}

// Abre o pagamento (a "preferência" do Checkout Pro) e devolve o endereço da
// tela do Mercado Pago.
//
// A referência é um código aleatório nosso. Ela volta no endereço de retorno e
// fica gravada no pagamento, e é o que prova que quem chegou em /sucesso é
// quem pagou: o número do pagamento sozinho é sequencial e dá para chutar.
function dataMercadoPago(instante) {
  return new Date(instante - 3 * 3600000).toISOString().replace('Z', '-03:00')
}

export function montarCorpoPreferencia({
  email,
  nome,
  referencia,
  origem,
  titulo,
  descricao,
  valorCentavos,
  cupom,
  expiraEmMin,
  rastreio = {},
  agora = Date.now(),
}) {
  if (!Number.isSafeInteger(valorCentavos) || valorCentavos < 100) {
    throw new Error('preço inválido para a preferência')
  }
  // O Mercado Pago quer a data com fuso (ex.: 2026-09-24T15:30:00.000-03:00).
  const venceEm = expiraEmMin ? dataMercadoPago(agora + expiraEmMin * 60000) : null
  const validade = venceEm
    ? {
        expires: true,
        expiration_date_to: venceEm,
        // Este segundo campo limita especificamente o Pix criado a partir da
        // preferência; os dois apontam para os mesmos 30 minutos.
        date_of_expiration: venceEm,
      }
    : {}
  return {
    items: [
      {
        id: 'pacote-trilha-viva',
        title: titulo,
        description: descricao,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: valorCentavos / 100,
        category_id: 'entertainment',
      },
    ],
    payer: { email, name: nome || undefined },
    external_reference: referencia,
    // rastreio: cookies da Meta, IP e navegador de quem abriu o pagamento.
    // Voltam no pagamento, e o aviso usa para mandar a compra à Meta.
    // O cupom também vai aqui: o aviso aceita o cupom SÓ deste metadata, que
    // é escrito pelo nosso servidor e o comprador não consegue alterar.
    metadata: { email, nome, referencia, cupom: cupom || '', ...rastreio },
    // Pix e cartão (à vista ou parcelado). Boleto e lotérica ficam de fora:
    // demoram dias para compensar e o comprador fica sem acesso esperando.
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
      installments: 12,
    },
    back_urls: {
      success: `${origem}/sucesso`,
      pending: `${origem}/sucesso`,
      failure: `${origem}/assinar?cancelado=1`,
    },
    auto_return: 'approved',
    statement_descriptor: 'TRILHAVIVA',
    ...validade,
  }
}

export async function criarPreferencia(dados) {
  const pref = await chamar('/checkout/preferences', {
    method: 'POST',
    idempotencia: dados.referencia,
    corpo: montarCorpoPreferencia(dados),
  })
  return pref?.init_point || null
}

export async function buscarPagamento(id) {
  return chamar(`/v1/payments/${encodeURIComponent(id)}`)
}

// O número do pagamento é só dígitos. Qualquer outra coisa é recusada antes de
// virar chamada à API.
export function idPagamentoValido(id) {
  return /^[0-9]{6,20}$/.test(String(id || ''))
}

export function referenciaValida(ref) {
  return /^[a-f0-9-]{36}$/.test(String(ref || ''))
}

// Traduz o pagamento do Mercado Pago para o mesmo formato que o resto do site
// já usa com a Stripe.
export function resumirPagamento(p) {
  const aprovado = p?.status === 'approved'
  const aguardando = p?.status === 'pending' || p?.status === 'in_process' || p?.status === 'authorized'
  return {
    status: aprovado ? 'paid' : aguardando ? 'pending' : 'failed',
    email: p?.metadata?.email || p?.payer?.email || null,
    nome: p?.metadata?.nome || '',
    referencia: p?.external_reference || '',
    cupom: normalizarCodigoCupom(p?.metadata?.cupom) || null,
    // A tabela de compras nasceu com a Stripe e a coluna tem o nome dela. O
    // prefixo mp_ separa as duas origens sem precisar mexer no banco.
    compraId: p?.id ? `mp_${p.id}` : null,
    rastreio: {
      fbp: p?.metadata?.fbp || '',
      fbc: p?.metadata?.fbc || '',
      ip: p?.metadata?.ip || '',
      ua: p?.metadata?.ua || '',
    },
    pagamentoId: p?.id ? String(p.id) : null,
    valorCentavos: Math.round(Number(p?.transaction_amount || 0) * 100),
    moeda: String(p?.currency_id || 'BRL').toLowerCase(),
    forma: formaDoMP(p),
  }
}

// Confere a assinatura do aviso (cabeçalho x-signature), como o Mercado Pago
// documenta: HMAC-SHA256 da frase "id:<id>;request-id:<req>;ts:<ts>;" com a
// assinatura secreta do painel. Sem isso, qualquer um poderia mandar um aviso
// falso e liberar acesso.
export async function assinaturaValida({ assinatura, requestId, dataId, segredo }) {
  if (!assinatura || !segredo) return false
  const partes = Object.fromEntries(
    String(assinatura)
      .split(',')
      .map((p) => p.split('=').map((s) => s.trim()))
      .filter((p) => p.length === 2)
  )
  const ts = partes.ts
  const v1 = partes.v1
  if (!ts || !v1) return false

  const id = /^[a-z0-9]+$/i.test(dataId || '') ? String(dataId).toLowerCase() : dataId
  let frase = ''
  if (id) frase += `id:${id};`
  if (requestId) frase += `request-id:${requestId};`
  frase += `ts:${ts};`

  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const bruto = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(frase))
  const calculado = [...new Uint8Array(bruto)].map((b) => b.toString(16).padStart(2, '0')).join('')

  // Comparação em tempo constante.
  if (calculado.length !== v1.length) return false
  let diferenca = 0
  for (let i = 0; i < calculado.length; i++) diferenca |= calculado.charCodeAt(i) ^ v1.charCodeAt(i)
  return diferenca === 0
}
