import Link from 'next/link'
import { EmBreve } from '@/components/ds'
import { LogoMark } from '@/components/Logo'
import Secao from '@/components/venda/Secao'
import { H2, LINK } from '@/components/venda/estilos'
import { PALCO_PRECO_MENSAL, PALCO_TESTE_SEM_PACOTE, textoLancamento } from '@/lib/palco'
import { tools } from '@/lib/tools'

// Seção 6 da home (MUDANÇAS §3): qual programa usar. O Palco é o primeiro quadro,
// o único com fundo preto da seção; REAPER, Ableton Live e Prime continuam iguais
// (nomes, plataformas, textos e preços vêm de lib/tools.js).
const programas = tools.slice(0, 3)
const ROTULO = 'text-[13px] font-semibold uppercase tracking-[0.06em]'

export default function Programas({ palco = 'em-breve', lancamento }) {
  const emBreve = palco !== 'lancado'
  return (
    <Secao aria-labelledby="h-programas" interno="flex flex-col gap-8">
      <div className="flex max-w-[760px] flex-col gap-3">
        <h2 id="h-programas" className={H2}>
          Qual programa usar para rodar o multitrack
        </h2>
        <p className="text-[17px] leading-[1.6] text-text-2 [text-wrap:pretty]">
          Você precisa de algo que toque vários canais ao mesmo tempo e mande o clique só para o fone. Estes são os que
          mais funcionam em igreja no Brasil.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-8">
        <div data-tema="escuro" className="flex flex-col gap-2.5 bg-ink p-5 text-white">
          <div className="flex flex-wrap items-center gap-2.5">
            <LogoMark size={28} tone="light" />
            <h3 className="font-semi-condensed text-[24px] font-bold leading-[1.1]">Palco</h3>
            {emBreve && <EmBreve tema="escuro" />}
          </div>
          <p className={`${ROTULO} text-dark-text-3`}>Windows · Mac e celular depois</p>
          <p className="text-[15px] leading-[1.55] text-dark-text-2 [text-wrap:pretty]">
            Produzido pela equipe Trilha Viva. Clique e guia no fone, partes da música, pad e setlist. Quem tem o pacote
            vê as 2.000 VS dentro dele.
          </p>
          <p className="text-[14px] leading-[1.45] text-dark-text-3">
            {emBreve ? textoLancamento(lancamento) : `${PALCO_PRECO_MENSAL} por mês · ${PALCO_TESTE_SEM_PACOTE}`}
          </p>
        </div>

        {programas.map((p) => (
          <div key={p.slug} className="flex flex-col gap-2.5 border-t border-ink pt-[18px]">
            <h3 className="font-semi-condensed text-[24px] font-bold leading-[1.1]">{p.name}</h3>
            <p className={`${ROTULO} text-text-3`}>{p.platform}</p>
            <p className="text-[15px] leading-[1.55] text-text-2 [text-wrap:pretty]">{p.summary}</p>
            <p className="text-[14px] leading-[1.45] text-text-3">{p.price}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <Link href="/como-usar" className={LINK}>
          Ver o guia de configuração
        </Link>
        <span className="text-[15px] text-text-3">Também cobrimos Waveform Free, Cantabile, Studio One e uso no tablet.</span>
      </div>
    </Secao>
  )
}
