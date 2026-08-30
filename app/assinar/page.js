import Link from 'next/link'
import CheckoutForm from '@/components/CheckoutForm'
import { Breadcrumbs, Check } from '@/components/ui'
import { site, priceBRL, discountPct } from '@/lib/site'

export const metadata = {
  title: 'Liberar acesso ao pacote de 4.000 Multitracks Gospel',
  description:
    'Pagamento único de R$ 89,90 (de R$ 899,00) com Pix ou cartão. Acesso vitalício a mais de 4.000 multitracks gospel com clique, guia e canais separados. Liberação imediata.',
  alternates: { canonical: '/assinar' },
  openGraph: {
    title: 'Pacote único — 4.000 Multitracks Gospel | Trilha Viva',
    description: 'R$ 89,90 no Pix ou cartão. Acesso vitalício e liberação imediata.',
    url: `${site.url}/assinar`,
  },
}

const inclui = [
  'Mais de 4.000 multitracks gospel (VS)',
  'Clique e guia em canais separados',
  'Bateria, baixo, teclado, guitarra, pads e vocais isolados',
  'Arquivos WAV e MP3 organizados por música',
  'Preparado para transposição de tom',
  'Compatível com REAPER, Ableton Live, Prime e tablet',
  'Acesso vitalício, sem mensalidade',
  'Novas trilhas somadas ao acervo',
]

export default async function AssinarPage({ searchParams }) {
  const sp = await searchParams
  const cancelado = sp?.cancelado

  return (
    <div className="shell pb-10 pt-10">
      <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Liberar acesso' }]} />

      {cancelado && (
        <p className="mt-6 rounded-xl border border-line bg-surface px-5 py-4 text-[14.5px] text-ink-muted">
          O pagamento foi cancelado e nada foi cobrado. Quando quiser, é só continuar de onde parou.
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_440px] lg:gap-14">
        <div>
          <span className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-flame-500" />
            Oferta de lançamento · -{discountPct}%
          </span>
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.06] tracking-[-0.042em] text-ink sm:text-[50px]">
            Um pagamento.
            <br />
            O acervo inteiro.
          </h1>
          <p className="mt-5 max-w-xl text-[17.5px] leading-[1.62] text-ink-muted">
            Sem mensalidade, sem crédito por música e sem escolher faixa a faixa. Você paga uma vez
            e leva os {site.totalTracks.toLocaleString('pt-BR')} multitracks — com o link liberado na
            hora, assim que o pagamento for confirmado.
          </p>

          <ul className="mt-10 grid gap-3.5 sm:grid-cols-2">
            {inclui.map((t) => (
              <li key={t} className="flex items-start gap-3 text-[15px] leading-[1.55] text-ink-muted">
                <Check className="mt-0.5 shrink-0 text-flame-500" />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              {
                t: 'Liberação imediata',
                d: 'Pagou, a página já mostra o link do acervo e o e-mail chega em seguida.',
              },
              {
                t: 'Garantia de 7 dias',
                d: 'Não gostou? Responde o e-mail da compra e devolvemos tudo.',
              },
              {
                t: 'Pagamento seguro',
                d: 'Processado pela Stripe. Não temos acesso aos dados do seu cartão.',
              },
            ].map((b) => (
              <div key={b.t} className="card p-5">
                <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">{b.t}</h2>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-muted">{b.d}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-[14px] text-ink-faint">
            Ainda com dúvida?{' '}
            <Link href="/faq" className="font-medium text-brand-600 hover:text-brand-700">
              Veja as perguntas frequentes
            </Link>{' '}
            ou{' '}
            <Link href="/como-usar" className="font-medium text-brand-600 hover:text-brand-700">
              entenda como usar o multitrack
            </Link>
            .
          </p>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[24px] border border-line bg-white p-7 shadow-lift sm:p-8">
            <div className="flex items-end gap-3">
              <span className="text-[15px] text-ink-faint line-through">
                {priceBRL(site.fullPrice)}
              </span>
              <span className="rounded-full bg-flame-500 px-2.5 py-1 text-[11.5px] font-bold text-white">
                -{discountPct}%
              </span>
            </div>
            <p className="mt-1 text-[46px] font-extrabold leading-none tracking-[-0.045em] text-ink">
              {priceBRL(site.price)}
            </p>
            <p className="mt-2 text-[14px] text-ink-muted">
              Pagamento único · acesso vitalício · Pix ou cartão
            </p>

            <div className="my-7 h-px bg-line" />

            <CheckoutForm />
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-[12.5px] text-ink-faint">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M7 1l5 2v4c0 3.2-2.1 5.5-5 6-2.9-.5-5-2.8-5-6V3z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
            Conexão criptografada · Stripe · Garantia de 7 dias
          </div>
        </div>
      </div>
    </div>
  )
}
