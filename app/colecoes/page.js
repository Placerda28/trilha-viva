import Link from 'next/link'
import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import { Icone } from '@/components/ds'
import { OG_IMAGEM, site } from '@/lib/site'
import colecoes from '@/data/colecoes.json'

const title = 'Coleções de multitracks por momento do culto'
const description = 'Multitracks gospel (VS) separadas por ocasião: Natal e outros momentos do culto, com BPM, tom e setlist sugerido.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/colecoes' },
  openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/colecoes` },
}

export default function ColecoesPage() {
  return (
    <Pagina largura={1080}>
      <CabecaPagina
        migalhas={[{ href: '/', label: 'Início' }, { label: 'Coleções' }]}
        titulo="Coleções"
        intro="Repertórios montados por ocasião, com o BPM e o tom de cada música e uma sugestão de setlist."
      />
      <ul className="m-0 flex list-none flex-col border-b border-line p-0">
        {Object.entries(colecoes).map(([slug, c]) => (
          <li key={slug} className="border-t border-line first:border-t-ink">
            <Link href={`/colecoes/${slug}`} className="flex min-h-[76px] items-center gap-3 py-3 hover:bg-surface">
              <span className="flex flex-1 flex-col gap-1">
                <span className="font-semi-condensed text-[clamp(20px,2.4cqi,26px)] font-bold leading-[1.2]">{c.nome}</span>
                <span className="figs text-[14px] text-text-3">{c.musicas.length} músicas</span>
              </span>
              <Icone nome="seta-direita" tamanho={20} traco={1.5} />
            </Link>
          </li>
        ))}
      </ul>
    </Pagina>
  )
}
