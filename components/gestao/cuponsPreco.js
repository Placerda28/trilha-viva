import { site } from '@/lib/site'

// Preço do pacote em centavos. A conta abaixo só serve para a prévia na tela:
// quem decide o preço cobrado é o servidor, na hora de abrir o pagamento.
export const PRECO = Math.round(site.price * 100)
export const MINIMO = 100

export function precoFinal(tipo, valor) {
  const v = Number(valor) || 0
  const bruto = tipo === 'percentual' ? Math.round((PRECO * (100 - v)) / 100) : PRECO - v
  return Math.max(MINIMO, bruto)
}
