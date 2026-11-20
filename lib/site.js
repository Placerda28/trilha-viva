export const site = {
  name: 'Trilha Viva',
  fullName: 'Trilha Viva — Multitracks Gospel',
  shortDesc: 'Multitracks Gospel (VS) com clique, guia e canais separados.',
  description:
    'Trilha Viva é o acervo com mais de 2.000 multitracks gospel (VS) para igrejas e bandas de louvor. Clique, guia e canais separados, em um único pacote com acesso vitalício.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://trilhaviva.org',
  locale: 'pt_BR',
  email: 'contato@trilhaviva.org',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || '',
  totalTracks: 2000,
  price: 89.9,
  fullPrice: 899.0,
  currency: 'BRL',
  // ID do conjunto de dados (Pixel) "Trilha Viva - site" do portfólio empresarial
  // Trilha Viva (3682122661936453), criado em 24/09/2026. Não é segredo: vai no
  // HTML de toda página. O token da Conversions API, sim, é segredo e fica só
  // no painel da Cloudflare (META_CAPI_TOKEN).
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || '2105453250047530',
}

// Imagem de compartilhamento (app/opengraph-image.jsx) para as páginas que têm
// openGraph próprio: sem isto, o Next descarta a da home e o link sai sem imagem.
export const OG_IMAGEM = ['/opengraph-image']

export const priceBRL = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

export const discountPct = Math.round((1 - site.price / site.fullPrice) * 100)

// Texto único do botão de compra (redesenho: antes havia 7 textos). O preço vai
// escrito ao lado ou embaixo, nunca dentro do botão.
export const TEXTO_COMPRA = 'Liberar as 2.000 VS'
export const LINHA_PRECO = 'R$ 89,90 · pagamento único · garantia de 7 dias'
export const EMAIL_SUPORTE = 'trilhaviva.suporte@gmail.com'

// Menu principal (cabeçalho). `id` casa com a prop `ativo` do Header. O Palco
// leva a etiqueta "Em breve" até PALCO_LANCADO (lib/palco.js).
export const nav = [
  { id: 'musicas', href: '/musicas', label: 'Músicas' },
  { id: 'artistas', href: '/artistas', label: 'Artistas' },
  { id: 'como-usar', href: '/como-usar', label: 'Como usar' },
  { id: 'palco', href: '/palco', label: 'Palco', palco: true },
  { id: 'afiliados', href: '/afiliados', label: 'Seja afiliado' },
]

// Blog, Dúvidas e VS grátis saem do topo: ficam no menu do celular e no rodapé.
export const navSecundario = [
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'Dúvidas' },
  { href: '/vs-gratis', label: 'VS grátis' },
]

export const MINHA_CONTA = '/minha-conta'

export const includes = [
  {
    title: 'Mais de 2.000 multitracks',
    body: 'O acervo completo de VS gospel dos artistas e ministérios que sua igreja já canta — e novas trilhas somadas ao pacote.',
  },
  {
    title: 'Clique e guia separados',
    body: 'Track de clique (metrônomo) e guia falada em canais próprios, prontos para ir só para o retorno da banda.',
  },
  {
    title: 'Canais individuais',
    body: 'Bateria, baixo, teclado, guitarra, pads, sopros e vocais em arquivos separados. Você tira e coloca o que quiser.',
  },
  {
    title: 'Compatível com tudo',
    body: 'Arquivos em WAV/MP3 que abrem no Reaper, Ableton Live, Cakewalk, Prime, Cantabile, Playback e no seu tablet.',
  },
  {
    title: 'Acesso vitalício',
    body: 'Pagamento único. Sem mensalidade e sem renovação, com até 30 downloads por dia. O acervo fica com você.',
  },
]
