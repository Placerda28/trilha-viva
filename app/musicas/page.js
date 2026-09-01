import Link from 'next/link'
import CatalogBrowser from '@/components/CatalogBrowser'
import { Breadcrumbs } from '@/components/ui'
import { songs, categorias } from '@/lib/catalog'
import { site, priceBRL } from '@/lib/site'

export const metadata = {
  title: 'Acervo de Multitracks Gospel — todas as músicas (VS)',
  description:
    'Navegue pela amostra do acervo Trilha Viva: multitracks gospel com clique, guia e canais separados. Mais de 4.000 VS no pacote único por R$ 89,90.',
  alternates: { canonical: '/musicas' },
  openGraph: {
    title: 'Acervo de Multitracks Gospel — Trilha Viva',
    description: 'Multitracks gospel com clique, guia e canais separados. Mais de 4.000 VS.',
    url: `${site.url}/musicas`,
  },
}

export default async function MusicasPage({ searchParams }) {
  const sp = await searchParams
  const cat = typeof sp?.cat === 'string' ? sp.cat : ''
  const q = typeof sp?.q === 'string' ? sp.q : ''

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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="shell pt-12">
        <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Acervo' }]} />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-8 border-b border-line pb-12">
          <div className="max-w-2xl">
            <h1 className="font-display text-[36px] font-normal leading-[1.1] text-ink sm:text-[48px]">
              Acervo de multitracks gospel
            </h1>
            <p className="mt-5 text-[17px] leading-[1.7] text-ink-muted">
              Esta é uma amostra pública do que está dentro do pacote. Cada música vem com clique,
              guia e os instrumentos em canais separados — e o pacote completo tem mais de{' '}
              {site.totalTracks.toLocaleString('pt-BR')} multitracks.
            </p>
          </div>
          <Link href="/assinar" className="btn-accent shrink-0">
            Liberar tudo por {priceBRL(site.price)}
          </Link>
        </div>

        <CatalogBrowser songs={songs} categorias={categorias} initialCat={cat} initialQuery={q} />
      </div>
    </>
  )
}
