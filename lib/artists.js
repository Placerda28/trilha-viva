import { songs } from './catalog'

export function artistSlug(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const artistList = Object.values(
  songs.reduce((acc, s) => {
    const slug = artistSlug(s.artist)
    if (!acc[slug]) acc[slug] = { slug, name: s.artist, songs: [] }
    acc[slug].songs.push(s)
    return acc
  }, {})
).sort((a, b) => b.songs.length - a.songs.length || a.name.localeCompare(b.name, 'pt-BR'))

export function getArtist(slug) {
  return artistList.find((a) => a.slug === slug)
}
