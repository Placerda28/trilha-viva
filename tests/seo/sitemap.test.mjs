import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { songs, totalArquivos } from '../../lib/catalog.js'
import { posts } from '../../lib/posts.js'
import { carregarArtistas, lerJson } from '../../scripts/achar-redirects.mjs'

const artistList = await carregarArtistas()
const lastmod = lerJson('lastmod')
const redirects = lerJson('redirects')
const colecoes = lerJson('colecoes')
const codigo = readFileSync(new URL('../../app/sitemap.js', import.meta.url), 'utf8')
const sitemap = runInNewContext(codigo.replace(/^import .+$/gm, '').replace('export const dynamic', 'const dynamic').replace('export default function', 'function') + '\nsitemap()', {
  songs, artistList, posts, lastmod, redirects, colecoes, site: { url: 'https://trilhaviva.org' },
})
// 9 páginas fixas de antes, mais /colecoes e /vs-gratis, mais uma por coleção.
const FIXAS = 11 + Object.keys(colecoes).length

test('sitemap estático, completo, sem redirects e abaixo de 2.000 URLs', () => {
  assert.match(codigo, /export const dynamic = 'force-static'/)
  assert.equal(sitemap.length, songs.length + artistList.length + posts.length + FIXAS)
  assert.ok(sitemap.some((p) => p.url === 'https://trilhaviva.org/colecoes/natal'))
  assert.ok(sitemap.length <= 2000)
  assert.equal(new Set(sitemap.map((p) => p.url)).size, sitemap.length)
  const datas = Object.values(lastmod)
  assert.equal(datas.length, songs.length)
  for (const pagina of sitemap) {
    assert.match(pagina.lastModified, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(!('priority' in pagina) && !('changeFrequency' in pagina))
    assert.ok(!Object.hasOwn(redirects, pagina.url.replace('https://trilhaviva.org/musicas/', '')))
  }
  console.log(`Sitemap: ${songs.length} músicas, ${artistList.length} artistas, 9 páginas fixas, ${posts.length} posts; total ${sitemap.length}. Arquivos do acervo: ${totalArquivos}.`)
})

test('artistas recebem a maior data de suas músicas, incluindo participações', () => {
  const porUrl = new Map(sitemap.map((p) => [p.url, p.lastModified]))
  for (const artista of artistList) {
    assert.equal(porUrl.get(`https://trilhaviva.org/artistas/${artista.slug}`), artista.songs.map((s) => lastmod[s.slug]).sort().at(-1))
  }
  for (const post of posts) assert.equal(porUrl.get(`https://trilhaviva.org/blog/${post.slug}`), post.updated || post.date)
})
