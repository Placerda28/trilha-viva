import Link from 'next/link'
import { SectionHead, SongGrid, Faq, Check, Figure } from '@/components/ui'
import { SessionPanel, TrackList, CHANNELS } from '@/components/Track'
import { songs } from '@/lib/catalog'
import { site, includes, priceBRL, discountPct } from '@/lib/site'
import { tools, usos, steps } from '@/lib/tools'
import { faq } from '@/lib/faq'

export const metadata = {
  title: 'Multitracks Gospel: 4.000 VS com clique e guia | Trilha Viva',
  description:
    'Pacote único com mais de 4.000 multitracks gospel (VS) — clique, guia e canais separados, em todos os tons. Acesso vitalício por R$ 89,90, sem mensalidade.',
  alternates: { canonical: '/' },
}

const setlist = songs.slice(0, 8)
const amostra = songs.slice(8, 24)
const aberta = songs[0]

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

      {/* ABERTURA — o setlist é o produto, então ele abre a página */}
      <section className="shell pt-14 sm:pt-20 lg:pt-24">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
          <div>
            <p className="inline-block bg-signal px-3 py-1.5 text-[13.5px] font-bold text-ink">
              {discountPct}% de desconto no lançamento
            </p>

            <h1 className="text-d1 mt-7 max-w-[13ch] text-ink [text-wrap:balance]">
              4.000 multitracks gospel na sua igreja.
            </h1>

            <p className="mt-7 max-w-lg font-read text-[19px] leading-[1.6] text-ink-muted">
              Clique, guia e cada instrumento em um canal separado, em todos os tons. Sua banda toca
              junto, e o que falta vem da trilha.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/assinar" className="btn-signal w-full sm:w-auto">
                Liberar acesso vitalício por {priceBRL(site.price)}
              </Link>
              <Link href="/musicas" className="btn-quiet w-full sm:w-auto">
                Ver o acervo
              </Link>
            </div>

            <p className="mt-6 max-w-md text-[14.5px] leading-[1.6] text-ink-muted">
              De <span className="line-through">{priceBRL(site.fullPrice)}</span> por{' '}
              {priceBRL(site.price)} em pagamento único, no Pix ou no cartão. Sete dias de garantia.
            </p>
          </div>

          {/* O setlist: prova e navegação ao mesmo tempo */}
          <div className="panel overflow-hidden">
            <div className="flex items-baseline justify-between gap-4 px-4 py-4 sm:px-5">
              <p className="text-[15px] font-bold">Domingo de manhã</p>
              <p className="figs text-[13px] text-white/45">8 de mais de 4.000</p>
            </div>
            <TrackList songs={setlist} tone="light" />
            <div className="border-t border-white/10 px-4 py-4 sm:px-5">
              <Link
                href="/musicas"
                className="text-[14.5px] font-semibold text-signal underline decoration-signal/40 decoration-2 underline-offset-4 hover:decoration-signal"
              >
                Abrir o acervo inteiro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* A FOTO — a igreja, em tamanho real */}
      <section className="mt-20 sm:mt-28">
        <div className="relative h-[300px] overflow-hidden bg-ink sm:h-[420px] lg:h-[520px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/banda-palco.webp"
            alt="Equipe de louvor cantando no palco, com banda completa e luzes de show"
            fetchPriority="high"
            className="h-full w-full object-cover object-center"
          />
        </div>
      </section>

      {/* O QUE É */}
      <section className="shell pt-20 sm:pt-28">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20">
          <div>
            <h2 className="text-d2 text-ink">
              Não é playback fechado. É a música aberta, canal por canal.
            </h2>
            <div className="mt-8 max-w-text space-y-5 font-read text-[18px] leading-[1.72] text-ink-muted">
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
            <Link href="/como-usar" className="link-quiet mt-8 inline-block text-[16px] font-semibold">
              Ver o guia completo de uso
            </Link>
          </div>

          <dl className="divide-y divide-line border-t-2 border-ink">
            {includes.map((it) => (
              <div key={it.title} className="py-6">
                <dt className="text-[18px] font-bold leading-snug tracking-[-0.015em] text-ink">
                  {it.title}
                </dt>
                <dd className="mt-2 text-[15px] leading-[1.68] text-ink-muted">{it.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* NO PALCO — a sessão aberta */}
      <section className="shell pt-20 sm:pt-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-20">
          <div>
            <h2 className="text-d2 text-ink">O clique fica no fone. O resto vai para a igreja.</h2>
            <p className="mt-6 max-w-text font-read text-[18px] leading-[1.72] text-ink-muted">
              É a única regra que importa, e ela se resolve uma vez só no seu programa. Depois é
              abrir a música e tocar.
            </p>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {[
                ['Saída 1, fones', 'Clique e guia vão só para o baterista e para quem conduz.'],
                ['Saída 2, PA', 'O mix dos instrumentos da trilha vai para a mesa de som.'],
                ['Mute o que a banda toca', 'O multitrack completa a equipe, não substitui ninguém.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-4 py-4">
                  <Check className="mt-[8px] shrink-0" />
                  <span className="text-[16px] leading-[1.62] text-ink-muted">
                    <strong className="font-semibold text-ink">{t}.</strong> {d}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SessionPanel song={aberta} />
            <p className="mt-3 text-[13px] text-ink-muted">
              Uma música do acervo aberta no programa: {CHANNELS.length} canais, com o clique e a
              guia saindo só para o fone.
            </p>
          </div>
        </div>
      </section>

      {/* ACERVO */}
      <section className="mt-20 bg-mist py-20 sm:mt-28 sm:py-28">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <h2 className="text-d2 max-w-2xl text-ink">Os louvores que a sua igreja já canta</h2>
            <Link href="/musicas" className="link-quiet text-[16px] font-semibold">
              Ver todas as músicas
            </Link>
          </div>

          <div className="mt-10 border-t-2 border-ink bg-white">
            <SongGrid songs={amostra} />
          </div>

          <p className="mt-6 text-[15px] text-ink-muted">
            Esta é uma amostra. Toda música do pacote vem com os mesmos {CHANNELS.length} canais, e o
            acervo continua crescendo.
          </p>
        </div>
      </section>

      {/* CONGREGAÇÃO + USOS */}
      <section className="pt-20 sm:pt-28">
        <div className="shell">
          <Figure
            src="/img/louvor-congregacao.webp"
            alt="Igreja reunida em louvor, com as mãos levantadas diante da banda no palco"
            caption="Do culto de domingo ao ensaio de quinta: o mesmo acervo resolve as duas coisas."
            ratio="aspect-[16/7]"
            position="50% 50%"
          />
        </div>

        <div className="shell mt-14">
          <h2 className="text-d3 text-ink">Não é só no domingo de manhã</h2>
          <div className="mt-8 grid gap-x-14 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {usos.map((u) => (
              <div key={u.title} className="border-t-2 border-ink pt-4">
                <h3 className="text-[18px] font-bold leading-snug tracking-[-0.015em] text-ink">
                  {u.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-[1.68] text-ink-muted">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FERRAMENTAS */}
      <section className="mt-20 bg-mist py-20 sm:mt-28 sm:py-28">
        <div className="shell">
          <SectionHead
            title="Qual programa usar para rodar o multitrack"
            sub="Você precisa de algo que toque vários canais ao mesmo tempo e mande o clique só para o fone. Estes são os que mais funcionam em igreja no Brasil."
          />

          <div className="mt-12 divide-y divide-line border-y border-line bg-white">
            {tools.slice(0, 3).map((t) => (
              <article
                key={t.slug}
                className="grid gap-4 px-5 py-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:gap-12"
              >
                <div>
                  <h3 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-ink">
                    {t.name}
                  </h3>
                  <p className="mt-2 text-[13.5px] text-ink-muted">{t.platform}</p>
                </div>
                <div>
                  <p className="max-w-2xl text-[16px] leading-[1.68] text-ink-muted">{t.summary}</p>
                  <p className="mt-3 text-[14.5px] font-semibold text-ink">{t.price}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link href="/como-usar" className="btn-ink">
              Ver o guia de configuração
            </Link>
            <p className="max-w-sm text-[14.5px] text-ink-muted">
              Também cobrimos Waveform Free, Cantabile, Studio One e uso no tablet.
            </p>
          </div>
        </div>
      </section>

      {/* PASSO A PASSO — aqui a numeração é real, é uma sequência */}
      <section className="shell pt-20 sm:pt-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-d2 text-ink">Do download ao domingo</h2>
            <p className="mt-5 font-read text-[18px] leading-[1.7] text-ink-muted">
              Cinco passos. Nenhum deles exige que você seja técnico de áudio.
            </p>
          </div>
          <ol className="divide-y divide-line border-y border-line">
            {steps.map((s) => (
              <li key={s.n} className="grid gap-3 py-7 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
                <span className="figs text-[20px] font-extrabold leading-none text-signal-deep">
                  {s.n}
                </span>
                <div>
                  <h3 className="text-[19px] font-bold leading-snug tracking-[-0.015em] text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[15.5px] leading-[1.7] text-ink-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PREÇO */}
      <section id="preco" className="shell pt-20 sm:pt-28">
        <div className="panel overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="border-b border-white/10 p-8 sm:p-12 lg:border-b-0 lg:border-r">
              <h2 className="text-d2 text-white">Um pagamento. O acervo inteiro.</h2>
              <p className="mt-6 max-w-md font-read text-[17px] leading-[1.68] text-white/60">
                Sem plano mensal, sem crédito por música, sem escolher faixa a faixa. Você paga uma
                vez e leva os 4.000 multitracks.
              </p>

              <div className="mt-10 flex items-baseline gap-4">
                <span className="figs text-[52px] font-extrabold leading-none tracking-[-0.04em]">
                  {priceBRL(site.price)}
                </span>
                <span className="figs text-[16px] text-white/40 line-through">
                  {priceBRL(site.fullPrice)}
                </span>
              </div>
              <p className="mt-3 text-[14.5px] text-white/55">
                À vista no Pix ou parcelado no cartão.
              </p>

              <Link href="/assinar" className="btn-signal mt-8 w-full sm:w-auto">
                Liberar meu acesso agora
              </Link>
              <p className="mt-5 text-[13.5px] text-white/45">
                Pagamento pela Stripe, com sete dias de garantia.
              </p>
            </div>

            <div className="p-8 sm:p-12">
              <h3 className="text-[17px] font-bold text-white">Está tudo incluso</h3>
              <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
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
                    className="flex items-start gap-4 py-3.5 text-[15.5px] leading-[1.6] text-white/75"
                  >
                    <Check className="mt-[8px] shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* DÚVIDAS */}
      <section className="shell pt-20 sm:pt-28">
        <h2 className="text-d2 text-ink">Perguntas que sempre chegam</h2>
        <Faq items={faq.slice(0, 8)} className="mt-10" />
        <Link href="/faq" className="link-quiet mt-8 inline-block text-[16px] font-semibold">
          Ver todas as dúvidas
        </Link>
      </section>

      {/* FECHAMENTO */}
      <section className="shell pt-20 sm:pt-28">
        <div className="border-y-2 border-ink py-14 sm:py-20">
          <h2 className="text-d2 max-w-2xl text-ink">Domingo chega rápido.</h2>
          <p className="mt-5 max-w-xl font-read text-[18px] leading-[1.7] text-ink-muted">
            Libere o acervo hoje e monte o setlist ainda esta semana.
          </p>
          <Link href="/assinar" className="btn-signal mt-8">
            Garantir por {priceBRL(site.price)}
          </Link>
        </div>
      </section>
    </>
  )
}
