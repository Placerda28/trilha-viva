import CheckoutForm from '@/components/CheckoutForm'
import BarraCompra from '@/components/BarraCompra'
import AvisoCancelado from '@/components/AvisoCancelado'
import { SessionMini } from '@/components/Track'
import { Breadcrumbs, Check, Faq, Icone } from '@/components/ui'
import { destaques } from '@/lib/catalog'
import { site, priceBRL, discountPct } from '@/lib/site'

export const metadata = {
  title: 'Liberar acesso ao pacote de 2.000 Multitracks Gospel',
  description:
    'Pagamento único de R$ 89,90 (de R$ 899,00) no Pix ou no cartão. Acesso vitalício a mais de 2.000 multitracks gospel com clique, guia e canais separados. Liberação imediata.',
  alternates: { canonical: '/assinar' },
  openGraph: {
    title: 'Pacote único — 2.000 Multitracks Gospel | Trilha Viva',
    description: 'R$ 89,90 no Pix ou no cartão. Acesso vitalício e liberação imediata.',
    url: `${site.url}/assinar`,
  },
}

// A conta do preço por música: 89,90 ÷ 2.000 = 0,045. Calculada a partir do
// preço e do número do pacote, para acompanhar se um dos dois mudar.
const porMusica = site.price / site.totalTracks
const porMusicaTeto = Math.ceil(porMusica * 100) / 100
const contaPorMusica =
  porMusicaTeto > porMusica
    ? `Menos de ${priceBRL(porMusicaTeto)} por música.`
    : `${priceBRL(porMusicaTeto)} por música.`

// Só o que é verdade hoje: pagamento pelo Mercado Pago (desde 23/09/2026),
// acesso liberado quando o pagamento é aprovado, cartão em até 12 parcelas
// (installments: 12 em lib/mercadopago.js).
const confianca = [
  ['cadeado', 'Pagamento seguro pelo Mercado Pago'],
  ['raio', 'Acesso liberado na hora'],
  ['cartao', 'Pix ou cartão em até 12x'],
]
const meios = ['Pix', 'Visa', 'Mastercard', 'Elo']

const grupos = [
  {
    titulo: 'O acervo',
    itens: [
      `Mais de ${site.totalTracks.toLocaleString('pt-BR')} multitracks gospel`,
      'Novas trilhas somadas ao acervo',
    ],
  },
  {
    titulo: 'Cada música',
    itens: [
      'Clique e guia em canais separados',
      'Bateria, baixo, teclado, guitarra, pads e vocais isolados',
      'Arquivos em WAV e MP3',
      'Pronto para mudar o tom',
    ],
  },
  {
    titulo: 'Onde usar',
    itens: ['REAPER, Ableton Live, Prime e tablet', 'Acesso vitalício, sem mensalidade'],
  },
]

const passos = [
  ['Paga no Pix ou no cartão', 'O pagamento é feito no ambiente do Mercado Pago.'],
  ['Recebe o acesso no e-mail', 'Aprovou, o link para criar a senha chega na hora.'],
  ['Baixa música por música', 'Entra na área do acervo e baixa o que for usar.'],
]

const perguntas = [
  {
    q: 'Precisa pagar mensalidade?',
    a: `Não. É um pagamento único de ${priceBRL(site.price)} e o acesso é vitalício, sem renovação.`,
  },
  {
    q: 'Em quanto tempo recebo?',
    a: 'Na hora. No Pix e no cartão a confirmação é imediata: você volta ao site, cria sua senha e o acervo abre. O link para criar a senha também vai para o e-mail que você informou.',
  },
  {
    q: 'Funciona no meu programa?',
    a: 'Os arquivos são WAV e MP3 comuns, organizados por música, e abrem em qualquer programa de áudio: REAPER, Ableton Live, Waveform, Cantabile e o Prime no iPad.',
  },
  {
    q: 'Posso baixar quantas vezes?',
    a: 'O acesso é vitalício, então você pode voltar e baixar de novo sempre que precisar. Existe só um limite diário: até 30 downloads por dia em cada conta, para proteger o acervo de contas repassadas.',
  },
]

/** O card de preço em painel preto. Aparece no topo e, no celular, de novo no fim. */
function CardPreco({ id, pedirNome = false }) {
  return (
    <section id={id} aria-label="Preço e pagamento" className="panel scroll-mt-24 p-5 sm:p-7">
      <p className="chip">{discountPct}% de desconto no lançamento</p>

      <p className="figs mt-3 text-[15px] text-white/60">
        de <span className="line-through">{priceBRL(site.fullPrice)}</span>
      </p>
      <p className="figs mt-0.5 text-[44px] font-extrabold leading-none tracking-[-0.03em] text-white">
        {priceBRL(site.price)}
      </p>
      <p className="mt-1.5 text-[14px] text-white/75">pagamento único, acesso vitalício</p>
      <p className="mt-1.5 flex items-center gap-2.5 text-[15px] font-semibold text-white">
        <Check tone="light" className="shrink-0" />
        {contaPorMusica}
      </p>

      <div className="mt-4">
        <CheckoutForm tom="escuro" rotulo="Quero meu acesso" pedirNome={pedirNome} />
      </div>

      <ul className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center">
        {confianca.map(([icone, texto]) => (
          <li key={texto} className="flex flex-col items-center gap-2">
            <Icone nome={icone} />
            <span className="text-[12.5px] leading-[1.35] text-white/80">{texto}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="sr-only">Formas de pagamento aceitas:</span>
        {meios.map((m) => (
          <span
            key={m}
            className="rounded-sm border border-white/20 px-2 py-1 text-[12px] font-semibold leading-none text-white/80"
          >
            {m}
          </span>
        ))}
      </div>
    </section>
  )
}

export default function AssinarPage() {
  return (
    <div className="shell pb-12 pt-3 sm:pt-8">
      <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Liberar acesso' }]} />
      <AvisoCancelado />

      <div className="mt-3 grid gap-y-4 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-16 lg:gap-y-10">
        <header className="min-w-0 lg:col-start-1">
          <h1 className="text-[clamp(2.2rem,9.5vw,2.6rem)] font-extrabold leading-[1.04] tracking-[-0.02em] text-ink lg:text-[52px]">
            Um pagamento.
            <br />
            O acervo inteiro.
          </h1>
          <p className="mt-2 max-w-text text-[16.5px] leading-[1.5] text-ink-muted sm:mt-4 sm:text-[17.5px]">
            {site.totalTracks.toLocaleString('pt-BR')} multitracks gospel, liberados na hora, sem
            mensalidade.
          </p>
        </header>

        {/* No celular o card vem logo depois do título; no computador ele fica
            fixo na coluna da direita enquanto o resto rola. */}
        <aside className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-24">
            <CardPreco id="comprar" />
          </div>
        </aside>

        <div className="min-w-0 lg:col-start-1">
          {/* O produto */}
          <div className="panel mt-5 p-3 sm:p-5 lg:mt-0">
            <p className="mb-3 px-1 text-[15px] font-semibold text-white">
              É isso que você recebe em cada música.
            </p>
            <SessionMini song={destaques[0]} />
          </div>

          {/* O que vem no pacote */}
          <h2 className="mt-12 text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
            O que vem no pacote
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {grupos.map((g) => (
              <div key={g.titulo} className="card-cut p-5">
                <h3 className="text-[18px] font-bold tracking-[-0.015em] text-ink">{g.titulo}</h3>
                <ul className="mt-3 space-y-2.5">
                  {g.itens.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[15px] leading-[1.5] text-ink-muted">
                      <Check className="mt-[7px] shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Como funciona: aqui a numeração é real, é uma sequência */}
          <h2 className="mt-12 text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
            Como funciona
          </h2>
          <ol className="mt-5 divide-y divide-line border-y border-line">
            {passos.map(([t, d], i) => (
              <li key={t} className="flex gap-4 py-4">
                <span className="figs w-5 shrink-0 text-[20px] font-extrabold leading-[1.3] text-signal-deep">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-[17px] font-bold leading-snug text-ink">{t}</span>
                  <span className="mt-1 block text-[15px] leading-[1.55] text-ink-muted">{d}</span>
                </span>
              </li>
            ))}
          </ol>

          {/* Dúvidas */}
          <h2 className="mt-12 text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
            Dúvidas rápidas
          </h2>
          <Faq items={perguntas} className="mt-4" />
        </div>
      </div>

      {/* Fim da página, só no celular (no computador o card do topo continua
          visível na coluna da direita). */}
      <div className="mt-12 lg:hidden">
        <h2 className="mb-4 text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
          Pronto para o domingo?
        </h2>
        <CardPreco id="comprar-fim" />
      </div>

      <BarraCompra inicio="comprar" fim="comprar-fim" href="#comprar" />
    </div>
  )
}
