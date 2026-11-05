import { reais } from '@/lib/afiliados-campos'
import Moeda3D from './Moeda3D'

// Escada de metas da landing: uma linha por nível, com a moeda de metal (que
// gira ao entrar na tela e inclina ao toque), o valor por venda e a faixa de
// vendas. A faixa colorida tem o comprimento proporcional ao valor, então o
// salto de R$ 15 para R$ 30 se vê antes de se ler. `larguras` (em %) chega
// pronta da página; aqui não há conta de dinheiro. Server component.
function faixaDeVendas(nivel, proximo) {
  const de = nivel.vendas_minimas
  if (!proximo) return `${de} vendas no mês ou mais`
  const ate = proximo.vendas_minimas - 1
  if (ate <= de) return `${de} ${de === 1 ? 'venda' : 'vendas'} no mês`
  return `De ${de} a ${ate} vendas no mês`
}

export default function EscadaMetas({ niveis, larguras }) {
  return (
    <div>
      <ol className="divide-y divide-line">
        {niveis.map((nivel, i) => (
          <li key={nivel.nome} className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-x-5 py-6 first:pt-0 last:pb-0 sm:gap-x-7">
            <Moeda3D cor={nivel.cor} grau={i + 1} tamanho={92} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <p className="text-[20px] font-bold leading-tight tracking-[-0.015em] text-ink">{nivel.nome}</p>
                <p className="figs text-[30px] font-extrabold leading-none tracking-[-0.025em] text-ink">
                  {reais(nivel.valor_por_venda_centavos)}
                  <span className="ml-1.5 text-[13.5px] font-semibold tracking-normal text-ink-muted">por venda</span>
                </p>
              </div>
              <div
                data-rv="barra"
                style={{ width: `${larguras[i]}%`, '--i': i + 1 }}
                className="mt-3 h-3 border-r-[4px] border-signal bg-ink"
                aria-hidden="true"
              />
              <p className="mt-2 text-[14.5px] leading-snug text-ink-muted">{faixaDeVendas(nivel, niveis[i + 1])}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-7 border-t border-line pt-5 text-[15.5px] font-semibold leading-[1.55] text-ink">
        Bateu a meta? Todas as vendas do mês passam a valer o valor novo.
      </p>
    </div>
  )
}
