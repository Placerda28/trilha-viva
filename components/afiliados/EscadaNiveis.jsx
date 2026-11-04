import { reais } from '@/lib/afiliados-campos'

// A escada de metas: cada degrau é uma faixa cujo comprimento é o valor por
// venda, então o salto de R$ 15 para R$ 30 se vê antes de se ler. Os números
// vêm dos níveis do mês (a página busca no banco e passa por props). A cor do
// nível não entra aqui: o site é preto e branco com detalhe vermelho.
function faixaDeVendas(nivel, proximo) {
  const de = nivel.vendas_minimas
  if (!proximo) return `${de} vendas no mês ou mais`
  const ate = proximo.vendas_minimas - 1
  if (ate <= de) return `${de} ${de === 1 ? 'venda' : 'vendas'} no mês`
  return `De ${de} a ${ate} vendas no mês`
}

export default function EscadaNiveis({ niveis, escuro = false, className = '' }) {
  const lista = [...(niveis || [])].sort((a, b) => a.vendas_minimas - b.vendas_minimas)
  if (lista.length === 0) return null
  const maior = Math.max(...lista.map((n) => n.valor_por_venda_centavos)) || 1

  const texto = escuro ? 'text-white' : 'text-ink'
  const suave = escuro ? 'text-white/65' : 'text-ink-muted'
  const barra = escuro ? 'bg-white' : 'bg-ink'

  return (
    <div className={className}>
      <ol className="space-y-6">
        {lista.map((nivel, i) => (
          <li key={nivel.nome}>
            <div className="flex items-baseline justify-between gap-4">
              <p className={`text-[19px] font-bold ${texto}`}>{nivel.nome}</p>
              <p className={`figs text-[26px] font-extrabold leading-none tracking-[-0.02em] ${texto}`}>
                {reais(nivel.valor_por_venda_centavos)}
                <span className={`ml-1.5 text-[13.5px] font-semibold tracking-normal ${suave}`}>por venda</span>
              </p>
            </div>
            <div
              className={`mt-3 h-3 border-r-[4px] border-signal ${barra}`}
              style={{ width: `${Math.max(12, Math.round((nivel.valor_por_venda_centavos / maior) * 100))}%` }}
              aria-hidden="true"
            />
            <p className={`mt-2 text-[14px] ${suave}`}>{faixaDeVendas(nivel, lista[i + 1])}</p>
          </li>
        ))}
      </ol>
      <p className={`mt-7 border-t pt-5 text-[15.5px] font-semibold leading-[1.55] ${texto} ${escuro ? 'border-white/15' : 'border-line'}`}>
        Bateu a meta? Todas as vendas do mês passam a valer o valor novo.
      </p>
    </div>
  )
}
