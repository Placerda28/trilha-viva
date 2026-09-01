import Link from 'next/link'
import Cover from '@/components/Cover'
import { Breadcrumbs } from '@/components/ui'
import { artistList } from '@/lib/artists'
import { site, priceBRL } from '@/lib/site'

export const metadata = {
  title: 'Artistas e ministérios com multitrack gospel',
  description:
    'Multitracks gospel (VS) de Fernandinho, Gabriela Rocha, Isaías Saad, Morada, Casa Worship, Aline Barros e dezenas de outros artistas e ministérios — todos no pacote Trilha Viva.',
  alternates: { canonical: '/artistas' },
}

export default function ArtistasPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Artistas com multitrack gospel',
    url: `${site.url}/artistas`,
    inLanguage: 'pt-BR',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="shell pt-12">
        <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Artistas' }]} />

        <div className="mt-8 max-w-2xl border-b border-line pb-12">
          <h1 className="font-display text-[36px] font-normal leading-[1.1] text-ink sm:text-[48px]">
            Artistas e ministérios
          </h1>
          <p className="mt-5 text-[17px] leading-[1.7] text-ink-muted">
            Os louvores que a sua igreja canta, com multitrack pronto para o culto. Todos incluídos
            no mesmo pacote por {priceBRL(site.price)}.
          </p>
        </div>

        <div className="mt-2 grid divide-y divide-line sm:grid-cols-2 sm:gap-x-14 lg:grid-cols-3">
          {artistList.map((a) => (
            <Link
              key={a.slug}
              href={`/artistas/${a.slug}`}
              className="group flex items-center gap-4 py-5"
            >
              <Cover song={a.songs[0]} className="h-14 w-14 shrink-0" />
              <div className="min-w-0">
                <h2 className="truncate font-display text-[18px] text-ink group-hover:text-accent">
                  {a.name}
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-faint">
                  {a.songs.length}{' '}
                  {a.songs.length === 1 ? 'multitrack na amostra' : 'multitracks na amostra'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
