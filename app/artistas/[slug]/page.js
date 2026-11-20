import Link from 'next/link'
import { notFound } from 'next/navigation'
import CatalogBrowser from '@/components/CatalogBrowser'
import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import { CompraNoTopo } from '@/components/catalogo/SemPacote'
import { Icone } from '@/components/ds'
import { artistList, getArtist } from '@/lib/artists'
import { ESTILOS, tuplaDaMusica } from '@/lib/catalogo-lista'
import { OG_IMAGEM, site } from '@/lib/site'
import { ldJson } from '@/lib/safe'

export function generateStaticParams() {
  return artistList.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const artist = getArtist(slug)
  if (!artist) return {}
  const title = `Multitracks de ${artist.name} — VS gospel com clique e guia`
  const description = `Multitracks (VS) de ${artist.name} com clique, guia e canais separados. Inclusos no pacote Trilha Viva com mais de 2.000 multitracks gospel.`
  return {
    title,
    description,
    alternates: { canonical: `/artistas/${artist.slug}` },
    openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/artistas/${artist.slug}` },
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
  // Lista ordenada das músicas mostradas na página (item 3.2 do plano de SEO).
  const listaLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Multitracks de ${artist.name}`,
    numberOfItems: artist.songs.length,
    itemListElement: artist.songs.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${site.url}/musicas/${s.slug}`,
      name: s.title,
    })),
  }

  const total = artist.songs.length
  // VS MP3 é playback mixado, sem canais: a frase só promete canais se há multitrack.
  const comCanais = artist.songs.some((s) => s.tipo !== 'VS MP3')

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson([ld, listaLd]) }} />
      <Pagina>
        <CabecaPagina
          migalhas={[
            { href: '/', label: 'Início' },
            { href: '/artistas', label: 'Artistas' },
            { label: artist.name },
          ]}
          sobre="Artista"
          titulo={artist.name}
          intro={`${total} ${total === 1 ? 'multitrack' : 'multitracks'}${
            comCanais ? ' com clique, guia e canais separados' : ''
          }, ${total === 1 ? 'incluída' : 'todas incluídas'} no pacote 2.000 VS.`}
          acao={<CompraNoTopo linha={`todas as músicas de ${artist.name}`} />}
        />
        <CatalogBrowser
          musicas={artist.songs.map(tuplaDaMusica)}
          estilos={ESTILOS}
          comFiltros={false}
          porPagina={artist.songs.length}
        />
        <Link
          href="/artistas"
          className="flex min-h-[60px] items-center gap-3 border-y border-b-line border-t-ink py-2 hover:bg-surface"
        >
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="rotulo text-text-3">Mais artistas</span>
            <span className="text-[17px] font-[650]">Ver os {artistList.length} artistas e ministérios</span>
          </span>
          <Icone nome="seta-direita" tamanho={20} traco={1.5} />
        </Link>
      </Pagina>
    </>
  )
}
