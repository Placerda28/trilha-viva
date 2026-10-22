import Link from 'next/link'
import { Breadcrumbs } from '@/components/ui'
import { site } from '@/lib/site'
import colecoes from '@/data/colecoes.json'

const title = 'Coleções de multitracks por momento do culto'
const description = 'Multitracks gospel (VS) separadas por ocasião: Natal e outros momentos do culto, com BPM, tom e setlist sugerido.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/colecoes' },
  openGraph: { title, description, url: `${site.url}/colecoes` },
}

export default function ColecoesPage() {
  return (
    <div className="shell max-w-4xl pt-12">
      <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Coleções' }]} />
      <header className="mt-8 border-b border-line pb-12">
        <h1 className="text-d1 text-ink">Coleções</h1>
        <p className="mt-6 max-w-text font-read text-[18px] leading-[1.7] text-ink-muted">
          Repertórios montados por ocasião, com o BPM e o tom de cada música e uma sugestão de setlist.
        </p>
      </header>
      <ul className="divide-y divide-line border-b border-line">
        {Object.entries(colecoes).map(([slug, c]) => (
          <li key={slug}>
            <Link href={`/colecoes/${slug}`} className="group block py-7">
              <span className="block text-[21px] font-bold tracking-[-0.015em] text-ink group-hover:underline">
                {c.nome}
              </span>
              <span className="mt-1.5 block text-[15.5px] text-ink-muted">{c.musicas.length} músicas</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
