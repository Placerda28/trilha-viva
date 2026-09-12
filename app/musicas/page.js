import Link from 'next/link'
import CatalogBrowser from '@/components/CatalogBrowser'
import { Breadcrumbs } from '@/components/ui'
import { songs } from '@/lib/catalog'
import { artistList } from '@/lib/artists'
import { site, priceBRL } from '@/lib/site'
import { ldJson } from '@/lib/safe'

export const metadata = {
  title: 'Acervo de Multitracks Gospel — todas as músicas (VS)',
  description:
    'Navegue pelo acervo Trilha Viva: multitracks gospel com clique, guia e canais separados, de dezenas de artistas e ministérios. Pacote único por R$ 89,90.',
  alternates: { canonical: '/musicas' },
  openGraph: {
    title: 'Acervo de Multitracks Gospel — Trilha Viva',
    description: 'Multitracks gospel com clique, guia e canais separados. Mais de 1.000 VS.',
    url: `${site.url}/musicas`,
  },
}

// Esta pagina lia ?artista= e ?q= no servidor. Ler a barra de endereco no
// servidor obriga o Cloudflare a montar a pagina inteira a cada visita - com
// 720 musicas isso estourou o limite do Worker e derrubou o acervo (erro
// 1102). Sem isso a pagina e montada uma vez, na publicacao, e servida pronta.
// Quem le os dois parametros agora e o CatalogBrowser, no navegador.

// O CatalogBrowser roda no navegador, entao tudo que a gente entrega a ele
// viaja dentro do HTML, musica por musica. Vai so o que a lista usa: o resto
// (tom, BPM, versoes, cor) fica no servidor, e o acervo pesa metade.
const lista = songs.map((s) => ({
  slug: s.slug,
  title: s.title,
  artist: s.artist,
  categoria: s.categoria,
  seed: s.seed,
  ...(s.tambem ? { tambem: s.tambem } : {}),
}))

const artistas = artistList
  .map((a) => ({ name: a.name, total: a.songs.length }))
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

const ld = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Acervo de Multitracks Gospel',
  url: `${site.url}/musicas`,
  inLanguage: 'pt-BR',
  isPartOf: { '@id': `${site.url}/#website` },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: songs.length,
    itemListElement: songs.slice(0, 60).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${site.url}/musicas/${s.slug}`,
      name: `${s.title} — ${s.artist}`,
    })),
  },
}

export default function MusicasPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <div className="shell pt-12">
        <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Acervo' }]} />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-8 border-b border-line pb-12">
          <div className="max-w-2xl">
            <h1 className="font-bold text-[36px] leading-[1.1] text-ink sm:text-[48px]">
              Acervo de multitracks gospel
            </h1>
            <p className="mt-5 text-[17px] leading-[1.7] text-ink-muted">
              Multitracks de {artistas.length} artistas e ministérios, todos com clique, guia e os
              instrumentos em canais separados. O acervo continua crescendo, e o que entra depois
              vem no mesmo pacote.
            </p>
          </div>
          <Link href="/assinar" className="btn-signal shrink-0">
            Liberar tudo por {priceBRL(site.price)}
          </Link>
        </div>

        <CatalogBrowser songs={lista} artistas={artistas} />
      </div>
    </>
  )
}
