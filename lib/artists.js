import { songs } from './catalog'

export function artistSlug(name) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Uma musica com participacao entra nas DUAS bandas: na de quem lancou
// (song.artist) e na do convidado (song.tambem). No Drive o arquivo fica so
// na pasta do principal; quem faz a musica aparecer nos dois lugares e esta
// linha aqui.
export const artistList = Object.values(
  songs.reduce((acc, s) => {
    for (const nome of s.tambem ? [s.artist, s.tambem] : [s.artist]) {
      const slug = artistSlug(nome)
      if (!acc[slug]) acc[slug] = { slug, name: nome, songs: [] }
      if (!acc[slug].songs.includes(s)) acc[slug].songs.push(s)
    }
    return acc
  }, {})
).sort((a, b) => b.songs.length - a.songs.length || a.name.localeCompare(b.name, 'pt-BR'))

export function getArtist(slug) {
  return artistList.find((a) => a.slug === slug)
}
