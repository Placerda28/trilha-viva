import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs, Faq, Check } from '@/components/ui'
import { getSong } from '@/lib/catalog'
import { getFicha } from '@/lib/ficha'
import { linhaDaFicha } from '@/lib/textos-musica'
import { OG_IMAGEM, site, priceBRL, discountPct } from '@/lib/site'
import { ldJson } from '@/lib/safe'
import colecoes from '@/data/colecoes.json'

// Modelo de coleção (item 4 do plano de SEO): Natal, Santa Ceia, batismo...
// O conteúdo de cada uma fica em data/colecoes.json, que o Paulo pode editar.

export function generateStaticParams() {
  return Object.keys(colecoes).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const c = colecoes[slug]
  if (!c) return {}
  return {
    title: { absolute: c.titulo },
    description: c.descricao,
    alternates: { canonical: `/colecoes/${slug}` },
    openGraph: { images: OG_IMAGEM, title: c.titulo, description: c.descricao, url: `${site.url}/colecoes/${slug}` },
  }
}

const comFicha = (slug) => {
  const song = getSong(slug)
  return song && { song, ficha: getFicha(slug) }
}

// Mapa de energia do setlist: a barra vai de 50 a 160 BPM, a faixa das músicas do acervo.
const largura = (bpm) => `${Math.round(((Math.min(Math.max(bpm, 50), 160) - 50) / 110) * 82 + 18)}%`

export default async function ColecaoPage({ params }) {
  const { slug } = await params
  const c = colecoes[slug]
  if (!c) notFound()
  const url = `${site.url}/colecoes/${slug}`
  const musicas = c.musicas.map(comFicha).filter(Boolean)
  const setlist = (c.setlist ?? []).map((i) => ({ ...comFicha(i.slug), motivo: i.motivo })).filter((i) => i.song)

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: c.nome,
      url,
      inLanguage: 'pt-BR',
      mainEntity: {
        '@type': 'ItemList',
        itemListOrder: 'https://schema.org/ItemListUnordered',
        numberOfItems: musicas.length,
        itemListElement: musicas.map(({ song }, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${site.url}/musicas/${song.slug}`,
          name: song.title,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: c.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: site.url },
        { '@type': 'ListItem', position: 2, name: 'Coleções', item: `${site.url}/colecoes` },
        { '@type': 'ListItem', position: 3, name: c.nome, item: url },
      ],
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <div className="shell pt-12">
        <Breadcrumbs
          items={[{ href: '/', label: 'Início' }, { href: '/colecoes', label: 'Coleções' }, { label: c.nome }]}
        />

        <header className="mt-8 max-w-3xl border-b border-line pb-12">
          <h1 className="text-d1 text-ink [text-wrap:balance]">{c.h1}</h1>
          <p className="mt-6 max-w-text font-read text-[18px] leading-[1.7] text-ink-muted">{c.abertura}</p>
          <div className="mt-8">
            <Link href="/assinar" className="btn-signal">
              Liberar acesso vitalício por {priceBRL(site.price)}
            </Link>
          </div>
        </header>

        <section className="pt-16" aria-labelledby="musicas-titulo">
          <h2 id="musicas-titulo" className="text-d3 text-ink">
            {musicas.length} músicas no acervo
          </h2>
          <ul className="mt-8 divide-y divide-line border-y-2 border-ink">
            {musicas.map(({ song, ficha }) => {
              const linha = linhaDaFicha(ficha)
              return (
                <li key={song.slug}>
                  <Link
                    href={`/musicas/${song.slug}`}
                    className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
                  >
                    <span className="min-w-0">
                      <span className="block text-[17px] font-bold text-ink group-hover:underline">{song.title}</span>
                      <span className="block text-[14.5px] text-ink-muted">{song.artist}</span>
                    </span>
                    {linha.length > 0 && <span className="figs text-[14.5px] text-ink-muted">{linha.join(' · ')}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-[13.5px] text-ink-muted">
            Tom e BPM são os da versão original e podem ser alterados no seu{' '}
            <Link href="/como-usar#mudar-tom-e-bpm" className="link-quiet font-semibold">
              programa
            </Link>
            .
          </p>
        </section>

        {setlist.length > 0 && (
          <section className="pt-20 sm:pt-24" aria-labelledby="setlist-titulo">
            <h2 id="setlist-titulo" className="text-d3 text-ink">
              {c.setlistTitulo}
            </h2>
            <p className="mt-4 max-w-text text-[16px] leading-[1.7] text-ink-muted">{c.setlistTexto}</p>
            <ol className="mt-10 max-w-4xl space-y-6">
              {setlist.map(({ song, ficha, motivo }, i) => (
                <li key={song.slug} className="grid grid-cols-[2.2rem_minmax(0,1fr)] gap-x-4">
                  <span className="figs pt-0.5 text-[17px] font-bold text-ink">{i + 1}</span>
                  <div>
                    <p className="text-[17px] font-bold text-ink">
                      <Link href={`/musicas/${song.slug}`} className="hover:underline">
                        {song.title}
                      </Link>{' '}
                      <span className="font-normal text-ink-muted">· {song.artist}</span>
                    </p>
                    {ficha?.bpm && (
                      <span aria-hidden="true" className="mt-2 block h-[6px] bg-ink" style={{ width: largura(ficha.bpm) }} />
                    )}
                    <p className="mt-2 text-[15px] leading-[1.6] text-ink-muted">
                      {ficha?.bpm && <span className="figs font-semibold text-ink">{ficha.bpm} BPM. </span>}
                      {motivo}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="pt-20 sm:pt-24" aria-labelledby="dicas-titulo">
          <h2 id="dicas-titulo" className="text-d3 text-ink">
            {c.dicasTitulo}
          </h2>
          <ul className="mt-8 grid max-w-5xl gap-x-12 gap-y-8 md:grid-cols-2">
            {c.dicas.map((d) => (
              <li key={d.t} className="flex gap-4">
                <Check className="mt-[9px] shrink-0" />
                <div>
                  <p className="text-[17px] font-bold text-ink">{d.t}</p>
                  <p className="mt-1.5 text-[15.5px] leading-[1.65] text-ink-muted">{d.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="panel mt-20 p-8 sm:mt-24 sm:p-11">
          <p className="chip">Não vendemos por música</p>
          <h2 className="text-d3 mt-6 text-white">Todas estas músicas vêm no pacote com mais de 2.000 multitracks.</h2>
          <p className="mt-4 max-w-lg text-[15.5px] leading-[1.7] text-white/60">
            {c.pacoteTexto}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link href="/assinar" className="btn-signal">
              Liberar acesso vitalício por {priceBRL(site.price)}
            </Link>
            <p className="text-[14px] text-white/55">
              De <span className="line-through">{priceBRL(site.fullPrice)}</span>, com {discountPct}% de desconto no
              lançamento
            </p>
          </div>
        </div>

        <section className="pt-20 sm:pt-24" aria-labelledby="faq-titulo">
          <h2 id="faq-titulo" className="text-d3 text-ink">
            {c.faqTitulo}
          </h2>
          <Faq items={c.faq} className="mt-8 max-w-4xl" />
        </section>
      </div>
    </>
  )
}
