import Link from 'next/link'
import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import PainelPacote from '@/components/catalogo/PainelPacote'
import { CompraNoTopo } from '@/components/catalogo/SemPacote'
import { H2 } from '@/components/catalogo/Titulos'
import FiltroBpm from '@/components/FiltroBpm'
import { Aviso } from '@/components/ds'
import { songs } from '@/lib/catalog'
import { ESTILOS, ordenarTons, tomEBpm } from '@/lib/catalogo-lista'
import { plano } from '@/lib/catalogo-util'
import { OG_IMAGEM, site } from '@/lib/site'
import { ldJson, escapeHtml } from '@/lib/safe'

// Tabela de BPM e tom (item 4.2 do plano de SEO). Só entram músicas com BPM
// confirmado na ficha (arquivo do acervo ou MultiTracks). Página estática: a
// lista é montada no build.
const ordem = new Intl.Collator('pt-BR', { sensitivity: 'base' })
const linhas = songs
  .map((s) => {
    const [tom, bpm] = tomEBpm(s.slug)
    return { s, tom, bpm }
  })
  .filter(({ bpm }) => bpm)
  .sort((a, b) => ordem.compare(a.s.title, b.s.title))

// Cada linha leva os dados do filtro em atributos (ver FiltroBpm). O estilo das
// células fica na <table> (variantes `[&_td…]`), e não repetido nas 1.100+ linhas.
const CORPO = linhas
  .map(
    ({ s, bpm, tom }) =>
      `<tr data-bpm="${bpm}" data-busca="${escapeHtml(plano(`${s.title} ${s.artist}`))}" ` +
      `data-artistas="${escapeHtml(`|${s.artist}|${s.tambem ? `${s.tambem}|` : ''}`)}" ` +
      `data-estilo="${escapeHtml(s.categoria)}" data-tom="${escapeHtml(tom)}">` +
      `<td><a href="/musicas/${encodeURIComponent(s.slug)}">${escapeHtml(s.title)}</a></td>` +
      `<td>${escapeHtml(s.artist)}</td>` +
      `<td>${escapeHtml(s.categoria)}</td>` +
      `<td>${escapeHtml(tom)}</td>` +
      `<td>${Number(bpm)}</td></tr>`
  )
  .join('')

// Arredonda para baixo na centena: "1.100+" só enquanto houver pelo menos 1.100.
const marca = `${(Math.floor(linhas.length / 100) * 100).toLocaleString('pt-BR')}+`
const title = `BPM e tom das músicas gospel: tabela com ${marca} louvores | Trilha Viva`
const description = `BPM e tom original de ${marca} louvores gospel, com busca por música ou artista e filtro por andamento. Cada um com a multitrack (VS) no acervo Trilha Viva.`

export const metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/bpm' },
  openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/bpm` },
}

const ld = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Início', item: site.url },
    { '@type': 'ListItem', position: 2, name: 'BPM e tom', item: `${site.url}/bpm` },
  ],
}

// Colunas: Música, Artista, Estilo, Tom, BPM. Tom e BPM alinhados à direita.
const TABELA =
  'w-full min-w-[560px] border-collapse text-[15px] tabular-nums ' +
  '[&_td]:px-3 [&_td]:py-3 [&_tbody_tr]:h-[52px] [&_tbody_tr]:border-b [&_tbody_tr]:border-line [&_tbody_tr:hover]:bg-surface ' +
  '[&_td:nth-child(1)]:font-semibold [&_td:nth-child(2)]:text-text-2 [&_td:nth-child(3)]:text-text-2 ' +
  '[&_td:nth-child(n+4)]:text-right [&_td:nth-child(n+4)]:font-semibold ' +
  '[&_td_a]:no-underline [&_td_a]:underline-offset-[3px] [&_td_a:hover]:underline'
const TH = 'h-12 border-b border-ink px-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-text-2 whitespace-nowrap'

export default function BpmPage() {
  const artistas = [...new Set(linhas.flatMap(({ s }) => (s.tambem ? [s.artist, s.tambem] : [s.artist])))].sort(
    ordem.compare
  )
  const tons = ordenarTons(linhas.map(({ tom }) => tom))

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <Pagina>
        <CabecaPagina
          migalhas={[{ href: '/', label: 'Início' }, { href: '/musicas', label: 'Acervo' }, { label: 'BPM e tom' }]}
          titulo="BPM e tom das músicas"
          intro="O andamento e o tom de cada VS do acervo, para montar o setlist sem surpresa. Clique no nome para ver os canais."
          acao={<CompraNoTopo />}
        />
        <Aviso variante="info">
          Os valores são da versão original. Tom e BPM podem ser alterados no seu programa (DAW).{' '}
          <Link href="/como-usar#mudar-tom-e-bpm" className="font-semibold underline underline-offset-4">
            Veja como
          </Link>
          .
        </Aviso>

        <FiltroBpm tabelaId="tabela-bpm" artistas={artistas} estilos={ESTILOS} tons={tons} />

        <div className="overflow-x-auto border-t border-ink">
          <table id="tabela-bpm" className={TABELA}>
            <caption className="sr-only">BPM e tom das músicas do acervo</caption>
            <thead>
              <tr>
                <th scope="col" className={`${TH} text-left`}>Música</th>
                <th scope="col" className={`${TH} text-left`}>Artista</th>
                <th scope="col" className={`${TH} text-left`}>Estilo</th>
                <th scope="col" className={`${TH} text-right`}>Tom</th>
                <th scope="col" className={`${TH} text-right`}>BPM</th>
              </tr>
            </thead>
            {/* As 1.100+ linhas vão como HTML pronto: o React não hidrata linha por
                linha (eram 1,8 s de travamento no celular). Todo texto passa por escapeHtml. */}
            <tbody dangerouslySetInnerHTML={{ __html: CORPO }} />
          </table>
        </div>

        <section aria-labelledby="o-que-e-bpm" className="flex max-w-[760px] flex-col gap-3">
          <H2 id="o-que-e-bpm" pequeno>
            O que é BPM
          </H2>
          <p className="text-[17px] leading-[1.6] text-text-2">
            BPM é o andamento da música: quantas batidas por minuto. É o número que o baterista coloca no clique para
            a banda inteira tocar no mesmo tempo, e é também o que ajuda a montar o setlist, alternando músicas
            rápidas e lentas.
          </p>
        </section>

        <PainelPacote
          titulo={`Todas estas músicas vêm no pacote com mais de ${site.totalTracks.toLocaleString('pt-BR')} multitracks.`}
          selos={false}
          className="max-w-[560px]"
        />
      </Pagina>
    </>
  )
}
