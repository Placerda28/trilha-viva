import Stripe from 'stripe'

let cached = null

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!cached) cached = new Stripe(key, { apiVersion: '2024-12-18.acacia' })
  return cached
}

export const PRODUCT_NAME = 'Trilha Viva — Pacote Completo com 4.000 Multitracks Gospel'
