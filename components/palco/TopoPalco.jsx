import { Botao, EmBreve, Icone } from '@/components/ds'
import { LogoMark } from '@/components/Logo'
import { PALCO_PRECO_MENSAL, textoLancamento } from '@/lib/palco'
import ListaEspera from './ListaEspera'
import { ALT_PRINT, IMAGEM_PALCO } from './dados'

// Topo escuro da vitrine /palco (MUDANÇAS §9). O cabeçalho escuro é o do layout
// (Header.jsx, tema por rota). "Em breve" mostra a lista de espera no lugar do
// download; "lançado" mostra o botão de baixar (a versão e o tamanho só entram
// quando o instalador existir: não escrevemos número que ainda não é real).
export default function TopoPalco({ emBreve }) {
  return (
    <div data-tema="escuro" className="bg-ink text-white">
      <section
        aria-labelledby="h-palco"
        className="mx-auto flex w-full max-w-[1280px] flex-col gap-[clamp(32px,5cqi,56px)] px-[clamp(20px,4cqi,32px)] pb-[clamp(40px,5cqi,64px)] pt-[clamp(40px,6cqi,88px)]"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-8">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
            <p className="flex flex-wrap items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-dark-text-2">
              <LogoMark size={28} tone="light" />
              Palco · produzido pela equipe Trilha Viva
              {emBreve && <EmBreve tema="escuro" />}
            </p>
            <h1 id="h-palco" className="font-semi-condensed max-w-[760px] text-[clamp(40px,6cqi,76px)] font-extrabold leading-[0.98] tracking-[-0.025em] [text-wrap:balance]">
              O programa para tocar VS no culto.
            </h1>
            <p className="max-w-[600px] text-[clamp(18px,1.6cqi,20px)] leading-[1.55] text-dark-text-2 [text-wrap:pretty]">
              Clique e guia no fone, a música dividida em partes, pad e setlist. Funciona sem internet.
            </p>
            <p className="text-[17px] font-semibold">Tem o pacote? As 2.000 VS já aparecem no Palco.</p>
          </div>

          {emBreve ? (
            <ListaEspera lancamento={textoLancamento()} />
          ) : (
            <div className="flex flex-[0_1_380px] flex-col gap-3">
              <Botao variante="compra" href="/palco/baixar" tamanho="xl">
                <Icone nome="baixar" />
                Baixar para Windows
              </Botao>
              <p className="text-center text-[14px] text-dark-text-3">Windows 10 e 11, 64 bits</p>
              <p className="border-t border-dark-line pt-3 text-center text-[15px] leading-[1.5] text-dark-text-2">
                7 dias grátis para quem tem o pacote, 3 dias para quem ainda não é cliente. Depois, {PALCO_PRECO_MENSAL} por mês.
              </p>
              <p className="text-center text-[14px] leading-[1.45] text-dark-text-3 lg:hidden">
                Está no celular? Abra trilhaviva.org/palco no computador para baixar.
              </p>
            </div>
          )}
        </div>

        <figure className="m-0 flex flex-col gap-2.5">
          <div className="aspect-video overflow-hidden border border-dark-frame bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMAGEM_PALCO} alt={ALT_PRINT} width="1920" height="1080" decoding="async" fetchPriority="high" className="block h-full w-full object-cover" />
          </div>
          <figcaption className="text-[14px] text-dark-text-3">
            Tela Ao Vivo, no meio de um culto: a música por partes em cima, a mesa embaixo, setlist e pad ao lado.
          </figcaption>
        </figure>
      </section>
    </div>
  )
}
