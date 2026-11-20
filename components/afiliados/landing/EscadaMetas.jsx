import { reais } from '@/lib/afiliados-campos'
import MedalhaPB from './MedalhaPB'

// Escada de metas da landing (MUDANÇAS §8): moldura preta, uma linha por nível
// com a medalha preto e branco, o valor por venda e a faixa de vendas. A barra
// preta com ponta vermelha tem o comprimento proporcional ao valor, então o salto
// de R$ 15 para R$ 30 se vê antes de se ler. `larguras` (em %) chega pronta da
// página; aqui não há conta de dinheiro. Server component.
function faixaDeVendas(nivel, proximo) {
  const de = nivel.vendas_minimas
  if (!proximo) return `${de} vendas no mês ou mais`
  const ate = proximo.vendas_minimas - 1
  if (ate <= de) return `${de} ${de === 1 ? 'venda' : 'vendas'} no mês`
  return `De ${de} a ${ate} vendas no mês`
}

export default function EscadaMetas({ niveis, larguras }) {
  return (
    <div className="flex flex-col border border-ink p-[clamp(20px,3cqi,32px)]">
      <ol className="flex flex-col">
        {niveis.map((nivel, i) => (
          <li key={nivel.nome} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-5 border-b border-line py-5">
            <MedalhaPB grau={i + 1} variante={i === niveis.length - 1 ? 'escura' : 'clara'} />
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <p className="text-[20px] font-bold">{nivel.nome}</p>
                <p className="font-semi-condensed whitespace-nowrap text-[30px] font-extrabold leading-none tabular-nums">
                  {reais(nivel.valor_por_venda_centavos)}
                  <span className="ml-1.5 text-[14px] font-semibold text-text-3 [font-stretch:100%]">por venda</span>
                </p>
              </div>
              <span aria-hidden="true" style={{ width: `${larguras[i]}%` }} className="block h-3 border-r-4 border-red bg-ink" />
              <p className="text-[15px] text-text-3">{faixaDeVendas(nivel, niveis[i + 1])}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="pt-5 text-[16px] font-semibold leading-[1.5]">Bateu a meta? Todas as vendas do mês passam a valer o valor novo.</p>
    </div>
  )
}
