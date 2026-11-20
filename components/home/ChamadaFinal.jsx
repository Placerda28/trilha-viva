'use client'

import { Botao, BotaoCompra } from '@/components/ds'
import { useUsuario } from '@/components/usuario'
import Secao from '@/components/venda/Secao'
import { LINHA_PRECO } from '@/lib/site'

// Seção 9 da home (MUDANÇAS §3): a chamada final. Quem já tem o pacote vê
// "Seu acervo está pronto." e "Abrir Minhas VS" (preto: só o botão de compra é
// vermelho). `data-rodape-colado` está no raiz da página (app/page.js): é esta
// faixa que encosta no rodapé.
export default function ChamadaFinal() {
  const tem = useUsuario() === 'com-pacote'
  return (
    <Secao aria-labelledby="h-final" className="border-t border-line" interno="flex flex-wrap items-end justify-between gap-x-12 gap-y-7">
      <div className="flex max-w-[640px] flex-col gap-3">
        <h2
          id="h-final"
          className="font-semi-condensed text-[clamp(40px,6cqi,76px)] font-[800] leading-[.98] tracking-[-0.025em]"
        >
          {tem ? 'Seu acervo está pronto.' : 'Domingo chega rápido.'}
        </h2>
        <p className="text-[18px] leading-[1.5] text-text-2">
          {tem
            ? 'Escolha as músicas do próximo culto e baixe até 30 por dia.'
            : 'Libere o acervo hoje e monte o setlist ainda esta semana.'}
        </p>
      </div>
      <div className="flex min-w-[240px] flex-[0_1_340px] flex-col gap-2.5">
        {tem ? (
          <Botao href="/minha-conta/acervo" tamanho="lg" bloco>
            Abrir Minhas VS
          </Botao>
        ) : (
          <>
            <BotaoCompra bloco />
            <p className="text-center text-[14px] tabular-nums text-text-3">{LINHA_PRECO}</p>
          </>
        )}
      </div>
    </Secao>
  )
}
