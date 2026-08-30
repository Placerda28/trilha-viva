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
      <div className="shell pt-10">
        <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Artistas' }]} />

        <div className="mt-7 max-w-2xl border-b border-line pb-10">
          <h1 className="text-[36px] font-extrabold leading-[1.08] tracking-[-0.04em] text-ink sm:text-[46px]">
            Artistas e ministérios
          </h1>
          <p className="mt-4 text-[17px] leading-[1.62] text-ink-muted">
            Os louvores que a sua igreja canta, com multitrack pronto para o culto. Todos incluídos
            no mesmo pacote por {priceBRL(site.price)}.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artistList.map((a) => (
            <Link
              key={a.slug}
              href={`/artistas/${a.slug}`}
              className="group card flex items-center gap-4 p-4 transition-shadow hover:shadow-lift"
            >
              <Cover song={a.songs[0]} rounded="rounded-lg" className="h-16 w-16 shrink-0" />
              <div className="min-w-0">
                <h2 className="truncate text-[16px] font-semibold tracking-[-0.02em] text-ink">
                  {a.name}
                </h2>
                <p className="mt-0.5 text-[13.5px] text-ink-faint">
                  {a.songs.length} {a.songs.length === 1 ? 'multitrack na amostra' : 'multitracks na amostra'}
                </p>
              </div>
              <span className="ml-auto shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
