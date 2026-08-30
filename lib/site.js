export const site = {
  name: 'Trilha Viva',
  fullName: 'Trilha Viva — Multitracks Gospel',
  shortDesc: 'Multitracks Gospel (VS) com clique, guia e canais separados.',
  description:
    'Trilha Viva é o acervo com mais de 4.000 multitracks gospel (VS) para igrejas e bandas de louvor. Clique, guia e canais separados, em todos os tons, em um único pacote com acesso vitalício.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://trilha-viva.vercel.app',
  locale: 'pt_BR',
  email: 'contato@trilhaviva.com',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || '',
  totalTracks: 4000,
  price: 89.9,
  fullPrice: 899.0,
  currency: 'BRL',
}

export const priceBRL = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

export const discountPct = Math.round((1 - site.price / site.fullPrice) * 100)

export const nav = [
  { href: '/musicas', label: 'Acervo' },
  { href: '/artistas', label: 'Artistas' },
  { href: '/como-usar', label: 'Como usar' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'Dúvidas' },
]

export const includes = [
  {
    title: 'Mais de 4.000 multitracks',
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
    title: 'Todos os tons',
    body: 'Suba ou desça o tom direto no seu programa sem perder qualidade. O material vem preparado para transposição.',
  },
  {
    title: 'Compatível com tudo',
    body: 'Arquivos em WAV/MP3 que abrem no Reaper, Ableton Live, Cakewalk, Prime, Cantabile, Playback e no seu tablet.',
  },
  {
    title: 'Acesso vitalício',
    body: 'Pagamento único. Sem mensalidade, sem renovação, sem limite de download. O acervo fica com você.',
  },
]
