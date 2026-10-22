import Link from 'next/link'
import { Breadcrumbs, Faq } from '@/components/ui'
import VsGratisForm from '@/components/VsGratisForm'
import { getSong } from '@/lib/catalog'
import { getFicha } from '@/lib/ficha'
import { linhaDaFicha } from '@/lib/textos-musica'
import { site, priceBRL } from '@/lib/site'
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
  openGraph: { title, description, url: `${site.url}/vs-gratis` },
}

const perguntas = [
  { q: 'Preciso pagar algo?', a: 'Não. A VS é grátis: você só informa nome, e-mail e WhatsApp, e o download é liberado na hora.' },
  {
    q: 'Em quanto tempo chega?',
    a: 'Na hora. O botão de download aparece assim que você envia o formulário, e o mesmo link chega no seu e-mail, valendo por 7 dias.',
  },
  { q: 'Posso usar no culto?', a: 'Pode. É uma multitrack completa, com clique e guia, pronta para o ensaio e para o culto.' },
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
      <section className="bg-ink text-white">
        <div className="shell pb-16 pt-12 sm:pb-24">
          <div className="[&_a]:text-white/60 [&_span]:text-white/80">
            <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'VS grátis' }]} />
          </div>
          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16">
            <div>
              <h1 className="text-d1 text-white [text-wrap:balance]">Baixe grátis uma VS completa.</h1>
              <p className="mt-6 max-w-xl text-[18px] leading-[1.65] text-white/70">
                <Link href={`/musicas/${SLUG_GRATIS}`} className="font-semibold text-white hover:underline">
                  {song.title}
                </Link>{' '}
                — {song.artist}. Com clique, guia e cada instrumento em um canal separado.
              </p>
              {linha.length > 0 && <p className="figs mt-7 text-[18px] font-bold text-white">{linha.join(' · ')}</p>}
            </div>
            <VsGratisForm />
          </div>
        </div>
      </section>

      <div className="shell">
        {ficha?.canais?.length > 0 && (
          <section className="pt-16 sm:pt-20" aria-labelledby="arquivo-titulo">
            <h2 id="arquivo-titulo" className="text-d3 text-ink">
              O que vem no arquivo
            </h2>
            <ul className="mt-6 flex max-w-2xl flex-wrap gap-2">
              {ficha.canais.map((c) => (
                <li
                  key={c}
                  className={
                    c === 'Clique' || c === 'Guia'
                      ? 'border border-signal px-3 py-1.5 text-[14.5px] font-semibold text-signal-deep'
                      : 'border border-line px-3 py-1.5 text-[14.5px] text-ink-muted'
                  }
                >
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-16 flex flex-wrap items-center justify-between gap-6 border-y-2 border-ink py-8 sm:mt-20">
          <p className="max-w-2xl text-[19px] font-bold tracking-[-0.015em] text-ink">
            Gostou? Essa é 1 de mais de {site.totalTracks.toLocaleString('pt-BR')}. Leve o acervo inteiro por{' '}
            {priceBRL(site.price)}.
          </p>
          <Link href="/assinar" className="btn-ink">
            Ver o pacote completo
          </Link>
        </section>

        <section className="pt-16 sm:pt-20" aria-labelledby="faq-titulo">
          <h2 id="faq-titulo" className="text-d3 text-ink">
            Dúvidas sobre a VS grátis
          </h2>
          <Faq items={perguntas} className="mt-8 max-w-4xl" />
        </section>
      </div>
    </>
  )
}
