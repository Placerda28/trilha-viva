import Link from 'next/link'
import { Breadcrumbs, Faq } from '@/components/ui'
import { faq } from '@/lib/faq'
import { site, priceBRL } from '@/lib/site'

export const metadata = {
  title: 'Dúvidas frequentes sobre multitracks gospel',
  description:
    'O que é multitrack (VS), como recebo o acesso, quais programas usar, funciona no tablet, dá para mudar o tom e como funciona a garantia de 7 dias.',
  alternates: { canonical: '/faq' },
}

const ld = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export default function FaqPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="shell max-w-4xl pt-12">
        <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Dúvidas' }]} />

        <header className="mt-8 max-w-2xl border-b border-line pb-12">
          <h1 className="font-display text-[36px] font-normal leading-[1.1] text-ink sm:text-[48px]">
            Dúvidas frequentes
          </h1>
          <p className="mt-5 text-[17px] leading-[1.7] text-ink-muted">
            Se a sua pergunta não estiver aqui, é só escrever para{' '}
            <span className="text-ink">{site.email}</span> — respondemos todo mundo.
          </p>
        </header>

        <div className="mt-12">
          {faq
            .filter((f) => f.id)
            .map((f) => (
              <span key={f.id} id={f.id} className="block scroll-mt-24" />
            ))}
          <Faq items={faq} />
        </div>

        <div className="mt-16 border-b border-line pb-16 text-center">
          <h2 className="display text-[28px] sm:text-[34px]">Pronto para liberar o acervo?</h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] leading-[1.7] text-ink-muted">
            Mais de {site.totalTracks.toLocaleString('pt-BR')} multitracks gospel por{' '}
            {priceBRL(site.price)}, pagamento único.
          </p>
          <Link href="/assinar" className="btn-accent mt-8">
            Quero meu acesso
          </Link>
        </div>
      </div>
    </>
  )
}
