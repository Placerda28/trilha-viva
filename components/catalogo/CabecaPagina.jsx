import { Migalhas } from '@/components/ds'
import { cn } from '@/lib/cn'

// Migalhas + título da página, como nas telas de catálogo e de conteúdo do
// redesenho. `sobre` é a linha curta em caixa alta acima do título ("Artista",
// "Coleção"); `acao` fica à direita (botão de compra, por exemplo).
export default function CabecaPagina({ migalhas, sobre, titulo, intro, acao, grande = false, className }) {
  return (
    <>
      <Migalhas itens={migalhas} />
      <div className={cn('flex flex-wrap items-end justify-between gap-x-12 gap-y-5', className)}>
        <div className="flex flex-[1_1_480px] flex-col gap-2.5" style={{ maxWidth: grande ? 820 : 760 }}>
          {sobre && <p className="rotulo text-text-3">{sobre}</p>}
          <h1 className="font-semi-condensed text-[clamp(34px,5cqi,56px)] font-extrabold leading-none tracking-[-0.025em] [text-wrap:balance]">
            {titulo}
          </h1>
          {intro && (
            <p className={cn('leading-[1.55] text-text-2 [text-wrap:pretty]', grande ? 'text-[18px]' : 'text-[17px]')}>
              {intro}
            </p>
          )}
        </div>
        {acao}
      </div>
    </>
  )
}
