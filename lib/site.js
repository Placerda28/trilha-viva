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
}

export const priceBRL = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

export const discountPct = Math.round((1 - site.price / site.fullPrice) * 100)

export const nav = [
  { href: '/musicas', label: 'Músicas' },
  { href: '/artistas', label: 'Artistas' },
  { href: '/como-usar', label: 'Como usar' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'Dúvidas' },
]

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
