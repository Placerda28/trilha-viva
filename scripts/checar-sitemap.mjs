// Uso: node scripts/checar-sitemap.mjs http://localhost:3000
import { pathToFileURL } from 'node:url'

function decodificarXml(texto) {
  const entidades = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
  return texto.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (_, entidade) => {
    if (entidade.startsWith('#x')) return String.fromCodePoint(parseInt(entidade.slice(2), 16))
    if (entidade.startsWith('#')) return String.fromCodePoint(Number(entidade.slice(1)))
    return entidades[entidade]
  })
}

export async function checarSitemap(baseUrl, buscar = fetch) {
  const base = new URL(baseUrl)
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Informe uma base HTTP ou HTTPS.')
  const resposta = await buscar(new URL('/sitemap.xml', base), { redirect: 'manual', signal: AbortSignal.timeout(30000) })
  if (resposta.status !== 200) throw new Error(`sitemap.xml respondeu ${resposta.status}`)
  const xml = await resposta.text()
  if (/<sitemapindex\b/.test(xml)) throw new Error('Índice encontrado: este verificador espera um sitemap urlset.')
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(([, loc]) => {
    const original = new URL(decodificarXml(loc))
    return new URL(original.pathname + original.search, base.origin).href
  })
  if (!urls.length) throw new Error('Sitemap vazio ou sem endereços válidos.')
  const contagem = { ok: 0, redirects: 0, erros: 0 }
  const falhas = []
  let proximo = 0
  async function consultar(url, method) {
    const resposta = await buscar(url, { method, redirect: 'manual', signal: AbortSignal.timeout(30000) })
    await resposta.body?.cancel()
    return resposta.status
  }
  async function trabalhador() {
    while (proximo < urls.length) {
      const url = urls[proximo++]
      let status = 0, erro
      try {
        try { status = await consultar(url, 'HEAD') } catch { status = 0 }
        if (!status || status >= 400) status = await consultar(url, 'GET')
      } catch (falha) { erro = falha.message }
      if (status === 200) contagem.ok++
      else {
        if (status >= 300 && status < 400) contagem.redirects++
        else contagem.erros++
        falhas.push({ url, status, ...(erro ? { erro } : {}) })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, urls.length) }, trabalhador))
  return { contagem, falhas }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    if (!process.argv[2]) throw new Error('Uso: node scripts/checar-sitemap.mjs <base-url>')
    const { contagem, falhas } = await checarSitemap(process.argv[2])
    console.log(`200: ${contagem.ok}; 3xx: ${contagem.redirects}; 4xx/5xx, outros ou falha de rede: ${contagem.erros}`)
    for (const falha of falhas) console.log(`${falha.status || 'REDE'} ${falha.url}${falha.erro ? ` — ${falha.erro}` : ''}`)
    if (falhas.length) process.exitCode = 1
  } catch (erro) {
    console.error(erro.message)
    process.exitCode = 1
  }
}
