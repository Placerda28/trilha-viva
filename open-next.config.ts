import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

// Todas as paginas do site sao montadas na publicacao - as ~800, incluindo uma
// para cada musica e cada artista. So que "montadas na publicacao" nao basta:
// o Next precisa de um lugar de onde LER essas paginas prontas na hora de
// responder. Sem esse lugar configurado, ele nao acha nada e monta a pagina de
// novo, a cada visita. Era isso que fazia a pagina de musica demorar e as
// vezes cair com o erro 1102 (o Cloudflare da 10 ms de processamento por
// visita), e a resposta vinha marcada "x-nextjs-cache: MISS".
//
// staticAssetsIncrementalCache = o lugar de leitura sao os proprios arquivos
// publicados junto com o site. Nao precisa de R2 nem de banco, nao custa nada,
// e serve exatamente este caso: site que nao se atualiza sozinho, so quando a
// gente publica de novo.
//
// enableCacheInterception faz o site entregar a pagina pronta logo na entrada,
// sem nem acordar o motor do Next - que e onde o tempo ia embora.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
})
