import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs, SongGrid } from '@/components/ui'
import { artistList, getArtist } from '@/lib/artists'
import { site, priceBRL } from '@/lib/site'
import { ldJson } from '@/lib/safe'

export function generateStaticParams() {
  return artistList.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const artist = getArtist(slug)
  if (!artist) return {}
  const title = `Multitracks de ${artist.name} — VS gospel com clique e guia`
  const description = `Multitracks (VS) de ${artist.name} com clique, guia e canais separados, em todos os tons. Inclusos no pacote Trilha Viva com mais de 4.000 multitracks gospel.`
  return {
    title,
    description,
    alternates: { canonical: `/artistas/${artist.slug}` },
    openGraph: { title, description, url: `${site.url}/artistas/${artist.slug}` },
  }
}

export default async function ArtistPage({ params }) {
  const { slug } = await params
  const artist = getArtist(slug)
  if (!artist) notFound()

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: artist.name,
    url: `${site.url}/artistas/${artist.slug}`,
    genre: 'Gospel',
    track: artist.songs.map((s) => ({
      '@type': 'MusicRecording',
      name: s.title,
      url: `${site.url}/musicas/${s.slug}`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <div className="shell pt-12">
        <Breadcrumbs
          items={[
            { href: '/', label: 'Início' },
            { href: '/artistas', label: 'Artistas' },
            { label: artist.name },
          ]}
        />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-8 border-b border-line pb-12">
          <div className="max-w-2xl">
            <h1 className="text-d2 text-ink">
              Multitracks de {artist.name}
            </h1>
            <p className="mt-5 text-[17px] leading-[1.7] text-ink-muted">
              {artist.songs.length}{' '}
              {artist.songs.length === 1 ? 'louvor listado' : 'louvores listados'} na amostra
              pública, com clique, guia e canais separados. Todos fazem parte do pacote único.
            </p>
          </div>
          <Link href="/assinar" className="btn-signal shrink-0">
            Liberar por {priceBRL(site.price)}
          </Link>
        </div>

        <div className="mt-10 border-t-2 border-ink">
          <SongGrid songs={artist.songs} />
        </div>
      </div>
    </>
  )
}
