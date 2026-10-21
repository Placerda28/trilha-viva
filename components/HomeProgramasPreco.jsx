import Link from 'next/link'
import { SectionHead, Faq, Check } from '@/components/ui'
import { site, priceBRL } from '@/lib/site'
import { tools, steps } from '@/lib/tools'
import { faq } from '@/lib/faq'

// Segunda metade da home (app/page.js): programas, passo a passo, preço e
// dúvidas.
export default function HomeProgramasPreco() {
  return (
    <>
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
                vez e leva os 2.000 multitracks.
              </p>

              <div className="mt-10 flex items-baseline gap-4">
                <span className="figs text-[52px] font-extrabold leading-none tracking-[-0.04em]">
                  {priceBRL(site.price)}
                </span>
                <span className="figs text-[16px] text-white/55 line-through">
                  {priceBRL(site.fullPrice)}
                </span>
              </div>
              <p className="mt-3 text-[14.5px] text-white/55">
                Pagamento único no Pix ou no cartão, à vista ou parcelado.
              </p>

              <Link href="/assinar" className="btn-glow mt-8 w-full sm:w-auto">
                Liberar meu acesso agora
              </Link>
              <p className="mt-5 text-[13.5px] text-white/55">
                Pagamento pelo Mercado Pago, com sete dias de garantia.
              </p>
            </div>

            <div className="p-8 sm:p-12">
              <h3 className="text-[17px] font-bold text-white">Está tudo incluso</h3>
              <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
                {[
                  'Mais de 2.000 multitracks gospel (VS)',
                  'Clique e guia em canais separados',
                  'Bateria, baixo, teclado, guitarra, pads, sopros e vocais isolados',
                  'Arquivos em WAV e MP3, organizados por música',
                  'Preparado para transposição de tom',
                  'Compatível com REAPER, Ableton, Prime e tablet',
                  'Acesso vitalício, com até 30 downloads por dia',
                  'Novas trilhas somadas ao acervo',
                  'Suporte por e-mail para configurar o seu setup',
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-4 py-3.5 text-[15.5px] leading-[1.6] text-white/75"
                  >
                    <Check tone="light" className="mt-[8px] shrink-0" />
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
    </>
  )
}
