import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // O lint é só medição (npm run lint); o build e o deploy não dependem dele.
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    const { readFile } = await import('node:fs/promises')
    const mapa = JSON.parse(await readFile(new URL('./data/redirects.json', import.meta.url), 'utf8'))
    return Object.entries(mapa).map(([slug, destination]) => ({
      source: `/musicas/${slug}`,
      destination,
      statusCode: 301,
    }))
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/sucesso',
        // O endereço da /sucesso traz a chave da compra: a página seguinte não
        // pode recebê-lo como referrer (e o Pixel de lá mandá-lo à Meta).
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ]
  },
}

// Deixa os bindings da Cloudflare disponíveis durante o `next dev`.
initOpenNextCloudflareForDev()

export default nextConfig
