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
    <div className="shell pb-12 pt-12">
      <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Liberar acesso' }]} />

      {cancelado && (
        <p className="mt-6 border border-line bg-white px-5 py-4 text-[14.5px] text-ink-muted">
          O pagamento foi cancelado e nada foi cobrado. Quando quiser, é só continuar de onde parou.
        </p>
      )}

      <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_420px] lg:gap-20">
        <div>
          <p className="inline-block bg-signal px-3 py-1.5 text-[13.5px] font-bold text-ink">
            {discountPct}% de desconto no lançamento
          </p>
          <h1 className="mt-6 font-bold text-[38px] leading-[1.08] text-ink sm:text-[52px]">
            Um pagamento.
            <br />
            O acervo inteiro.
          </h1>
          <p className="mt-6 max-w-text text-[17.5px] leading-[1.7] text-ink-muted">
            Sem mensalidade, sem crédito por música e sem escolher faixa a faixa. Você paga uma vez
            e leva os {site.totalTracks.toLocaleString('pt-BR')} multitracks — com o link liberado na
            hora, assim que o pagamento for confirmado.
          </p>

          <ul className="mt-12 grid gap-x-12 divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-y-0">
            {inclui.map((t) => (
              <li
                key={t}
                className="flex items-start gap-3 py-3 text-[15px] leading-[1.6] text-ink-muted"
              >
                <Check className="mt-[6px] shrink-0 text-signal" />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-14 grid gap-x-12 gap-y-8 sm:grid-cols-3">
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
              <div key={b.t}>
                <h2 className="font-bold text-[18px] text-ink">{b.t}</h2>
                <p className="mt-2 text-[14px] leading-[1.65] text-ink-muted">{b.d}</p>
              </div>
            ))}
          </div>

          <p className="mt-14 text-[14.5px] text-ink-muted">
            Ainda com dúvida?{' '}
            <Link href="/faq" className="link-quiet">
              Veja as perguntas frequentes
            </Link>{' '}
            ou{' '}
            <Link href="/como-usar" className="link-quiet">
              entenda como usar o multitrack
            </Link>
            .
          </p>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="border border-line bg-white p-8">
            <div className="flex items-end gap-3">
              <span className="text-[15px] text-ink-muted line-through">
                {priceBRL(site.fullPrice)}
              </span>
              <span className="bg-signal px-2 py-1 text-[12.5px] font-bold text-ink">-{discountPct}%</span>
            </div>
            <p className="mt-2 font-bold text-[46px] leading-none text-ink">
              {priceBRL(site.price)}
            </p>
            <p className="mt-3 text-[14px] text-ink-muted">
              Pagamento único · acesso vitalício · Pix ou cartão
            </p>

            <div className="my-8 h-px bg-line" />

            <CheckoutForm />
          </div>

          <p className="mt-5 text-center text-[12.5px] text-ink-muted">
            Conexão criptografada · Stripe · Garantia de 7 dias
          </p>
        </div>
      </div>
    </div>
  )
}
