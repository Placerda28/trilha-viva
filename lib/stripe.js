import Stripe from 'stripe'

let cached = null
let cryptoProvider = null

// No runtime dos Cloudflare Workers não existe o módulo http do Node: o cliente
// da Stripe precisa falar por fetch. E a verificação de assinatura do webhook
// precisa da Web Crypto (SubtleCrypto), que é assíncrona — por isso o webhook
// usa constructEventAsync com o provider abaixo.
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!cached) {
    cached = new Stripe(key, {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })
  }
  return cached
}

export function getCryptoProvider() {
  if (!cryptoProvider) cryptoProvider = Stripe.createSubtleCryptoProvider()
  return cryptoProvider
}

export const PRODUCT_NAME = 'Trilha Viva — Pacote Completo com 4.000 Multitracks Gospel'
