import Link from 'next/link'
import { Breadcrumbs } from '@/components/ui'
import FiltroBpm from '@/components/FiltroBpm'
import { songs } from '@/lib/catalog'
import { getFicha } from '@/lib/ficha'
import { site, priceBRL } from '@/lib/site'
import { ldJson } from '@/lib/safe'

// Tabela de BPM e tom (item 4.2 do plano de SEO). Só entram músicas com BPM
// confirmado na ficha (arquivo do acervo ou MultiTracks). Página estática: a
// lista é montada no build.
const ordem = new Intl.Collator('pt-BR', { sensitivity: 'base' })
const plano = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const linhas = songs
  .map((s) => ({ s, f: getFicha(s.slug) }))
  .filter(({ f }) => f?.bpm)
  .sort((a, b) => ordem.compare(a.s.title, b.s.title))

// Arredonda para baixo na centena: "1.100+" só enquanto houver pelo menos 1.100.
const marca = `${(Math.floor(linhas.length / 100) * 100).toLocaleString('pt-BR')}+`
const title = `BPM e tom das músicas gospel: tabela com ${marca} louvores | Trilha Viva`
const description = `BPM e tom original de ${marca} louvores gospel, com busca por música ou artista e filtro por andamento. Cada um com a multitrack (VS) no acervo Trilha Viva.`

export const metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/bpm' },
  openGraph: { title, description, url: `${site.url}/bpm` },
}

const ld = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Início', item: site.url },
    { '@type': 'ListItem', position: 2, name: 'BPM e tom', item: `${site.url}/bpm` },
  ],
}

export default function BpmPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <div className="shell pt-12">
        <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'BPM e tom' }]} />
        <header className="mt-8 max-w-3xl">
          <h1 className="text-d1 text-ink">BPM e tom dos louvores</h1>
          <p className="mt-6 max-w-text font-read text-[18px] leading-[1.7] text-ink-muted">
            BPM é o andamento da música: quantas batidas por minuto. É o número que o baterista coloca no
            clique para a banda inteira tocar no mesmo tempo, e é também o que ajuda a montar o setlist,
            alternando músicas rápidas e lentas.
          </p>
          <p className="mt-5 border border-ink px-4 py-3 text-[15px] leading-[1.6] text-ink">
            Os valores são da versão original. Tom e BPM podem ser alterados no seu programa (DAW).{' '}
            <Link href="/como-usar#mudar-tom-e-bpm" className="link-quiet font-semibold">
              Veja como →
            </Link>
          </p>
        </header>

        <div className="mt-10">
          <FiltroBpm tabelaId="tabela-bpm" />
        </div>

        <div className="mt-6 overflow-x-auto border-t-2 border-ink">
          <table id="tabela-bpm" className="w-full min-w-[640px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-line text-[13px] text-ink-muted">
                <th scope="col" className="py-3 pr-4 font-semibold">Música</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Artista</th>
                <th scope="col" className="py-3 pr-4 font-semibold">BPM</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Tom original</th>
                <th scope="col" className="py-3 font-semibold"><span className="sr-only">Link</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {linhas.map(({ s, f }) => (
                <tr key={s.slug} data-bpm={f.bpm} data-busca={plano(`${s.title} ${s.artist}`)}>
                  <td className="py-2.5 pr-4 font-semibold text-ink">{s.title}</td>
                  <td className="py-2.5 pr-4 text-ink-muted">{s.artist}</td>
                  <td className="figs py-2.5 pr-4 text-ink">{f.bpm}</td>
                  <td className="py-2.5 pr-4 text-ink">{f.tom || ''}</td>
                  <td className="py-2.5 text-right">
                    <Link href={`/musicas/${s.slug}`} className="link-quiet text-[14px] font-semibold">
                      Ver VS
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel mt-16 p-8 sm:p-11">
          <p className="chip">Não vendemos por música</p>
          <h2 className="text-d3 mt-6 text-white">
            Todas estas músicas vêm no pacote com mais de {site.totalTracks.toLocaleString('pt-BR')} multitracks.
          </h2>
          <div className="mt-8">
            <Link href="/assinar" className="btn-signal">
              Liberar acesso vitalício por {priceBRL(site.price)}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
