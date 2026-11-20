import CatalogBrowser from '@/components/CatalogBrowser'
import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import { CompraNoTopo } from '@/components/catalogo/SemPacote'
import { songs } from '@/lib/catalog'
import { artistList } from '@/lib/artists'
import { ESTILOS, acervoEmTuplas } from '@/lib/catalogo-lista'
import { OG_IMAGEM, site } from '@/lib/site'
import { ldJson } from '@/lib/safe'

export const metadata = {
  title: 'Acervo de Multitracks Gospel — todas as músicas (VS)',
  description:
    'Navegue pelo acervo Trilha Viva: multitracks gospel com clique, guia e canais separados, de dezenas de artistas e ministérios. Pacote único por R$ 89,90.',
  alternates: { canonical: '/musicas' },
  openGraph: { images: OG_IMAGEM,
    title: 'Acervo de Multitracks Gospel — Trilha Viva',
    description: 'Multitracks gospel com clique, guia e canais separados. Mais de 2.000 VS.',
    url: `${site.url}/musicas`,
  },
}

// Esta pagina lia ?artista= e ?q= no servidor. Ler a barra de endereco no
// servidor obriga o Cloudflare a montar a pagina inteira a cada visita - com
// 720 musicas isso estourou o limite do Worker e derrubou o acervo (erro
// 1102). Sem isso a pagina e montada uma vez, na publicacao, e servida pronta.
// Quem le os dois parametros agora e o CatalogBrowser, no navegador.

// O CatalogBrowser roda no navegador, entao tudo que a gente entrega a ele
// viaja dentro do HTML, musica por musica. Vai so o que a lista usa (titulo,
// artista, estilo, tom e BPM), em listas curtas e nao em objetos: ver
// lib/catalogo-lista.js. A lista de 362 artistas que vinha antes das musicas
// saiu da pagina; os artistas agora sao um filtro e a pagina /artistas.
const ld = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Acervo de Multitracks Gospel',
  url: `${site.url}/musicas`,
  inLanguage: 'pt-BR',
  isPartOf: { '@id': `${site.url}/#website` },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: songs.length,
    itemListElement: songs.slice(0, 60).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${site.url}/musicas/${s.slug}`,
      name: `${s.title} — ${s.artist}`,
    })),
  },
}

export default function MusicasPage() {
  const { musicas, tons } = acervoEmTuplas()
  const nomesDosArtistas = artistList.map((a) => a.name).sort(new Intl.Collator('pt-BR').compare)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <Pagina>
        <CabecaPagina
          migalhas={[{ href: '/', label: 'Início' }, { label: 'Acervo' }]}
          titulo="Acervo de multitracks gospel"
          intro={`Multitracks de ${nomesDosArtistas.length} artistas e ministérios, todos com clique, guia e os instrumentos em canais separados. O acervo continua crescendo, e o que entra depois vem no mesmo pacote.`}
          acao={<CompraNoTopo />}
        />
        <CatalogBrowser musicas={musicas} estilos={ESTILOS} artistas={nomesDosArtistas} tons={tons} />
      </Pagina>
    </>
  )
}
