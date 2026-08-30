import Link from 'next/link'
import StageScene from '@/components/StageScene'
import TabletMockup from '@/components/TabletMockup'
import { SectionHead, SongCard, Faq, Check } from '@/components/ui'
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

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] grid-fade" aria-hidden="true" />
        <div className="shell relative grid gap-14 pb-8 pt-14 lg:grid-cols-[1.02fr_1fr] lg:items-center lg:gap-12 lg:pb-16 lg:pt-20">
          <div className="animate-rise">
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-flame-500" />
              Novo · Pacote único · {discountPct}% off
            </span>

            <h1 className="mt-6 text-[40px] font-extrabold leading-[1.04] tracking-[-0.045em] text-ink sm:text-[54px] lg:text-[57px]">
              4.000 multitracks
              <br />
              gospel.
              <br />
              <span className="bg-gradient-to-r from-brand-600 via-[#7C3AED] to-flame-500 bg-clip-text text-transparent">
                Um pacote só.
              </span>
            </h1>

            <p className="mt-6 max-w-[34rem] text-[18px] leading-[1.62] text-ink-muted">
              Clique, guia e cada instrumento em um canal separado — em todos os tons, prontos para
              o culto de domingo. Sua banda toca junto, e o que falta a trilha completa.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/assinar" className="btn-flame w-full sm:w-auto">
                Garantir por {priceBRL(site.price)}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link href="/musicas" className="btn-ghost w-full sm:w-auto">
                Ver o acervo
              </Link>
            </div>

            <p className="mt-4 text-[14px] text-ink-faint">
              De <span className="line-through">{priceBRL(site.fullPrice)}</span> por{' '}
              <strong className="font-semibold text-ink">{priceBRL(site.price)}</strong> · pagamento
              único · Pix ou cartão
            </p>

            <ul className="mt-9 grid gap-3 border-t border-line pt-7 sm:grid-cols-2">
              {[
                'Acesso vitalício, sem mensalidade',
                'Clique e guia em canais próprios',
                'Download imediato após o pagamento',
                'Garantia de 7 dias',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[14.5px] text-ink-muted">
                  <Check className="mt-0.5 shrink-0 text-brand-600" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative animate-rise" style={{ animationDelay: '.08s' }}>
            <div className="relative overflow-hidden rounded-[26px] shadow-lift ring-1 ring-black/5">
              <StageScene className="block w-full" id="hero" />
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-5 pt-14">
                {['Clique no fone', 'Guia falada', 'Canais separados', 'Todos os tons'].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-white/85 backdrop-blur-sm"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
              {[
                ['4.000+', 'multitracks'],
                ['R$ 0', 'de mensalidade'],
                ['7 dias', 'de garantia'],
              ].map(([k, v]) => (
                <div key={v} className="bg-white px-4 py-5 text-center">
                  <p className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">{k}</p>
                  <p className="mt-0.5 text-[12px] text-ink-faint">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 border-y border-line bg-surface py-5">
        <p className="shell text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Artistas e ministérios no acervo
        </p>
        <div className="relative mt-4 overflow-hidden">
          <div className="marquee flex w-max gap-10 whitespace-nowrap">
            {[...artists, ...artists].map((a, i) => (
              <span key={a + i} className="text-[16px] font-semibold tracking-[-0.02em] text-ink/35">
                {a}
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-surface to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-surface to-transparent" />
        </div>
      </section>

      <section className="shell pt-20 sm:pt-28">
        <SectionHead
          eyebrow="O que você recebe"
          title="Tudo o que a sua equipe precisa para tocar com trilha"
          sub="Não é playback fechado. É a música aberta, canal por canal, para a sua banda entrar por cima."
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {includes.map((it, i) => (
            <div key={it.title} className="bg-white p-7">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-white text-[13px] font-bold text-brand-600 ring-1 ring-line">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-ink">{it.title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-[1.65] text-ink-muted">{it.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell pt-20 sm:pt-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.08fr] lg:items-center lg:gap-16">
          <div>
            <SectionHead
              eyebrow="No palco"
              title="Do notebook ao tablet, sem complicação"
              sub="Abra a música no seu programa, mande clique e guia para o fone da equipe e o mix dos instrumentos para a mesa de som. É literalmente isso."
            />
            <ul className="mt-8 space-y-4">
              {[
                ['Saída 1 · fones', 'Clique e guia vão só para o baterista e para quem conduz o louvor.'],
                ['Saída 2 · PA', 'O mix dos instrumentos da trilha vai para a mesa e para a igreja.'],
                ['Muta o que a banda toca', 'Tem baterista? Muta a bateria. O multitrack completa, não substitui.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3.5">
                  <Check className="mt-1 shrink-0 text-flame-500" />
                  <span className="text-[15px] leading-[1.6] text-ink-muted">
                    <strong className="font-semibold text-ink">{t}</strong> — {d}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/como-usar" className="btn-ghost mt-8 !py-3 !px-5 !text-[14.5px]">
              Ver o guia de configuração
            </Link>
          </div>
          <div className="lg:pl-4">
            <TabletMockup />
          </div>
        </div>
      </section>

      <section className="shell pt-20 sm:pt-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            eyebrow="Amostra do acervo"
            title="Os louvores que a sua igreja já canta"
            sub="Uma amostra do que está dentro do pacote. Cada música tem sua página com os canais inclusos."
          />
          <Link href="/musicas" className="btn-ghost shrink-0 !py-3 !px-5 !text-[14.5px]">
            Ver todas as músicas
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-6">
          {destaques.map((s) => (
            <SongCard key={s.slug} song={s} />
          ))}
        </div>
      </section>

      <section className="shell pt-20 sm:pt-28">
        <SectionHead
          eyebrow="Onde usar"
          title="Do culto de domingo ao ensaio em casa"
          sub="O mesmo acervo resolve situações bem diferentes dentro do ministério."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {usos.map((u) => (
            <div key={u.title} className="card p-6 transition-shadow hover:shadow-lift">
              <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] text-ink">{u.title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-[1.65] text-ink-muted">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20 bg-surface py-20 sm:mt-28 sm:py-28">
        <div className="shell">
          <SectionHead
            eyebrow="Como tocar"
            title="Qual programa usar para rodar o multitrack"
            sub="Você precisa de um programa que toque vários canais ao mesmo tempo e mande o clique só para o fone da equipe. Estes são os que mais funcionam em igreja no Brasil."
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {tools.slice(0, 3).map((t) => (
              <article key={t.slug} className="card flex flex-col p-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[19px] font-bold tracking-[-0.03em] text-ink">{t.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide ${
                      t.badge === 'Recomendado'
                        ? 'bg-flame-500/12 text-flame-600'
                        : 'bg-brand-50 text-brand-600'
                    }`}
                  >
                    {t.badge}
                  </span>
                </div>
                <p className="mt-1.5 text-[12.5px] font-medium text-ink-faint">{t.platform}</p>
                <p className="mt-4 flex-1 text-[14.5px] leading-[1.65] text-ink-muted">{t.summary}</p>
                <p className="mt-5 border-t border-line pt-4 text-[13px] font-medium text-ink">
                  {t.price}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/como-usar" className="btn-primary !py-3 !px-6 !text-[14.5px]">
              Ver o guia completo de configuração
            </Link>
            <p className="text-[14px] text-ink-faint">
              Também cobrimos Waveform Free, Cantabile, Studio One e uso no tablet.
            </p>
          </div>
        </div>
      </section>

      <section className="shell pt-20 sm:pt-28">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <SectionHead
              eyebrow="Passo a passo"
              title="Do download ao domingo, em 5 passos"
              sub="Nenhum deles exige que você seja técnico de áudio."
            />
            <Link href="/assinar" className="btn-flame mt-8 !py-3.5 !px-7">
              Quero o acervo completo
            </Link>
          </div>
          <ol className="space-y-px overflow-hidden rounded-2xl border border-line bg-line">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-5 bg-white p-6 sm:p-7">
                <span className="mt-0.5 text-[13px] font-bold tabular-nums text-flame-500">{s.n}</span>
                <div>
                  <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] text-ink">{s.title}</h3>
                  <p className="mt-2 text-[14.5px] leading-[1.65] text-ink-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="preco" className="shell pt-20 sm:pt-28">
        <div className="overflow-hidden rounded-[28px] border border-line shadow-lift">
          <div className="grid lg:grid-cols-[1.05fr_.95fr]">
            <div className="bg-ink p-8 text-white sm:p-12">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                Pacote único
              </span>
              <h2 className="mt-6 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[40px]">
                Um pagamento.
                <br />O acervo inteiro.
              </h2>
              <p className="mt-5 max-w-md text-[15.5px] leading-[1.65] text-white/60">
                Sem plano mensal, sem crédito por música, sem escolher faixa a faixa. Você paga uma
                vez e leva os 4.000 multitracks.
              </p>

              <div className="mt-9 flex items-end gap-3">
                <span className="text-[15px] text-white/40 line-through">
                  {priceBRL(site.fullPrice)}
                </span>
                <span className="rounded-full bg-flame-500 px-2.5 py-1 text-[11.5px] font-bold text-white">
                  -{discountPct}%
                </span>
              </div>
              <p className="mt-1 text-[52px] font-extrabold leading-none tracking-[-0.045em]">
                {priceBRL(site.price)}
              </p>
              <p className="mt-2 text-[14px] text-white/50">
                à vista no Pix · ou parcelado no cartão
              </p>

              <Link href="/assinar" className="btn-flame mt-8 w-full sm:w-auto">
                Liberar meu acesso agora
              </Link>
              <p className="mt-4 text-[13px] text-white/40">
                Pagamento processado pela Stripe. Garantia de 7 dias.
              </p>
            </div>

            <div className="bg-white p-8 sm:p-12">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Está tudo incluso
              </h3>
              <ul className="mt-6 space-y-3.5">
                {[
                  'Mais de 4.000 multitracks gospel (VS)',
                  'Clique (metrônomo) em canal separado',
                  'Guia falada em canal separado',
                  'Bateria, baixo, teclado, guitarra, pads, sopros e vocais isolados',
                  'Arquivos em WAV e MP3, organizados por música',
                  'Preparado para transposição de tom',
                  'Compatível com REAPER, Ableton, Prime e tablet',
                  'Acesso vitalício, sem limite de downloads',
                  'Novas trilhas somadas ao acervo',
                  'Suporte por e-mail para configurar o seu setup',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] leading-[1.55] text-ink-muted">
                    <Check className="mt-0.5 shrink-0 text-flame-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="shell pt-20 sm:pt-28">
        <SectionHead eyebrow="Dúvidas" title="Perguntas que sempre chegam" />
        <Faq items={faq.slice(0, 8)} className="mt-10" />
        <Link href="/faq" className="mt-8 inline-flex text-[15px] font-semibold text-brand-600 hover:text-brand-700">
          Ver todas as dúvidas →
        </Link>
      </section>

      <section className="shell pt-20 sm:pt-28">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-600 via-[#5B3BD4] to-flame-500 px-8 py-14 text-center sm:px-14 sm:py-20">
          <h2 className="mx-auto max-w-2xl text-[32px] font-bold leading-[1.1] tracking-[-0.035em] text-white sm:text-[44px]">
            Domingo chega rápido.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-[1.6] text-white/85">
            Libere o acervo hoje, monte o setlist ainda esta semana e leve a sua equipe para o
            próximo nível de louvor.
          </p>
          <Link
            href="/assinar"
            className="btn mt-9 bg-white px-8 py-4 text-ink shadow-lift hover:bg-white/90"
          >
            Garantir por {priceBRL(site.price)}
          </Link>
          <p className="mt-4 text-[13.5px] text-white/70">
            Acesso imediato · Pix e cartão · Garantia de 7 dias
          </p>
        </div>
      </section>
    </>
  )
}
