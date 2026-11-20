import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import ArtistasIndice from '@/components/catalogo/ArtistasIndice'
import { CompraNoTopo } from '@/components/catalogo/SemPacote'
import { artistList } from '@/lib/artists'
import { plano } from '@/lib/catalogo-util'
import { OG_IMAGEM, site } from '@/lib/site'

const title = 'Artistas e ministérios com multitrack gospel'
const description =
  'Multitracks gospel (VS) de Fernandinho, Gabriela Rocha, Isaías Saad, Morada, Casa Worship, Aline Barros e dezenas de outros artistas e ministérios — todos no pacote Trilha Viva.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/artistas' },
  openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/artistas` },
}

// Uma letra para cada artista: sem acento e em minúscula; número ou símbolo vai
// para o grupo "0-9" (id 'num').
const letraDe = (nome) => {
  const c = plano(nome)[0] ?? ''
  return /[a-z]/.test(c) ? c : 'num'
}

function agrupar() {
  const ordem = new Intl.Collator('pt-BR', { sensitivity: 'base' })
  const itens = artistList.map((a) => [a.slug, a.name, a.songs.length]).sort((a, b) => ordem.compare(a[1], b[1]))
  const porLetra = new Map()
  for (const item of itens) {
    const id = letraDe(item[1])
    if (!porLetra.has(id)) porLetra.set(id, [])
    porLetra.get(id).push(item)
  }
  const ids = [...porLetra.keys()].sort((a, b) => (a === 'num' ? -1 : b === 'num' ? 1 : a < b ? -1 : 1))
  return ids.map((id) => ({ id, letra: id === 'num' ? '0-9' : id.toUpperCase(), itens: porLetra.get(id) }))
}

export default function ArtistasPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Artistas com multitrack gospel',
    url: `${site.url}/artistas`,
    inLanguage: 'pt-BR',
  }
  // artistList já vem do maior acervo para o menor.
  const destaques = artistList.slice(0, 12).map((a) => [a.slug, a.name, a.songs.length])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Pagina>
        <CabecaPagina
          migalhas={[{ href: '/', label: 'Início' }, { label: 'Artistas' }]}
          titulo="Artistas e ministérios"
          intro={`${artistList.length} artistas e ministérios no acervo, do congregacional à ministração. Os louvores que a sua igreja canta, com multitrack pronto para o culto.`}
          acao={<CompraNoTopo />}
        />
        <ArtistasIndice destaques={destaques} grupos={agrupar()} />
      </Pagina>
    </>
  )
}
