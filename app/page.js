import Link from 'next/link'
import { SongGrid, Check, Figure } from '@/components/ui'
import { SessionPanel, CHANNELS } from '@/components/Track'
import BarraCompra from '@/components/BarraCompra'
import HomeAbertura from '@/components/HomeAbertura'
import HomeProgramasPreco from '@/components/HomeProgramasPreco'
import FaixaSazonal from '@/components/FaixaSazonal'
import colecoes from '@/data/colecoes.json'
import { destaques } from '@/lib/catalog'
import { artistList } from '@/lib/artists'
import { site, includes, priceBRL } from '@/lib/site'
import { usos } from '@/lib/tools'
import { faq } from '@/lib/faq'

export const metadata = {
  title: 'Multitracks Gospel: 2.000 VS por R$ 89,90 vitalício | Trilha Viva',
  description:
    'Pacote com 2.000 multitracks gospel (VS) com clique, guia e canais separados. Pagamento único de R$ 89,90, sem mensalidade.',
  alternates: { canonical: '/' },
}

const setlist = destaques.slice(0, 8)
const amostra = destaques.slice(8, 24)
const aberta = destaques[0]

// Os artistas com mais músicas no acervo, lidos do catálogo (a lista já vem
// ordenada por quantidade). Nada escrito à mão: se o acervo mudar, muda aqui.
const topArtistas = artistList.slice(0, 12)

const productLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Trilha Viva — Pacote Completo com 2.000 Multitracks Gospel',
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

      <HomeAbertura setlist={setlist} aberta={aberta} />

      {/* ARTISTAS — nomes reais do acervo, os que têm mais músicas */}
      <section aria-labelledby="artistas-titulo" className="border-b border-line bg-white">
        <div className="shell flex flex-col gap-3 py-5 lg:flex-row lg:items-center lg:gap-8">
          <h2 id="artistas-titulo" className="shrink-0 text-[14.5px] font-bold text-ink">
            Artistas no acervo
          </h2>
          <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {topArtistas.map((a) => (
              <li key={a.slug} className="shrink-0">
                <Link
                  href={`/artistas/${a.slug}`}
                  className="inline-flex min-h-[40px] items-center whitespace-nowrap rounded-full border border-line bg-paper px-4 text-[14px] font-semibold text-ink transition-colors hover:border-signal hover:text-signal-deep"
                >
                  {a.name}
                </Link>
              </li>
            ))}
            <li className="shrink-0">
              <Link
                href="/artistas"
                className="inline-flex min-h-[40px] items-center whitespace-nowrap px-2 text-[14px] font-semibold text-signal-deep underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-signal"
              >
                Todos os artistas
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* A FOTO — a igreja, em tamanho real (só no computador; no celular saiu do topo em 12/10/2026) */}
      <section className="mt-20 hidden sm:mt-28 lg:block">
        <div className="relative h-[300px] overflow-hidden bg-ink sm:h-[420px] lg:h-[520px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/banda-palco-4k.webp"
            loading="lazy"
            alt="Equipe de louvor cantando no palco, com banda completa e luzes de show"
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

          <div className="min-w-0">
            <SessionPanel song={aberta} />
            <p className="mt-3 text-[13px] text-ink-muted">
              Uma música do acervo aberta no programa: {CHANNELS.length} canais, com o clique e a
              guia saindo só para o fone.
            </p>
          </div>
        </div>
      </section>

      {/* Faixa do Natal (01/11 a 25/12), acima do acervo; some sozinha em 26/12. */}
      <FaixaSazonal href="/colecoes/natal" faixa={colecoes.natal.faixaHome} />

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
            Esta é uma amostra. Os multitracks do pacote vêm com os mesmos {CHANNELS.length} canais,
            e o acervo continua crescendo.
          </p>
        </div>
      </section>

      {/* CONGREGAÇÃO + USOS */}
      <section className="pt-20 sm:pt-28">
        <div className="shell">
          <Figure
            src="/img/louvor-congregacao-4k.webp"
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

      <HomeProgramasPreco />

      {/* FECHAMENTO */}
      <section className="shell pt-20 sm:pt-28">
        <div className="border-y-2 border-signal py-14 sm:py-20">
          <h2 className="text-d2 max-w-2xl text-ink">Domingo chega rápido.</h2>
          <p className="mt-5 max-w-xl font-read text-[18px] leading-[1.7] text-ink-muted">
            Libere o acervo hoje e monte o setlist ainda esta semana.
          </p>
          <Link href="/assinar" className="btn-signal mt-8">
            Garantir por {priceBRL(site.price)}
          </Link>
        </div>
      </section>

      <BarraCompra />
    </>
  )
}
