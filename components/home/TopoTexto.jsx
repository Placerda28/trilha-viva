'use client'

import { Botao, BotaoCompra, Icone } from '@/components/ds'
import { useUsuario } from '@/components/usuario'
import { discountPct, priceBRL, site } from '@/lib/site'

// Texto do topo da home (MUDANÇAS §3, item 1). É cliente só por causa de
// useUsuario(): a página é estática e nasce como "visitante"; quem já tem o
// pacote vê "Suas 2.000 VS estão liberadas." no lugar do preço.
//
// Vermelho: só o botão de compra e o quadradinho do selo de desconto.

const SELOS = ['Pagamento seguro pelo Mercado Pago', 'Acesso liberado na hora', 'Garantia de 7 dias']

export default function TopoTexto() {
  const tem = useUsuario() === 'com-pacote'

  return (
    <div className="relative z-[1] flex flex-col gap-[22px] pb-[clamp(56px,7cqi,112px)] pl-[max(clamp(20px,4cqi,32px),calc((100cqi_-_1280px)/2_+_32px))] pr-[clamp(20px,4cqi,48px)] pt-[clamp(48px,7cqi,112px)]">
      {!tem && (
        <p className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-dark-text-2">
          <span aria-hidden="true" className="h-2 w-2 bg-red" />
          {discountPct}% de desconto no lançamento
        </p>
      )}

      <h1
        id="h-topo"
        className="max-w-[640px] font-semi-condensed text-[clamp(42px,6.2cqi,80px)] font-[800] leading-[.98] tracking-[-0.025em] [text-wrap:balance]"
      >
        2.000 multitracks gospel na sua igreja.
      </h1>
      <p className="max-w-[520px] text-[clamp(18px,1.6cqi,21px)] leading-[1.5] text-dark-text-2 [text-wrap:pretty]">
        Clique, guia e cada instrumento em um canal separado.
      </p>

      {tem ? (
        <>
          <p className="mt-1.5 text-[20px] font-semibold">Suas 2.000 VS estão liberadas.</p>
          <div className="flex max-w-[520px] flex-wrap gap-3">
            <Botao variante="contorno" tamanho="lg" href="/minha-conta/acervo" className="flex-[1_1_220px]">
              Abrir Minhas VS
            </Botao>
            <Botao variante="noEscuro" tamanho="lg" href="/como-usar" className="flex-[1_1_160px]">
              Como usar
            </Botao>
          </div>
        </>
      ) : (
        <>
          <div className="mt-1.5 flex flex-col gap-0.5">
            <span className="text-[16px] text-dark-text-3 line-through tabular-nums">de {priceBRL(site.fullPrice)}</span>
            <span className="font-semi-condensed text-[clamp(44px,5cqi,60px)] font-[800] leading-none tracking-[-0.02em] tabular-nums">
              {priceBRL(site.price)}
            </span>
            <span className="mt-1 text-[16px] text-dark-text-2">pagamento único, acesso vitalício</span>
          </div>
          <div className="mt-2 flex max-w-[520px] flex-wrap gap-3">
            <BotaoCompra tamanho="lg" className="flex-[1_1_220px]" />
            <Botao variante="noEscuro" tamanho="lg" href="/musicas" className="flex-[1_1_160px]">
              Ver o acervo
            </Botao>
          </div>
          <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-dark-text-3">
            {SELOS.map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <Icone nome="check" tamanho={16} />
                {s}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
