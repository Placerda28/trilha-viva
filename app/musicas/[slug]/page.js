import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs, SongGrid, Check } from '@/components/ui'
import { SessionPanel } from '@/components/Track'
import { songs, getSong, relatedSongs } from '@/lib/catalog'
import { artistSlug } from '@/lib/artists'
import { site, priceBRL, discountPct } from '@/lib/site'
import { ldJson } from '@/lib/safe'

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
  // O titulo e a descricao sao o que aparece no Google. Num VS MP3, prometer
  // "clique e guia" ali seria a mesma promessa falsa que a pagina ja evita.
  const ehVs = song.tipo === 'VS MP3'
  const title = ehVs
    ? `VS ${song.title} — ${song.artist} (playback mixado em MP3)`
    : `Multitrack ${song.title} — ${song.artist} (VS com clique e guia)`
  const description = ehVs
    ? `VS de ${song.title}, de ${song.artist}: MP3 já mixado, pronto para tocar, sem canais separados. Incluído no pacote Trilha Viva com mais de 1.000 VS gospel por ${priceBRL(site.price)}.`
    : `Multitrack de ${song.title}, de ${song.artist}, com clique, guia e canais separados em todos os tons. Incluída no pacote Trilha Viva com mais de 1.000 VS gospel por ${priceBRL(site.price)}.`
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

  // Tom e BPM saem do proprio arquivo do acervo. Quando o acervo nao traz,
  // a ficha mostra o que vale para toda musica do pacote, sem inventar.
  const tons = [...new Set(song.variantes.map((v) => v.tom).filter(Boolean))]
  const bpms = [...new Set(song.variantes.map((v) => v.bpm).filter(Boolean))]
  // So vale listar as versoes quando cada uma tem como ser identificada.
  // Dois arquivos iguais sem tom, sem BPM e sem rotulo viram "versao 1 e 2",
  // que nao diz nada a ninguem.
  const rotulosDasVersoes = song.variantes
    .map((v) =>
      [v.versao, v.tom && `tom ${v.tom}`, v.bpm && `${v.bpm} BPM`].filter(Boolean).join(', ')
    )
    .filter(Boolean)
  const ficha = [
    ['Formato', song.tipo === 'VS MP3' ? 'MP3' : 'WAV + MP3'],
    ['Tom original', tons.length ? tons.join(' · ') : 'Transponível'],
    ['Andamento', bpms.length ? `${bpms.join(' · ')} BPM` : 'Do original'],
    ['Clique e guia', song.tipo === 'VS MP3' ? 'Não' : 'Separados'],
  ]

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    byArtist: { '@type': 'MusicGroup', name: song.artist },
    genre: ['Gospel', 'Música cristã', song.categoria],
    inLanguage: 'pt-BR',
    url: `${site.url}/musicas/${song.slug}`,
    description:
      song.tipo === 'VS MP3'
        ? `VS de ${song.title}, de ${song.artist}: MP3 já mixado, sem canais separados.`
        : `Multitrack (VS) de ${song.title}, de ${song.artist}, com clique, guia e canais separados.`,
    isPartOf: {
      '@type': 'Product',
      name: 'Trilha Viva — Pacote Completo com 1.000 Multitracks Gospel',
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
        dangerouslySetInnerHTML={{ __html: ldJson([ld, crumbLd]) }}
      />

      <article className="shell pt-12">
        <Breadcrumbs
          items={[
            { href: '/', label: 'Início' },
            { href: '/musicas', label: 'Acervo' },
            { label: song.title },
          ]}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SessionPanel song={song} />
            <Link
              href={`/artistas/${artistSlug(song.artist)}`}
              className="link-quiet mt-6 inline-block text-[14.5px] font-semibold"
            >
              {song.tipo === 'VS MP3'
                ? `Ver todo o acervo de ${song.artist}`
                : `Ver todos os multitracks de ${song.artist}`}
            </Link>
          </div>

          <div>
            <p className="text-[14px] font-semibold text-ink-muted">
              {song.tipo === 'VS MP3' ? 'VS — playback mixado' : 'Multitrack'}
            </p>
            <h1 className="text-d1 mt-3 text-ink [text-wrap:balance]">{song.title}</h1>
            <p className="mt-4 text-[20px] text-ink-muted">
              {song.artist}
              {song.part ? (
                <span className="text-ink-faint"> (part. {song.part})</span>
              ) : null}
            </p>
            {song.tambem && (
              <p className="mt-2 text-[14.5px] text-ink-muted">
                Também listada em{' '}
                <Link href={`/artistas/${artistSlug(song.tambem)}`} className="link-quiet font-semibold">
                  {song.tambem}
                </Link>
                .
              </p>
            )}

            {song.tipo === 'VS MP3' ? (
              <p className="mt-7 max-w-2xl text-[16.5px] leading-[1.75] text-ink-muted">
                <strong className="font-semibold text-ink">{song.title}</strong> entra no pacote como
                VS: um MP3 já mixado, pronto para tocar. Este arquivo não traz os canais separados —
                é playback, e não multitrack.
              </p>
            ) : (
              <p className="mt-7 max-w-2xl text-[16.5px] leading-[1.75] text-ink-muted">
                Multitrack de <strong className="font-semibold text-ink">{song.title}</strong> com o
                clique e a guia em canais próprios e cada instrumento separado, para a sua banda
                tocar por cima e o operador mandar só o que interessa para o PA. Preparada para
                transposição, então você toca no tom em que o seu ministro canta melhor.
              </p>
            )}

            {song.variantes.length > 1 && (
              <p className="mt-5 max-w-2xl text-[15px] leading-[1.7] text-ink-muted">
                O acervo traz{' '}
                <strong className="font-semibold text-ink">
                  {song.variantes.length} versões desta música
                </strong>
                {rotulosDasVersoes.length === song.variantes.length
                  ? ` — ${rotulosDasVersoes.join('; ')}`
                  : ''}
                . Todas vêm no mesmo pacote.
              </p>
            )}

            {/* A lista de canais so aparece em multitrack. Num VS MP3 ela
                seria promessa falsa: o arquivo e uma mixagem so. */}
            {song.tipo !== 'VS MP3' && (
              <>
                <h2 className="mt-12 text-[19px] font-bold tracking-[-0.015em] text-ink">
                  Canais inclusos
                </h2>
                {/* Os dois primeiros canais sao o clique e a guia: e o que
                    separa multitrack de playback, e o site destaca esses dois
                    em todo lugar. Aqui eles ganham o contorno vermelho; os
                    outros sete ficam com o fio cinza, para o vermelho
                    continuar significando alguma coisa. */}
                <ul className="mt-5 flex max-w-2xl flex-wrap gap-2">
                  {CANAIS.map((c, i) => (
                    <li
                      key={c}
                      className={
                        i < 2
                          ? 'border border-signal px-3 py-1.5 text-[14.5px] font-semibold text-signal-deep'
                          : 'border border-line px-3 py-1.5 text-[14.5px] text-ink-muted'
                      }
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <dl className="mt-12 grid grid-cols-2 divide-line border-y border-line sm:grid-cols-4 sm:divide-x">
              {ficha.map(([k, v]) => (
                <div key={k} className="py-5 sm:px-5 sm:first:pl-0">
                  <dt className="text-[13.5px] text-ink-muted">{k}</dt>
                  <dd className="mt-1.5 text-[17px] font-bold text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="panel mt-12 p-8 sm:p-11">
              <p className="chip">
                Não vendemos por música
              </p>
              <h2 className="text-d3 mt-6 text-white">
                Esta música vem no pacote com mais de 1.000 multitracks.
              </h2>
              <p className="mt-4 max-w-lg text-[15.5px] leading-[1.7] text-white/60">
                Em vez de pagar dezenas de reais por faixa, você leva o acervo inteiro de uma vez —
                pagamento único, acesso vitalício.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link href="/assinar" className="btn-signal">
                  Liberar acesso vitalício por {priceBRL(site.price)}
                </Link>
                <p className="text-[14px] text-white/55">
                  De <span className="line-through">{priceBRL(site.fullPrice)}</span>, com{' '}
                  {discountPct}% de desconto no lançamento
                </p>
              </div>
              <ul className="mt-8 grid gap-3 border-t border-white/10 pt-7 sm:grid-cols-2">
                {['Download imediato', 'Pagamento no cartão', 'Sem mensalidade', 'Garantia de 7 dias'].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-3 text-[14.5px] text-white/75">
                      <Check tone="light" className="shrink-0" />
                      {t}
                    </li>
                  )
                )}
              </ul>
            </div>

            <p className="mt-7 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
              Títulos e nomes de artistas são citados apenas para identificar a versão instrumental
              correspondente. Trilha Viva não é afiliada aos artistas mencionados.
            </p>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24 border-t border-line pt-16">
            <h2 className="text-d3 text-ink">Quem toca {song.title} também usa</h2>
            <div className="mt-8 border-t-2 border-ink">
              <SongGrid songs={related} />
            </div>
          </section>
        )}
      </article>
    </>
  )
}
