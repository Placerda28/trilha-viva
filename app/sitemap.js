import { songs } from '@/lib/catalog'
import { artistList } from '@/lib/artists'
import { posts } from '@/lib/posts'
import { site } from '@/lib/site'
import lastmod from '@/data/lastmod.json'
import redirects from '@/data/redirects.json'
import colecoes from '@/data/colecoes.json'

// Pré-renderizado no build: os agrupamentos abaixo não rodam a cada visita.
export const dynamic = 'force-static'

// Datas do último commit de cada página. Atualizar quando o texto mudar.
const paginas = {
  '/': '2026-10-21',
  '/assinar': '2026-09-29',
  '/musicas': '2026-09-22',
  '/artistas': '2026-09-11',
  '/como-usar': '2026-10-21',
  '/blog': '2026-09-05',
  '/faq': '2026-09-05',
  '/termos': '2026-09-05',
  '/privacidade': '2026-10-12',
  '/colecoes': '2026-10-21',
  '/vs-gratis': '2026-10-21',
}

// Data em que o modelo da página de música mudou para todas (ficha técnica real,
// Fase C do plano de SEO). Atualizar quando o modelo mudar de novo.
const MODELO_DA_MUSICA = '2026-10-21'
const dataDaMusica = (slug) => (lastmod[slug] > MODELO_DA_MUSICA ? lastmod[slug] : MODELO_DA_MUSICA)

export default function sitemap() {
  const statics = Object.entries(paginas).map(([caminho, data]) => ({
    url: `${site.url}${caminho}`,
    lastModified: data,
  }))
  const songUrls = songs.filter((s) => !Object.hasOwn(redirects, s.slug)).map((s) => ({
    url: `${site.url}/musicas/${s.slug}`,
    lastModified: dataDaMusica(s.slug),
  }))
  const artistUrls = artistList.map((a) => ({
    url: `${site.url}/artistas/${a.slug}`,
    lastModified: a.songs.reduce((maior, s) => lastmod[s.slug] > maior ? lastmod[s.slug] : maior, ''),
  }))
  const postUrls = posts.map((p) => ({
    url: `${site.url}/blog/${p.slug}`,
    lastModified: p.updated || p.date,
  }))
  const colecaoUrls = Object.entries(colecoes).map(([slug, c]) => ({
    url: `${site.url}/colecoes/${slug}`,
    lastModified: c.atualizada,
  }))
  return [...statics, ...colecaoUrls, ...songUrls, ...artistUrls, ...postUrls]
}
