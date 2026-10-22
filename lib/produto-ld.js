import { site } from '@/lib/site'

// Product do pacote para a home e a /assinar (item 3 do plano de SEO).
// Sem aggregateRating/review de propósito: só quando houver avaliações reais
// de compradores. Avaliação inventada é contra as regras do Google.
export const productLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Trilha Viva — Pacote Completo com 2.000 Multitracks Gospel',
  description: site.description,
  sku: 'trilha-viva-pacote-completo',
  brand: { '@type': 'Brand', name: 'Trilha Viva' },
  category: 'Multitracks Gospel',
  image: [`${site.url}/opengraph-image`],
  offers: {
    '@type': 'Offer',
    url: `${site.url}/assinar`,
    price: site.price.toFixed(2),
    priceCurrency: 'BRL',
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    // Precisa ser data futura: revisar antes de vencer.
    priceValidUntil: '2027-12-31',
    seller: { '@type': 'Organization', name: 'Trilha Viva' },
    // A garantia de 7 dias, no formato que o Google lê.
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'BR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 7,
      returnFees: 'https://schema.org/FreeReturn',
    },
  },
}
