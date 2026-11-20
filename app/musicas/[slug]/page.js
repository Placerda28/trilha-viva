import Link from 'next/link'
import { notFound } from 'next/navigation'
import Pagina from '@/components/catalogo/Pagina'
import Capa from '@/components/catalogo/Capa'
import PainelPacote from '@/components/catalogo/PainelPacote'
import { H2 } from '@/components/catalogo/Titulos'
import { LinhaMusica, ListaMusicas } from '@/components/catalogo/ListaMusicas'
import AcaoFicha from '@/components/ficha/AcaoFicha'
import FaixaUnica from '@/components/ficha/FaixaUnica'
import { canaisDoQuadro } from '@/components/ficha/canais'
import Canais from '@/components/Canais'
import ConvitePalco from '@/components/ConvitePalco'
import BarraCompra from '@/components/BarraCompra'
import { Migalhas } from '@/components/ds'
import { songs, getSong } from '@/lib/catalog'
import { artistSlug } from '@/lib/artists'
import { musicasRelacionadas } from '@/lib/catalogo-lista'
import { palcoEstado } from '@/lib/palco'
import { OG_IMAGEM, site, priceBRL } from '@/lib/site'
import { ldJson } from '@/lib/safe'
import { EventoAoAbrir } from '@/components/MetaPixel'
import { getFicha } from '@/lib/ficha'
import { duracaoIso, duracaoTexto, metaDaMusica, blocoBpm, frasesDeUso } from '@/lib/textos-musica'
import colecoes from '@/data/colecoes.json'
import { produtoAninhado } from '@/lib/produto-ld'

// Música que está numa coleção ganha o link para ela (ex.: "Ver todas as VS de Natal").
const LINK_DA_COLECAO = { natal: 'Ver todas as VS de Natal' }
// A mesma da página /vs-gratis.
const SLUG_GRATIS = 'a-alegria-o-exercito-de-deus-caiam-por-terra-autoridade-e-poder-morada'

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
    openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/musicas/${song.slug}`, type: 'music.song' },
  }
}

const TEXTO = 'text-[17px] leading-[1.65] text-text-2 [text-wrap:pretty]'
const LINK = 'inline-flex min-h-11 items-center font-semibold underline underline-offset-4'

export default async function SongPage({ params }) {
  const { slug } = await params
  const song = getSong(slug)
  if (!song) notFound()
  const ehVs = song.tipo === 'VS MP3'
  const ficha = getFicha(song.slug)
  const related = musicasRelacionadas(song)
  const bpmTexto = ehVs ? null : blocoBpm(song, ficha)
  const usos = ehVs ? [] : frasesDeUso(song, ficha)
  const artistaHref = `/artistas/${artistSlug(song.artist)}`

  // Faixa de dados: só o que veio do arquivo ou do MultiTracks. Campo sem dado não aparece.
  const dados = [
    ficha?.tom && ['Tom', ficha.tom],
    ficha?.bpm && ['BPM', String(ficha.bpm)],
    ficha?.duracaoSeg && ['Duração', duracaoTexto(ficha.duracaoSeg)],
    ficha?.canais?.length && ['Canais', String(ficha.canais.length)],
  ].filter(Boolean)
  // Só vale listar as versoes quando cada uma tem como ser identificada.
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
    // O mesmo Product completo da home e da /assinar.
    isPartOf: produtoAninhado,
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

      <Pagina espaco="clamp(32px,5cqi,56px)">
        <Migalhas
          itens={[
            { href: '/', label: 'Início' },
            { href: '/musicas', label: 'Acervo' },
            { href: artistaHref, label: song.artist },
            { label: song.title },
          ]}
        />

        <div className="-mt-4 flex flex-wrap items-start gap-x-16 gap-y-8">
          <div className="flex flex-[1_1_440px] flex-col gap-5">
            <div className="flex items-end gap-5">
              <Capa titulo={song.title} grande />
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="rotulo text-text-3">
                  {ehVs ? 'VS · playback mixado' : 'Multitrack'} · {song.categoria}
                </p>
                <h1 className="font-semi-condensed text-[clamp(36px,5.4cqi,60px)] font-extrabold leading-none tracking-[-0.025em] [overflow-wrap:anywhere] [text-wrap:balance]">
                  {song.title}
                </h1>
                <p className="text-[18px]">
                  <Link href={artistaHref} className={LINK}>
                    {song.artist}
                  </Link>
                  {song.part ? <span className="text-text-3"> (part. {song.part})</span> : null}
                </p>
              </div>
            </div>
            {song.tambem && (
              <p className="-mt-2 text-[15px] text-text-3">
                Também listada em{' '}
                <Link href={`/artistas/${artistSlug(song.tambem)}`} className="font-semibold text-ink underline underline-offset-4">
                  {song.tambem}
                </Link>
                .
              </p>
            )}

            {dados.length > 0 && (
              <>
                <dl
                  className="m-0 grid border-y border-b-line border-t-ink"
                  style={{ gridTemplateColumns: `repeat(${dados.length}, minmax(0, 1fr))` }}
                >
                  {dados.map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-0.5 py-3 pr-3">
                      <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-3">{k}</dt>
                      <dd className="figs m-0 font-semi-condensed text-[clamp(20px,2.4cqi,26px)] font-extrabold">{v}</dd>
                    </div>
                  ))}
                </dl>
                {(ficha.bpm || ficha.tom) && (
                  <p className="-mt-2 text-[14px] leading-[1.5] text-text-3">
                    Tom e BPM podem ser alterados no seu{' '}
                    <Link href="/como-usar#mudar-tom-e-bpm" className="font-semibold text-ink underline underline-offset-4">
                      programa
                    </Link>{' '}
                    (REAPER, Ableton, Prime e outros).
                  </p>
                )}
              </>
            )}

            <div id="acao-ficha">
              <AcaoFicha slug={song.slug} gratis={song.slug === SLUG_GRATIS} />
            </div>
            <ConvitePalco variante="ficha" palco={palcoEstado()} />
            {Object.entries(LINK_DA_COLECAO)
              .filter(([c]) => colecoes[c]?.musicas.includes(song.slug))
              .map(([c, texto]) => (
                <Link key={c} href={`/colecoes/${c}`} className={`${LINK} w-fit text-[15px]`}>
                  {texto}
                </Link>
              ))}
          </div>

          {/* Só a lista real do arquivo. Num VS MP3 o arquivo é uma mixagem só; sem
              lista confiável (nomes de faixa ilegíveis), o quadro não aparece. */}
          {(ehVs || ficha?.canais?.length > 0) && (
            <figure className="m-0 flex max-w-[520px] flex-[1_1_380px] flex-col gap-2.5">
              {ehVs ? (
                <FaixaUnica musica={song.title} artista={song.artist} />
              ) : (
                <Canais musica={song.title} artista={song.artist} canais={canaisDoQuadro(ficha.canais)} tema="claro" />
              )}
              <figcaption className="text-[14px] text-text-3">
                {ehVs ? (
                  'Este arquivo é um MP3 já mixado, sem canais separados.'
                ) : (
                  <>
                    <h2 className="inline text-[14px] font-normal">Canais desta multitrack.</h2> O clique e a guia vão só
                    para o fone.
                  </>
                )}
              </figcaption>
            </figure>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-x-16 gap-y-8">
          <section aria-labelledby={ehVs ? undefined : 'h-sobre'} className="flex max-w-[680px] flex-[1_1_440px] flex-col gap-3.5">
            {ehVs ? (
              <p className={TEXTO}>
                <strong className="font-semibold text-ink">{song.title}</strong> entra no pacote como VS: um MP3 já
                mixado, pronto para tocar. Este arquivo não traz os canais separados — é playback, e não multitrack.
              </p>
            ) : (
              <>
                <H2 id="h-sobre">{bpmTexto.titulo}</H2>
                {bpmTexto.paragrafos.map((p) => (
                  <p key={p.slice(0, 24)} className={TEXTO}>
                    {p}
                  </p>
                ))}
                {usos.length > 0 && <p className={TEXTO}>{usos.join(' ')}</p>}
                <Link href="/como-usar#mudar-tom-e-bpm" className={`${LINK} self-start text-[16px]`}>
                  Veja como fazer
                </Link>
              </>
            )}
            {song.variantes.length > 1 && (
              <p className="text-[15px] leading-[1.65] text-text-2">
                O acervo traz <strong className="font-semibold text-ink">{song.variantes.length} versões desta música</strong>
                {rotulosDasVersoes.length === song.variantes.length ? ` — ${rotulosDasVersoes.join('; ')}` : ''}. Todas
                vêm no mesmo pacote.
              </p>
            )}
          </section>

          <PainelPacote
            id="comprar-ficha"
            titulo="Esta música vem no pacote com mais de 2.000 multitracks."
            texto="Em vez de pagar dezenas de reais por faixa, você leva o acervo inteiro de uma vez: pagamento único, acesso vitalício."
            className="max-w-[440px] flex-[1_1_320px]"
          />
        </div>

        {related.length > 0 && (
          <section aria-labelledby="h-rel" className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <H2 id="h-rel">Quem toca {song.title} também usa</H2>
              <Link href={artistaHref} className={`${LINK} text-[15px]`}>
                Todas de {song.artist}
              </Link>
            </div>
            <ListaMusicas largura={380} folga={40}>
              {related.map(({ musica, motivo }) => (
                <LinhaMusica
                  key={musica.slug}
                  musica={musica}
                  detalhe={motivo}
                  direita={
                    musica.bpm > 0 && <span className="figs shrink-0 text-[14px] text-text-2">{musica.bpm} BPM</span>
                  }
                />
              ))}
            </ListaMusicas>
          </section>
        )}

        <p className="max-w-[760px] text-[13px] leading-[1.5] text-text-3">
          Títulos e nomes de artistas são citados apenas para identificar a versão instrumental correspondente. Trilha
          Viva não é afiliada aos artistas mencionados.
        </p>
      </Pagina>
      <BarraCompra inicio="acao-ficha" fim="comprar-ficha" />
    </>
  )
}
