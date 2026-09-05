import Link from 'next/link'
import { ChannelStrip } from '@/components/Track'
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
          <h1 className="text-d1 text-ink">Artistas e ministérios</h1>
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
              <ChannelStrip seed={a.songs[0].seed} height={26} className="shrink-0" />
              <div className="min-w-0">
                <h2 className="truncate text-[17px] font-bold tracking-[-0.015em] text-ink group-hover:underline group-hover:decoration-signal group-hover:decoration-2 group-hover:underline-offset-4">
                  {a.name}
                </h2>
                <p className="figs mt-0.5 text-[13px] text-ink-muted">
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
