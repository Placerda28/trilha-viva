import Link from 'next/link'
import { Icone } from '@/components/ui'
import { SessionMini, TrackList } from '@/components/Track'
import HeroFundo from '@/components/HeroFundo'
import { fundoEstatico } from '@/lib/hero-gradiente'
import { site, priceBRL, discountPct } from '@/lib/site'

// Confiança logo abaixo do botão. Só o que é verdade hoje: o pagamento é pelo
// Mercado Pago (desde 23/09/2026), o acesso sai quando o pagamento é aprovado
// e o download é arquivo por arquivo na área do acervo.
const confianca = [
  ['cadeado', 'Pagamento seguro pelo Mercado Pago'],
  ['raio', 'Acesso liberado na hora'],
  ['download', 'Download música por música'],
]

// Abertura da home (app/page.js): topo preto com o preço, o botão e o setlist.
// A página escolhe as músicas e passa por aqui.
export default function HomeAbertura({ setlist, aberta }) {
  return (
    <>
      {/* ABERTURA
          Topo preto, emendado no cabecalho, com faixas de luz vinho, vermelho
          baixo e um feixe claro (12/10/2026, como nos anuncios). O fundo em CSS
          aparece de cara; o animado (HeroFundo) entra depois da pagina pronta.
          Cores e velocidade: lib/hero-gradiente.js. No celular o topo ja mostra
          o produto (os canais), o preco e o botao; no computador, texto a
          esquerda e o setlist a direita. */}
      <section id="topo" className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: fundoEstatico }} aria-hidden="true">
          <HeroFundo />
          {/* Sombra atras do texto, para a leitura nao depender de onde a luz passa */}
          <div className="absolute inset-0 bg-ink/45 lg:bg-transparent lg:bg-gradient-to-r lg:from-ink/80 lg:via-ink/45 lg:to-ink/10" />
        </div>

        <div className="shell pb-10 pt-6 sm:pt-10 lg:pb-20 lg:pt-24">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
            <div className="min-w-0">
              <p className="chip">{discountPct}% de desconto no lançamento</p>

              <h1 className="mt-4 max-w-[14ch] text-[clamp(2.4rem,10.5vw,2.8rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-white [text-wrap:balance] sm:mt-6 lg:mt-7 lg:max-w-[13ch] lg:text-d1">
                2.000 multitracks gospel na sua igreja.
              </h1>

              <p className="mt-3 max-w-lg font-read text-[17px] leading-[1.5] text-white/80 sm:mt-5 lg:mt-7 lg:text-[19px] lg:leading-[1.6]">
                Clique, guia e cada instrumento em um canal separado.
              </p>

              {/* Celular: produto, preco, botao e confianca, nesta ordem */}
              <div className="lg:hidden">
                <SessionMini song={aberta} className="mt-5" />

                <div className="mt-6 text-center">
                  <p className="figs text-[15px] text-white/70">
                    de <span className="line-through">{priceBRL(site.fullPrice)}</span>
                  </p>
                  <p className="figs mt-0.5 text-[44px] font-extrabold leading-none tracking-[-0.03em] text-white">
                    {priceBRL(site.price)}
                  </p>
                  <p className="mt-2 text-[14px] text-white/75">pagamento único, acesso vitalício</p>
                </div>

                <Link href="/assinar" className="btn-glow mt-5 w-full py-[18px] text-[16px]">
                  Quero meu acesso
                </Link>
                <Link href="/musicas" className="btn-onink mt-3 w-full">
                  Ver o acervo
                </Link>

                <ul className="mt-6 grid grid-cols-3 gap-3 text-center">
                  {confianca.map(([icone, texto]) => (
                    <li key={texto} className="flex flex-col items-center gap-2">
                      <Icone nome={icone} />
                      <span className="text-[12.5px] leading-[1.35] text-white/80">{texto}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Computador: como era */}
              <div className="mt-9 hidden gap-3 lg:flex lg:items-center">
                <Link href="/assinar" className="btn-signal">
                  Liberar acesso vitalício por {priceBRL(site.price)}
                </Link>
                <Link href="/musicas" className="btn-onink border-white/70">
                  Ver o acervo
                </Link>
              </div>

              <p className="mt-6 hidden max-w-md text-[14.5px] leading-[1.6] text-white/75 lg:block">
                De <span className="line-through">{priceBRL(site.fullPrice)}</span> por{' '}
                {priceBRL(site.price)} em pagamento único, no Pix ou no cartão. Sete dias de garantia.
              </p>
            </div>

            {/* O setlist: prova e navegação ao mesmo tempo (no celular, o
                painel de canais acima faz esse papel) */}
            <div className="hidden overflow-hidden rounded-lg border border-white/10 bg-ink/75 lg:block">
              <div className="flex items-baseline justify-between gap-4 px-4 py-4 sm:px-5">
                <p className="text-[15px] font-bold">Domingo de manhã</p>
                <p className="figs text-[13px] text-white/55">8 de mais de 2.000</p>
              </div>
              <TrackList songs={setlist} tone="light" />
              <div className="border-t border-white/10 px-4 py-4 sm:px-5">
                <Link
                  href="/musicas"
                  className="text-[14.5px] font-semibold text-mist underline decoration-mist/40 decoration-2 underline-offset-4 hover:decoration-mist"
                >
                  Abrir o acervo inteiro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
