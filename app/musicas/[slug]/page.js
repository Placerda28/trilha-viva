import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs, SongGrid, Check } from '@/components/ui'
import { SessionPanel } from '@/components/Track'
import { songs, getSong, relatedSongs } from '@/lib/catalog'
import { artistSlug } from '@/lib/artists'
import { site, priceBRL, discountPct } from '@/lib/site'
import { ldJson } from '@/lib/safe'
import { EventoAoAbrir } from '@/components/MetaPixel'
import { getFicha } from '@/lib/ficha'
import { linhaDaFicha, duracaoIso, metaDaMusica, blocoBpm, frasesDeUso } from '@/lib/textos-musica'

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
  const meta = ehVs ? null : metaDaMusica(song, getFicha(song.slug))
  const title = ehVs ? `VS ${song.title} — ${song.artist} (playback mixado em MP3)` : meta.titulo
  const description = ehVs
    ? `VS de ${song.title}, de ${song.artist}: MP3 já mixado, pronto para tocar, sem canais separados. Incluído no pacote Trilha Viva com mais de 2.000 VS gospel por ${priceBRL(site.price)}.`
    : meta.descricao
  return {
    // O título novo já traz a marca (ou a corta quando fica longo): sem o modelo do layout.
    title: ehVs ? title : { absolute: title },
    description,
    alternates: { canonical: `/musicas/${song.slug}` },
    openGraph: { title, description, url: `${site.url}/musicas/${song.slug}`, type: 'music.song' },
  }
}

// "Quem toca também usa": primeiro as do mesmo artista com BPM parecido (±8),
// depois a escolha de sempre do catálogo. Roda no build (página estática).
function relacionadas(song, ficha, n = 6) {
  const proximas = ficha?.bpm
    ? songs.filter((s) => {
        if (s.slug === song.slug || s.artist !== song.artist) return false
        const bpm = getFicha(s.slug)?.bpm
        return bpm && Math.abs(bpm - ficha.bpm) <= 8
      })
    : []
  const vistas = new Set(proximas.map((s) => s.slug))
  return [...proximas, ...relatedSongs(song, n).filter((s) => !vistas.has(s.slug))].slice(0, n)
}

export default async function SongPage({ params }) {
  const { slug } = await params
  const song = getSong(slug)
  if (!song) notFound()
  const ehVs = song.tipo === 'VS MP3'
  const ficha = getFicha(song.slug)
  const related = relacionadas(song, ficha)
  const destaque = linhaDaFicha(ficha)
  const bpmTexto = ehVs ? null : blocoBpm(song, ficha)
  const usos = ehVs ? [] : frasesDeUso(song, ficha)
  const artistaHref = `/artistas/${artistSlug(song.artist)}`

  // So vale listar as versoes quando cada uma tem como ser identificada.
  // Dois arquivos iguais sem tom, sem BPM e sem rotulo viram "versao 1 e 2",
  // que nao diz nada a ninguem.
  const rotulosDasVersoes = song.variantes
    .map((v) =>
      [v.versao, v.tom && `tom ${v.tom}`, v.bpm && `${v.bpm} BPM`].filter(Boolean).join(', ')
    )
    .filter(Boolean)
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    byArtist: { '@type': 'MusicGroup', name: song.artist },
    genre: ['Gospel', 'Música cristã', song.categoria],
    inLanguage: 'pt-BR',
    url: `${site.url}/musicas/${song.slug}`,
    ...(ficha?.duracaoSeg ? { duration: duracaoIso(ficha.duracaoSeg) } : {}),
    description:
      song.tipo === 'VS MP3'
        ? `VS de ${song.title}, de ${song.artist}: MP3 já mixado, sem canais separados.`
        : `Multitrack (VS) de ${song.title}, de ${song.artist}, com clique, guia e canais separados.`,
    isPartOf: {
      '@type': 'Product',
      name: 'Trilha Viva — Pacote Completo com 2.000 Multitracks Gospel',
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
      { '@type': 'ListItem', position: 3, name: song.artist, item: `${site.url}${artistaHref}` },
      {
        '@type': 'ListItem',
        position: 4,
        name: song.title,
        item: `${site.url}/musicas/${song.slug}`,
      },
    ],
  }

  return (
    <>
      <EventoAoAbrir
        evento="ViewContent"
        dados={{ content_name: song.title, content_category: song.artist, content_type: 'product' }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson([ld, crumbLd]) }}
      />

      <article className="shell pt-12">
        <Breadcrumbs
          items={[
            { href: '/', label: 'Início' },
            { href: '/musicas', label: 'Acervo' },
            { href: artistaHref, label: song.artist },
            { label: song.title },
          ]}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SessionPanel song={song} canais={ficha?.canais} />
            <Link
              href={artistaHref}
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
              <Link href={artistaHref} className="link-quiet">
                {song.artist}
              </Link>
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

            {/* Ficha técnica: só o que veio do arquivo ou do MultiTracks. Campo sem dado não aparece. */}
            {destaque.length > 0 && (
              <>
                <p className="figs mt-7 text-[18px] font-bold text-ink">{destaque.join(' · ')}</p>
                {(ficha.bpm || ficha.tom) && (
                  <p className="mt-2 text-[13.5px] text-ink-muted">
                    Tom e BPM podem ser alterados no seu{' '}
                    <Link href="/como-usar#mudar-tom-e-bpm" className="link-quiet font-semibold">
                      programa
                    </Link>{' '}
                    (REAPER, Ableton, Prime e outros).
                  </p>
                )}
              </>
            )}

            <div className="mt-8">
              <Link href="/assinar" className="btn-signal">
                Liberar acesso vitalício por {priceBRL(site.price)}
              </Link>
            </div>

            {ehVs ? (
              <p className="mt-10 max-w-2xl text-[16.5px] leading-[1.75] text-ink-muted">
                <strong className="font-semibold text-ink">{song.title}</strong> entra no pacote como
                VS: um MP3 já mixado, pronto para tocar. Este arquivo não traz os canais separados —
                é playback, e não multitrack.
              </p>
            ) : (
              <section className="mt-12 max-w-2xl">
                <h2 className="text-[19px] font-bold tracking-[-0.015em] text-ink">{bpmTexto.titulo}</h2>
                {bpmTexto.paragrafos.map((p) => (
                  <p key={p.slice(0, 24)} className="mt-4 text-[16.5px] leading-[1.75] text-ink-muted">
                    {p}
                  </p>
                ))}
                <Link href="/como-usar#mudar-tom-e-bpm" className="link-quiet mt-4 inline-block text-[15px] font-semibold">
                  Veja como fazer →
                </Link>
              </section>
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

            {/* A lista de canais so aparece em multitrack, e só a lista real
                do arquivo. Num VS MP3 ela seria promessa falsa: o arquivo e uma
                mixagem so. Sem lista confiável (nomes de faixa ilegíveis), não aparece. */}
            {!ehVs && ficha?.canais?.length > 0 && (
              <>
                <h2 className="mt-12 text-[19px] font-bold tracking-[-0.015em] text-ink">
                  Canais desta multitrack
                </h2>
                {/* Clique e guia sao o que separa multitrack de playback, e o
                    site destaca esses dois em todo lugar. Aqui eles ganham o
                    contorno vermelho; os outros ficam com o fio cinza, para o
                    vermelho continuar significando alguma coisa. */}
                <ul className="mt-5 flex max-w-2xl flex-wrap gap-2">
                  {ficha.canais.map((c) => (
                    <li
                      key={c}
                      className={
                        c === 'Clique' || c === 'Guia'
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

            {usos.length > 0 && (
              <p className="mt-10 max-w-2xl text-[16.5px] leading-[1.75] text-ink-muted">{usos.join(' ')}</p>
            )}

            <div className="panel mt-12 p-8 sm:p-11">
              <p className="chip">
                Não vendemos por música
              </p>
              <h2 className="text-d3 mt-6 text-white">
                Esta música vem no pacote com mais de 2.000 multitracks.
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
                {['Download imediato', 'Pix ou cartão', 'Sem mensalidade', 'Garantia de 7 dias'].map(
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
