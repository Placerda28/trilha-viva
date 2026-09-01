import Link from 'next/link'
import TabletMockup from '@/components/TabletMockup'
import { SectionHead, SongCard, Faq, Check, Figure } from '@/components/ui'
import { songs, artists } from '@/lib/catalog'
import { site, includes, priceBRL, discountPct } from '@/lib/site'
import { tools, usos, steps } from '@/lib/tools'
import { faq } from '@/lib/faq'

export const metadata = {
  title: 'Multitracks Gospel: 4.000 VS com clique e guia | Trilha Viva',
  description:
    'Pacote único com mais de 4.000 multitracks gospel (VS) — clique, guia e canais separados, em todos os tons. Acesso vitalício por R$ 89,90, sem mensalidade.',
  alternates: { canonical: '/' },
}

const destaques = songs.slice(0, 12)

// "R$ 89,90" quebrado em reais e centavos para o preço grande do topo,
// sempre derivado de site.price — não repetir o número na mão.
const [precoReais, precoCentavos] = site.price.toFixed(2).split('.')

const productLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Trilha Viva — Pacote Completo com 4.000 Multitracks Gospel',
  description: site.description,
  brand: { '@type': 'Brand', name: 'Trilha Viva' },
  category: 'Multitracks Gospel',
  image: [`${site.url}/opengraph-image`],
  offers: {
    '@type': 'Offer',
    url: `${site.url}/assinar`,
    price: site.price.toFixed(2),
    priceCurrency: 'BRL',
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    priceValidUntil: '2027-12-31',
    seller: { '@type': 'Organization', name: 'Trilha Viva' },
  },
}

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.slice(0, 8).map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([productLd, faqLd]) }}
      />

      {/* HERO */}
      <section className="relative">
        <div className="relative min-h-[560px] overflow-hidden bg-ink sm:min-h-[640px] lg:min-h-[720px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/louvor-congregacao.webp"
            alt="Igreja reunida em louvor, com as mãos levantadas diante da banda no palco"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(12,10,9,.94) 0%, rgba(12,10,9,.80) 42%, rgba(12,10,9,.30) 78%, rgba(12,10,9,.55) 100%)',
            }}
          />

          <div className="shell relative flex min-h-[560px] items-center py-20 sm:min-h-[640px] lg:min-h-[720px]">
            <div className="max-w-2xl animate-rise">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-accent-soft">
                Acervo completo · acesso vitalício · sem mensalidade
              </p>

              <h1 className="mt-7 max-w-[15ch] font-display text-[42px] font-normal leading-[1.06] tracking-[-0.015em] text-paper [text-wrap:balance] sm:text-[62px] lg:text-[70px]">
                Quatro mil multitracks gospel na sua igreja.
              </h1>

              <p className="mt-6 max-w-xl text-[18px] leading-[1.7] text-paper/70">
                Clique, guia e cada instrumento em um canal separado, em todos os tons. Sua banda
                toca junto — e o que falta, a trilha completa.
              </p>

              {/* OFERTA — deixa explícito: 4.000 multitracks por um preço único */}
              <div className="mt-9 border-t border-paper/20 pt-7">
                <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-paper/60">
                  4.000 multitracks gospel por
                </p>

                <p className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                  <span className="font-display text-[64px] font-normal leading-[0.9] tracking-[-0.02em] text-paper sm:text-[84px]">
                    R$&nbsp;{precoReais}
                    <span className="align-top text-[0.5em]">,{precoCentavos}</span>
                  </span>
                  <span className="flex flex-col text-[15px] leading-[1.45] text-paper/60">
                    <span className="line-through">de {priceBRL(site.fullPrice)}</span>
                    <span className="text-accent-soft">{discountPct}% off · pagamento único</span>
                  </span>
                </p>

                <p className="mt-4 text-[15px] text-paper/60">
                  Pagou, recebeu o acervo inteiro. Sem mensalidade, sem cobrança por música.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/assinar" className="btn-accent w-full sm:w-auto">
                  Liberar acesso por {priceBRL(site.price)}
                </Link>
                <Link href="/musicas" className="btn-light w-full sm:w-auto">
                  Ver o acervo
                </Link>
              </div>

              <p className="mt-6 text-[14px] text-paper/45">
                Pix ou cartão · acesso liberado na hora · garantia de 7 dias
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-b border-line py-6">
        <div className="relative overflow-hidden">
          <div className="marquee flex w-max gap-12 whitespace-nowrap">
            {[...artists, ...artists].map((a, i) => (
              <span key={a + i} className="font-display text-[19px] text-ink/25">
                {a}
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-paper to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-paper to-transparent" />
        </div>
      </section>

      {/* O QUE É */}
      <section className="shell pt-24 sm:pt-32">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20">
          <div>
            <p className="label">O que é</p>
            <h2 className="display mt-6 text-[30px] leading-[1.18] sm:text-[42px]">
              Não é playback fechado.
              <br />É a música aberta, canal por canal.
            </h2>
            <div className="mt-8 max-w-text space-y-5 text-[17px] leading-[1.75] text-ink-muted">
              <p>
                No playback comum está tudo misturado num arquivo só. Se a sua igreja tem baterista,
                a bateria da gravação continua tocando por cima dele.
              </p>
              <p>
                O multitrack — o VS — entrega a mesma música separada: bateria, baixo, teclado,
                guitarra, pads, sopros e vocais, cada um no seu arquivo. Você muta o que já tem
                músico e deixa ligado só o que falta.
              </p>
              <p>
                Junto vêm dois canais que a igreja nunca ouve:{' '}
                <strong className="font-semibold text-ink">o clique</strong>, que segura o andamento,
                e <strong className="font-semibold text-ink">a guia</strong>, a voz que avisa o que
                vem em seguida. Esses dois vão só para o fone da equipe.
              </p>
            </div>
            <Link href="/como-usar" className="link-underline mt-9 inline-block text-[16px]">
              Ver o guia completo de uso
            </Link>
          </div>

          <dl className="divide-y divide-line border-t border-line">
            {includes.map((it) => (
              <div key={it.title} className="py-6">
                <dt className="font-display text-[19px] leading-snug text-ink">{it.title}</dt>
                <dd className="mt-2 text-[15px] leading-[1.7] text-ink-muted">{it.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* NO PALCO */}
      <section className="shell pt-24 sm:pt-32">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-20">
          <div>
            <p className="label">No palco</p>
            <h2 className="display mt-6 text-[30px] leading-[1.18] sm:text-[40px]">
              O clique fica no fone. O resto vai para a igreja.
            </h2>
            <p className="mt-6 max-w-text text-[17px] leading-[1.75] text-ink-muted">
              É a única regra que importa, e ela se resolve uma vez só no seu programa. Depois é
              abrir a música e tocar.
            </p>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {[
                ['Saída 1 · fones', 'Clique e guia vão só para o baterista e para quem conduz.'],
                ['Saída 2 · PA', 'O mix dos instrumentos da trilha vai para a mesa de som.'],
                ['Mute o que a banda toca', 'O multitrack completa a equipe, não substitui ninguém.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-4 py-4">
                  <Check className="mt-[7px] shrink-0 text-accent" />
                  <span className="text-[15.5px] leading-[1.65] text-ink-muted">
                    <strong className="font-semibold text-ink">{t}</strong> — {d}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <TabletMockup />
        </div>
      </section>

      {/* ACERVO */}
      <section className="shell pt-24 sm:pt-32">
        <p className="label">Amostra do acervo</p>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
          <h2 className="display max-w-2xl text-[30px] leading-[1.18] sm:text-[42px]">
            Os louvores que a sua igreja já canta
          </h2>
          <Link href="/musicas" className="link-underline text-[16px]">
            Ver todas as músicas
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {destaques.map((s) => (
            <SongCard key={s.slug} song={s} />
          ))}
        </div>
      </section>

      {/* FOTO BANDA + USOS */}
      <section className="pt-24 sm:pt-32">
        <div className="shell">
          <Figure
            src="/img/banda-palco.webp"
            alt="Equipe de louvor cantando no palco, com banda completa e luzes de show"
            caption="Do culto de domingo ao ensaio de quinta: o mesmo acervo resolve as duas coisas."
            ratio="aspect-[16/7]"
            position="50% 62%"
          />
        </div>

        <div className="shell mt-16">
          <p className="label">Onde usar</p>
          <div className="mt-8 grid gap-x-14 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {usos.map((u) => (
              <div key={u.title}>
                <h3 className="font-display text-[20px] leading-snug text-ink">{u.title}</h3>
                <p className="mt-2.5 text-[15px] leading-[1.7] text-ink-muted">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FERRAMENTAS */}
      <section className="mt-24 border-y border-line bg-white py-24 sm:mt-32 sm:py-32">
        <div className="shell">
          <SectionHead
            eyebrow="Como tocar"
            title="Qual programa usar para rodar o multitrack"
            sub="Você precisa de algo que toque vários canais ao mesmo tempo e mande o clique só para o fone. Estes são os que mais funcionam em igreja no Brasil."
          />

          <div className="mt-12 divide-y divide-line border-y border-line">
            {tools.slice(0, 3).map((t) => (
              <article
                key={t.slug}
                className="grid gap-4 py-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:gap-12"
              >
                <div>
                  <h3 className="font-display text-[24px] leading-none text-ink">{t.name}</h3>
                  <p className="mt-2 text-[12.5px] uppercase tracking-[0.08em] text-ink-faint">
                    {t.platform}
                  </p>
                </div>
                <div>
                  <p className="max-w-2xl text-[16px] leading-[1.7] text-ink-muted">{t.summary}</p>
                  <p className="mt-3 text-[14px] text-ink">{t.price}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link href="/como-usar" className="btn-solid">
              Ver o guia de configuração
            </Link>
            <p className="text-[14.5px] text-ink-faint">
              Também cobrimos Waveform Free, Cantabile, Studio One e uso no tablet.
            </p>
          </div>
        </div>
      </section>

      {/* PASSO A PASSO */}
      <section className="shell pt-24 sm:pt-32">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="label">Passo a passo</p>
            <h2 className="display mt-6 text-[30px] leading-[1.18] sm:text-[40px]">
              Do download ao domingo
            </h2>
            <p className="mt-5 text-[17px] leading-[1.7] text-ink-muted">
              Cinco passos. Nenhum deles exige que você seja técnico de áudio.
            </p>
          </div>
          <ol className="divide-y divide-line border-y border-line">
            {steps.map((s) => (
              <li key={s.n} className="grid gap-3 py-7 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
                <span className="font-display text-[22px] leading-none text-accent">{s.n}</span>
                <div>
                  <h3 className="font-display text-[20px] leading-snug text-ink">{s.title}</h3>
                  <p className="mt-2 text-[15.5px] leading-[1.72] text-ink-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PREÇO */}
      <section id="preco" className="shell pt-24 sm:pt-32">
        <div className="bg-ink text-paper">
          <div className="grid lg:grid-cols-2">
            <div className="border-b border-white/10 p-10 sm:p-14 lg:border-b-0 lg:border-r">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-accent-soft">
                Pacote único
              </p>
              <h2 className="mt-7 font-display text-[34px] leading-[1.12] sm:text-[44px]">
                Um pagamento.
                <br />O acervo inteiro.
              </h2>
              <p className="mt-6 max-w-md text-[16px] leading-[1.72] text-paper/60">
                Sem plano mensal, sem crédito por música, sem escolher faixa a faixa. Você paga uma
                vez e leva os 4.000 multitracks.
              </p>

              <div className="mt-12 flex items-baseline gap-4">
                <span className="font-display text-[54px] leading-none">{priceBRL(site.price)}</span>
                <span className="text-[16px] text-paper/40 line-through">
                  {priceBRL(site.fullPrice)}
                </span>
              </div>
              <p className="mt-3 text-[14.5px] text-paper/50">
                à vista no Pix ou parcelado no cartão
              </p>

              <Link href="/assinar" className="btn-accent mt-9 w-full sm:w-auto">
                Liberar meu acesso agora
              </Link>
              <p className="mt-5 text-[13.5px] text-paper/40">
                Pagamento pela Stripe · garantia de 7 dias
              </p>
            </div>

            <div className="p-10 sm:p-14">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-paper/40">
                Está tudo incluso
              </p>
              <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
                {[
                  'Mais de 4.000 multitracks gospel (VS)',
                  'Clique e guia em canais separados',
                  'Bateria, baixo, teclado, guitarra, pads, sopros e vocais isolados',
                  'Arquivos em WAV e MP3, organizados por música',
                  'Preparado para transposição de tom',
                  'Compatível com REAPER, Ableton, Prime e tablet',
                  'Acesso vitalício, sem limite de downloads',
                  'Novas trilhas somadas ao acervo',
                  'Suporte por e-mail para configurar o seu setup',
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-4 py-3.5 text-[15.5px] leading-[1.6] text-paper/75"
                  >
                    <Check className="mt-[7px] shrink-0 text-accent-soft" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="shell pt-24 sm:pt-32">
        <p className="label">Dúvidas</p>
        <h2 className="display mt-6 text-[30px] leading-[1.18] sm:text-[42px]">
          Perguntas que sempre chegam
        </h2>
        <Faq items={faq.slice(0, 8)} className="mt-10" />
        <Link href="/faq" className="link-underline mt-8 inline-block text-[16px]">
          Ver todas as dúvidas
        </Link>
      </section>

      {/* CTA FINAL */}
      <section className="shell pt-24 sm:pt-32">
        <div className="border-y border-line py-16 text-center sm:py-20">
          <h2 className="display mx-auto max-w-2xl text-[32px] leading-[1.14] sm:text-[46px]">
            Domingo chega rápido.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-[1.7] text-ink-muted">
            Libere o acervo hoje, monte o setlist ainda esta semana e leve a sua equipe para o
            próximo nível de louvor.
          </p>
          <Link href="/assinar" className="btn-solid mt-9">
            Garantir por {priceBRL(site.price)}
          </Link>
        </div>
      </section>
    </>
  )
}
