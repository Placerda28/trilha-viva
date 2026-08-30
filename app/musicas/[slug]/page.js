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
    openGraph: {
      title,
      description,
      url: `${site.url}/musicas/${song.slug}`,
      type: 'music.song',
    },
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
      { '@type': 'ListItem', position: 3, name: song.title, item: `${site.url}/musicas/${song.slug}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, crumbLd]) }}
      />

      <article className="shell pt-10">
        <Breadcrumbs
          items={[
            { href: '/', label: 'Início' },
            { href: '/musicas', label: 'Acervo' },
            { label: song.title },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Cover song={song} rounded="rounded-2xl" className="w-full max-w-[340px] shadow-lift" />
            <Link
              href={`/artistas/${artistSlug(song.artist)}`}
              className="mt-5 inline-flex text-[14px] font-medium text-brand-600 hover:text-brand-700"
            >
              Ver todos os multitracks de {song.artist} →
            </Link>
          </div>

          <div>
            <span className="eyebrow">{song.categoria}</span>
            <h1 className="mt-4 text-[38px] font-extrabold leading-[1.06] tracking-[-0.04em] text-ink sm:text-[48px]">
              {song.title}
            </h1>
            <p className="mt-2 text-[19px] font-medium text-ink-muted">{song.artist}</p>

            <p className="mt-6 max-w-2xl text-[16.5px] leading-[1.7] text-ink-muted">
              Multitrack de <strong className="font-semibold text-ink">{song.title}</strong> com o
              clique e a guia em canais próprios e cada instrumento separado, para a sua banda tocar
              por cima e o operador mandar só o que interessa para o PA. Preparada para transposição,
              então você toca no tom em que o seu ministro canta melhor.
            </p>

            <h2 className="mt-10 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Canais inclusos
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {CANAIS.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13.5px] font-medium text-ink-muted"
                >
                  {c}
                </li>
              ))}
            </ul>

            <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
              {[
                ['Formato', 'WAV + MP3'],
                ['Tons', 'Todos'],
                ['Clique e guia', 'Separados'],
                ['Uso', 'Ao vivo e ensaio'],
              ].map(([k, v]) => (
                <div key={k} className="bg-white p-5">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    {k}
                  </dt>
                  <dd className="mt-1.5 text-[15px] font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-ink p-7 text-white sm:p-9">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                Não vendemos por música
              </span>
              <h2 className="mt-5 text-[24px] font-bold leading-[1.15] tracking-[-0.03em] sm:text-[30px]">
                Esta música vem no pacote com mais de 4.000 multitracks.
              </h2>
              <p className="mt-3 max-w-lg text-[15px] leading-[1.65] text-white/60">
                Em vez de pagar dezenas de reais por faixa, você leva o acervo inteiro de uma vez —
                pagamento único, acesso vitalício.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <Link href="/assinar" className="btn-flame">
                  Liberar acesso por {priceBRL(site.price)}
                </Link>
                <p className="text-[14px] text-white/50">
                  <span className="line-through">{priceBRL(site.fullPrice)}</span> · -{discountPct}%
                  no lançamento
                </p>
              </div>
              <ul className="mt-7 grid gap-2.5 border-t border-white/10 pt-6 sm:grid-cols-2">
                {['Download imediato', 'Pix ou cartão', 'Sem mensalidade', 'Garantia de 7 dias'].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2.5 text-[14px] text-white/70">
                      <Check className="shrink-0 text-flame-400" />
                      {t}
                    </li>
                  )
                )}
              </ul>
            </div>

            <p className="mt-6 text-[13px] leading-relaxed text-ink-faint">
              Títulos e nomes de artistas são citados apenas para identificar a versão instrumental
              correspondente. Trilha Viva não é afiliada aos artistas mencionados.
            </p>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 border-t border-line pt-14">
            <h2 className="text-[24px] font-bold tracking-[-0.03em] text-ink sm:text-[30px]">
              Quem toca {song.title} também usa
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-6">
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
