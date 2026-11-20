import Link from 'next/link'
import { notFound } from 'next/navigation'
import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import PainelPacote from '@/components/catalogo/PainelPacote'
import { CompraNoTopo } from '@/components/catalogo/SemPacote'
import { H2 } from '@/components/catalogo/Titulos'
import { LinhaMusica, ListaMusicas } from '@/components/catalogo/ListaMusicas'
import { Icone, ListaSanfona, Quadrado } from '@/components/ds'
import { getSong } from '@/lib/catalog'
import { ESTILOS, tuplaDaMusica } from '@/lib/catalogo-lista'
import { musicaDaTupla } from '@/lib/catalogo-util'
import { getPost } from '@/lib/posts'
import { OG_IMAGEM, site } from '@/lib/site'
import { ldJson } from '@/lib/safe'
import colecoes from '@/data/colecoes.json'

// Modelo de coleção (item 4 do plano de SEO): Natal, Santa Ceia, batismo...
// O conteúdo de cada uma fica em data/colecoes.json, que o Paulo pode editar.

// Coleção que tem artigo no blog ganha o link no fim da página.
const POST_DA_COLECAO = { natal: 'repertorio-de-natal-igreja-setlist-vs' }

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
  return song && { song, musica: musicaDaTupla(tuplaDaMusica(song), ESTILOS) }
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
  const post = POST_DA_COLECAO[slug] && getPost(POST_DA_COLECAO[slug])

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
      <Pagina espaco="clamp(32px,5cqi,56px)">
        <CabecaPagina
          migalhas={[{ href: '/', label: 'Início' }, { href: '/colecoes', label: 'Coleções' }, { label: c.nome }]}
          sobre="Coleção"
          titulo={c.h1}
          intro={c.abertura}
          grande
          acao={<CompraNoTopo />}
        />

        <section aria-labelledby="musicas-titulo" className="flex flex-col gap-3.5">
          <H2 id="musicas-titulo" pequeno>
            {musicas.length} músicas no acervo
          </H2>
          <ListaMusicas>
            {musicas.map(({ musica }) => (
              <LinhaMusica key={musica.slug} musica={musica} />
            ))}
          </ListaMusicas>
          <p className="text-[14px] text-text-3">
            Tom e BPM são os da versão original e podem ser alterados no seu{' '}
            <Link href="/como-usar#mudar-tom-e-bpm" className="font-semibold text-ink underline underline-offset-4">
              programa
            </Link>
            .
          </p>
        </section>

        {setlist.length > 0 && (
          <section aria-labelledby="setlist-titulo" className="flex flex-col gap-3.5">
            <H2 id="setlist-titulo">{c.setlistTitulo}</H2>
            <p className="max-w-[680px] text-[17px] leading-[1.6] text-text-2">{c.setlistTexto}</p>
            <ol className="m-0 mt-3 flex max-w-4xl list-none flex-col p-0">
              {setlist.map(({ song, musica, motivo }, i) => (
                <li key={song.slug} className="grid grid-cols-[2.2rem_minmax(0,1fr)] gap-x-3 border-t border-line py-4 last:border-b">
                  <span className="figs pt-0.5 text-[17px] font-bold text-text-3">{i + 1}</span>
                  <div>
                    <p className="text-[17px] font-semibold">
                      <Link href={`/musicas/${song.slug}`} className="underline-offset-4 hover:underline">
                        {song.title}
                      </Link>{' '}
                      <span className="font-normal text-text-3">· {song.artist}</span>
                    </p>
                    {musica.bpm > 0 && (
                      <span aria-hidden="true" className="mt-2 block h-1.5 bg-ink" style={{ width: largura(musica.bpm) }} />
                    )}
                    <p className="mt-2 text-[15px] leading-[1.6] text-text-2">
                      {musica.bpm > 0 && <span className="figs font-semibold text-ink">{musica.bpm} BPM. </span>}
                      {motivo}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="dicas-titulo" className="flex flex-col gap-3.5">
          <H2 id="dicas-titulo">{c.dicasTitulo}</H2>
          <ul className="m-0 mt-3 grid max-w-5xl list-none gap-x-12 gap-y-6 p-0 md:grid-cols-2">
            {c.dicas.map((d) => (
              <li key={d.t} className="flex gap-3.5">
                <Quadrado className="mt-2" />
                <div>
                  <p className="text-[17px] font-[650]">{d.t}</p>
                  <p className="mt-1 text-[15.5px] leading-[1.6] text-text-2">{d.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <PainelPacote
          titulo="Todas estas músicas vêm no pacote com mais de 2.000 multitracks."
          texto={c.pacoteTexto}
          className="max-w-[560px]"
        />

        <section aria-labelledby="faq-titulo" className="flex flex-col gap-3.5">
          <H2 id="faq-titulo">{c.faqTitulo}</H2>
          <ListaSanfona itens={c.faq.map((f) => ({ titulo: f.q, conteudo: f.a }))} className="max-w-4xl" />
        </section>

        {post && (
          <Link
            href={`/blog/${post.slug}`}
            className="flex min-h-[60px] items-center gap-3 border-y border-b-line border-t-ink py-2 hover:bg-surface"
          >
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="rotulo text-text-3">No blog</span>
              <span className="text-[17px] font-[650]">{post.title}</span>
            </span>
            <Icone nome="seta-direita" tamanho={20} traco={1.5} />
          </Link>
        )}
      </Pagina>
    </>
  )
}
