import Link from 'next/link'
import { notFound } from 'next/navigation'
import Cover from '@/components/Cover'
import { Breadcrumbs, SongCard, Check } from '@/components/ui'
import { songs, getSong, relatedSongs } from '@/lib/catalog'
import { artistSlug } from '@/lib/artists'
import { site, priceBRL, discountPct } from '@/lib/site'

const CANAIS = [
  'Clique (metrônomo)',
  'Guia falada',
  'Bateria',
  'Baixo',
  'Teclado / Piano',
  'Guitarra',
  'Pads',
  'Vocal principal',
  'Backing vocals',
]

export function generateStaticParams() {
  return songs.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const song = getSong(slug)
  if (!song) return {}
  const title = `Multitrack ${song.title} — ${song.artist} (VS com clique e guia)`
  const description = `Multitrack de ${song.title}, de ${song.artist}, com clique, guia e canais separados em todos os tons. Incluída no pacote Trilha Viva com mais de 4.000 VS gospel por ${priceBRL(site.price)}.`
  return {
    title,
    description,
    alternates: { canonical: `/musicas/${song.slug}` },
    openGraph: { title, description, url: `${site.url}/musicas/${song.slug}`, type: 'music.song' },
  }
}

export default async function SongPage({ params }) {
  const { slug } = await params
  const song = getSong(slug)
  if (!song) notFound()
  const related = relatedSongs(song, 6)

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    byArtist: { '@type': 'MusicGroup', name: song.artist },
    genre: ['Gospel', 'Música cristã', song.categoria],
    inLanguage: 'pt-BR',
    url: `${site.url}/musicas/${song.slug}`,
    description: `Multitrack (VS) de ${song.title}, de ${song.artist}, com clique, guia e canais separados.`,
    isPartOf: {
      '@type': 'Product',
      name: 'Trilha Viva — Pacote Completo com 4.000 Multitracks Gospel',
      offers: {
        '@type': 'Offer',
        price: site.price.toFixed(2),
        priceCurrency: 'BRL',
        availability: 'https://schema.org/InStock',
        url: `${site.url}/assinar`,
      },
    },
  }

  const crumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: site.url },
      { '@type': 'ListItem', position: 2, name: 'Acervo', item: `${site.url}/musicas` },
      {
        '@type': 'ListItem',
        position: 3,
        name: song.title,
        item: `${site.url}/musicas/${song.slug}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, crumbLd]) }}
      />

      <article className="shell pt-12">
        <Breadcrumbs
          items={[
            { href: '/', label: 'Início' },
            { href: '/musicas', label: 'Acervo' },
            { label: song.title },
          ]}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-[340px_1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Cover song={song} className="aspect-square w-full max-w-[340px]" />
            <Link
              href={`/artistas/${artistSlug(song.artist)}`}
              className="link-underline mt-6 inline-block text-[14.5px]"
            >
              Ver todos os multitracks de {song.artist}
            </Link>
          </div>

          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              {song.categoria}
            </p>
            <h1 className="mt-4 font-display text-[38px] font-normal leading-[1.08] text-ink sm:text-[50px]">
              {song.title}
            </h1>
            <p className="mt-3 text-[19px] text-ink-muted">{song.artist}</p>

            <p className="mt-7 max-w-2xl text-[16.5px] leading-[1.75] text-ink-muted">
              Multitrack de <strong className="font-semibold text-ink">{song.title}</strong> com o
              clique e a guia em canais próprios e cada instrumento separado, para a sua banda tocar
              por cima e o operador mandar só o que interessa para o PA. Preparada para transposição,
              então você toca no tom em que o seu ministro canta melhor.
            </p>

            <h2 className="label mt-12">Canais inclusos</h2>
            <p className="mt-5 max-w-2xl text-[16px] leading-[1.8] text-ink-muted">
              {CANAIS.join(' · ')}
            </p>

            <dl className="mt-12 grid grid-cols-2 divide-line border-y border-line sm:grid-cols-4 sm:divide-x">
              {[
                ['Formato', 'WAV + MP3'],
                ['Tons', 'Todos'],
                ['Clique e guia', 'Separados'],
                ['Uso', 'Ao vivo e ensaio'],
              ].map(([k, v]) => (
                <div key={k} className="py-5 sm:px-5 sm:first:pl-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    {k}
                  </dt>
                  <dd className="mt-1.5 font-display text-[17px] text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-12 bg-ink p-8 text-paper sm:p-11">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-accent-soft">
                Não vendemos por música
              </p>
              <h2 className="mt-6 font-display text-[26px] leading-[1.18] sm:text-[32px]">
                Esta música vem no pacote com mais de 4.000 multitracks.
              </h2>
              <p className="mt-4 max-w-lg text-[15.5px] leading-[1.7] text-paper/60">
                Em vez de pagar dezenas de reais por faixa, você leva o acervo inteiro de uma vez —
                pagamento único, acesso vitalício.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link href="/assinar" className="btn-accent">
                  Liberar acesso por {priceBRL(site.price)}
                </Link>
                <p className="text-[14px] text-paper/50">
                  <span className="line-through">{priceBRL(site.fullPrice)}</span> · -{discountPct}%
                  no lançamento
                </p>
              </div>
              <ul className="mt-8 grid gap-3 border-t border-white/10 pt-7 sm:grid-cols-2">
                {['Download imediato', 'Pix ou cartão', 'Sem mensalidade', 'Garantia de 7 dias'].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-3 text-[14.5px] text-paper/70">
                      <Check className="shrink-0 text-accent-soft" />
                      {t}
                    </li>
                  )
                )}
              </ul>
            </div>

            <p className="mt-7 text-[13px] leading-relaxed text-ink-faint">
              Títulos e nomes de artistas são citados apenas para identificar a versão instrumental
              correspondente. Trilha Viva não é afiliada aos artistas mencionados.
            </p>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24 border-t border-line pt-16">
            <h2 className="display text-[26px] sm:text-[32px]">
              Quem toca {song.title} também usa
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
              {related.map((s) => (
                <SongCard key={s.slug} song={s} />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  )
}
