import test from 'node:test'
import assert from 'node:assert/strict'
import { checarSitemap } from '../../scripts/checar-sitemap.mjs'

test('troca domínio, limita a oito consultas e não segue redirects', async () => {
  let ativas = 0, pico = 0
  const urls = []
  const resultado = await checarSitemap('http://localhost:3000', async (url, options) => {
    urls.push(String(url))
    assert.equal(options.redirect, 'manual')
    if (String(url).endsWith('/sitemap.xml')) return new Response(`<urlset>${Array.from({ length: 20 }, (_, i) => `<url><loc>https://trilhaviva.org/p${i}</loc></url>`).join('')}</urlset>`)
    ativas++
    pico = Math.max(pico, ativas)
    await new Promise((resolve) => setTimeout(resolve, 2))
    ativas--
    if (String(url).endsWith('/p0')) return new Response(null, { status: 301 })
    if (String(url).endsWith('/p1') && options.method === 'HEAD') return new Response(null, { status: 405 })
    if (String(url).endsWith('/p2')) return new Response(null, { status: 404 })
    return new Response(null, { status: 200 })
  })
  assert.ok(pico <= 8 && pico > 1)
  assert.ok(urls.every((url) => url.startsWith('http://localhost:3000/')))
  assert.deepEqual(resultado.contagem, { ok: 18, redirects: 1, erros: 1 })
  assert.equal(resultado.falhas.length, 2)
})

test('falha de rede tenta GET; sitemap vazio ou indisponível falha', async () => {
  const xml = '<urlset><url><loc>https://trilhaviva.org/</loc></url></urlset>'
  const resultado = await checarSitemap('http://localhost:3000', async (url, options) => {
    if (String(url).endsWith('sitemap.xml')) return new Response(xml)
    if (options.method === 'HEAD') throw new Error('HEAD indisponível')
    return new Response(null, { status: 200 })
  })
  assert.equal(resultado.contagem.ok, 1)
  await assert.rejects(checarSitemap('http://localhost:3000', async () => new Response('<urlset/>')))
  await assert.rejects(checarSitemap('http://localhost:3000', async () => new Response(null, { status: 500 })))
})
