import { BotaoCompra, Icone, MolduraAccent } from '@/components/ds'
import { cn } from '@/lib/cn'
import { discountPct, priceBRL, site } from '@/lib/site'
import SemPacote from './SemPacote'

// O quadro "Não vendemos por música" (ficha, coleções, /bpm): moldura preta com
// o traço vermelho, o texto do pacote, os selos e o botão de compra. Só para
// quem ainda não tem o pacote (some depois que o navegador confirma o estado).
//
// `id` marca o botão para a barra de compra do celular (BarraCompra `fim`).
const SELOS = ['Download imediato', 'Pix ou cartão', 'Sem mensalidade', 'Garantia de 7 dias']

export default function PainelPacote({ titulo, texto, selos = true, id, className }) {
  return (
    <SemPacote>
      <MolduraAccent as="aside" traco={48} className={cn('flex flex-col gap-3 p-6', className)}>
        <p className="rotulo text-text-3">Não vendemos por música</p>
        <h2 className="font-semi-condensed text-[24px] font-[750] leading-[1.1]">{titulo}</h2>
        {texto && <p className="text-[15px] leading-[1.55] text-text-2">{texto}</p>}
        {selos && (
          <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1.5 p-0 text-[14px]">
            {SELOS.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Icone nome="check" tamanho={16} traco={2} />
                {t}
              </li>
            ))}
          </ul>
        )}
        <div id={id}>
          <BotaoCompra bloco />
        </div>
        <span className="figs text-center text-[13px] text-text-3">
          De {priceBRL(site.fullPrice)} por {priceBRL(site.price)}, com {discountPct}% de desconto no lançamento
        </span>
      </MolduraAccent>
    </SemPacote>
  )
}
