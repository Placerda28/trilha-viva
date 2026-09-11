import { songs } from './catalog'

// O acervo ja vem pronto do catalog.js, entao aqui so sobra agrupar por banda.
// Vale a mesma regra de la: o site tem 10 ms de processamento por visita no
// Cloudflare, entao nada de trabalho caro no carregamento (ver a explicacao no
// topo do catalog.js). Por isso um so Intl.Collator, e Map/Set no lugar de
// varrer lista dentro de laco.
const colator = new Intl.Collator('pt-BR')

const cache = new Map()

export function artistSlug(name) {
  const pronto = cache.get(name)
  if (pronto !== undefined) return pronto
  const slug = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  cache.set(name, slug)
  return slug
}

// Uma musica com participacao entra nas DUAS bandas: na de quem lancou
// (song.artist) e na do convidado (song.tambem). No Drive o arquivo fica so
// na pasta do principal; quem faz a musica aparecer nos dois lugares e esta
// linha aqui.
const porSlug = new Map()

for (const s of songs) {
  const nomes = s.tambem ? [s.artist, s.tambem] : [s.artist]
  for (const nome of nomes) {
    const slug = artistSlug(nome)
    let artista = porSlug.get(slug)
    if (!artista) {
      artista = { slug, name: nome, songs: [], vistas: new Set() }
      porSlug.set(slug, artista)
    }
    if (!artista.vistas.has(s.slug)) {
      artista.vistas.add(s.slug)
      artista.songs.push(s)
    }
  }
}

export const artistList = [...porSlug.values()]
  .map(({ slug, name, songs: lista }) => ({ slug, name, songs: lista }))
  .sort((a, b) => b.songs.length - a.songs.length || colator.compare(a.name, b.name))

const porSlugFinal = new Map(artistList.map((a) => [a.slug, a]))

export function getArtist(slug) {
  return porSlugFinal.get(slug)
}
