import Link from 'next/link'
import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import SemPacote from '@/components/catalogo/SemPacote'
import { H2 } from '@/components/catalogo/Titulos'
import VsGratisForm from '@/components/VsGratisForm'
import Canais from '@/components/Canais'
import { canaisDoQuadro } from '@/components/ficha/canais'
import { BotaoCompra, ListaSanfona } from '@/components/ds'
import { getSong } from '@/lib/catalog'
import { getFicha } from '@/lib/ficha'
import { linhaDaFicha } from '@/lib/textos-musica'
import { OG_IMAGEM, site, priceBRL } from '@/lib/site'
import { ldJson } from '@/lib/safe'

// A VS grátis do site (item 5 do plano de SEO). É a mesma música que o Zorcha
// dá no Instagram, mas o link do Instagram (Drive) continua separado e intocado.
const SLUG_GRATIS = 'a-alegria-o-exercito-de-deus-caiam-por-terra-autoridade-e-poder-morada'

const title = 'VS Grátis: A Alegria + O Exército de Deus (Morada) | Trilha Viva'
const description =
  'Baixe grátis a multitrack A Alegria + O Exército de Deus + Caiam por Terra + Autoridade e Poder, com clique, guia e canais separados.'

export const metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/vs-gratis' },
  openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/vs-gratis` },
}

const perguntas = [
  { q: 'Preciso pagar algo?', a: 'Não. A VS é grátis: você só informa nome, e-mail e WhatsApp, e o download é liberado na hora.' },
  {
    q: 'Em quanto tempo chega?',
    a: 'Na hora. O botão de download aparece assim que você envia o formulário, e o mesmo link chega no seu e-mail, valendo por 7 dias.',
  },
  { q: 'Posso usar no culto?', a: 'Pode. É uma multitrack completa, com clique e guia, pronta para o ensaio e para o culto.' },
]

const VANTAGENS = [
  ['Uma multitrack completa,', 'com os mesmos canais do pacote.'],
  ['Clique e guia separados,', 'para testar o fone da equipe.'],
  ['Gostou?', `As outras 2.000 vêm no pacote por ${priceBRL(site.price)}.`],
]

export default function VsGratisPage() {
  const song = getSong(SLUG_GRATIS)
  const ficha = getFicha(SLUG_GRATIS)
  const linha = linhaDaFicha(ficha)
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: perguntas.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <Pagina largura={1080} espaco="clamp(28px,4cqi,44px)">
        <CabecaPagina
          migalhas={[{ href: '/', label: 'Início' }, { label: 'VS grátis' }]}
          titulo="Baixe uma VS grátis"
          intro="Receba no e-mail uma multitrack completa, com clique, guia e canais separados, para testar na sua igreja."
          grande
        />

        <div className="flex flex-wrap items-start gap-x-16 gap-y-8">
          <VsGratisForm />
          <div className="flex flex-[1_1_300px] flex-col gap-4">
            <ul className="m-0 flex list-none flex-col border-b border-line p-0">
              {VANTAGENS.map(([forte, resto]) => (
                <li key={forte} className="border-t border-line py-3.5 text-[16px] leading-[1.5]">
                  <strong className="font-[650]">{forte}</strong> {resto}
                </li>
              ))}
            </ul>
            <SemPacote>
              <BotaoCompra className="self-start" />
            </SemPacote>
          </div>
        </div>

        <section aria-labelledby="arquivo-titulo" className="flex flex-col gap-3.5 border-t border-line pt-6">
          <H2 id="arquivo-titulo">O que vem no arquivo</H2>
          <p className="max-w-[680px] text-[17px] leading-[1.6] text-text-2">
            <Link href={`/musicas/${SLUG_GRATIS}`} className="font-semibold text-ink underline underline-offset-4">
              {song.title}
            </Link>{' '}
            — {song.artist}. Com clique, guia e cada instrumento em um canal separado.
            {linha.length > 0 && <span className="figs mt-2 block font-semibold text-ink">{linha.join(' · ')}</span>}
          </p>
          {ficha?.canais?.length > 0 && (
            <div className="max-w-[520px]">
              <Canais musica={song.title} artista={song.artist} canais={canaisDoQuadro(ficha.canais)} tema="claro" />
            </div>
          )}
        </section>

        <section aria-labelledby="faq-titulo" className="flex flex-col gap-3.5">
          <H2 id="faq-titulo">Dúvidas sobre a VS grátis</H2>
          <ListaSanfona itens={perguntas.map((f) => ({ titulo: f.q, conteudo: f.a }))} className="max-w-4xl" />
        </section>
      </Pagina>
    </>
  )
}
