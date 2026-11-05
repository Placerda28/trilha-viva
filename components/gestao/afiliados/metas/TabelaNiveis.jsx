import { numero, moeda } from '../../formato'
import { mesPorExtenso } from '../afiliadosUtil'
import { NivelSelo } from '../lista/Pecas'

// Um conjunto de níveis em linhas: selo de metal, nome, a partir de quantas
// vendas e quanto cada venda paga. Serve para a tabela de hoje, as próximas e o histórico.

export function Niveis({ niveis }) {
  const ordem = [...niveis].sort((a, b) => a.vendas_minimas - b.vendas_minimas)
  return (
    <ul className="divide-y divide-line">
      {ordem.map((n) => (
        <li key={n.id ?? n.nome} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <NivelSelo nivel={n} niveis={ordem} tamanho={28} />
            <p className="figs mt-0.5 pl-[36px] text-[13.5px] text-ink-muted">
              A partir de {numero(n.vendas_minimas)} {n.vendas_minimas === 1 ? 'venda' : 'vendas'} no mês
            </p>
          </div>
          <p className="figs shrink-0 text-right text-[17px] font-extrabold text-ink">
            {moeda(n.valor_por_venda_centavos)}
            <span className="block text-[12.5px] font-normal text-ink-muted">por venda</span>
          </p>
        </li>
      ))}
    </ul>
  )
}

const SITUACAO = { vigente: 'Vigente', futura: 'Futura', anterior: 'Anterior' }

function Autoria({ c }) {
  if (!c.criado_por) return null
  return <span className="text-ink-muted">, gravada por {c.criado_por}</span>
}

// "Vale a partir de dezembro de 2026" para as futuras; "Vale desde ..." para a de hoje.
export function ConjuntoFuturo({ c }) {
  return (
    <div className="card-line px-4 py-4 sm:px-6">
      <h3 className="text-[16px] font-bold text-ink">
        Vale a partir de {mesPorExtenso(c.valido_desde_mes)}
        <span className="text-[14px] font-normal">
          <Autoria c={c} />
        </span>
      </h3>
      <Niveis niveis={c.niveis} />
    </div>
  )
}

// Histórico de mudanças: cada conjunto já gravado, do mais novo ao mais antigo.
export function HistoricoTabelas({ itens }) {
  if (itens.length === 0) return null
  return (
    <details className="card-line group px-4 sm:px-6">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-[15.5px] font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink [&::-webkit-details-marker]:hidden">
        Histórico de mudanças da tabela
        <span className="figs text-[13.5px] font-normal text-ink-muted">{itens.length === 1 ? '1 versão' : `${itens.length} versões`}</span>
      </summary>
      <ol className="divide-y divide-line border-t border-line">
        {itens.map((c) => (
          <li key={c.valido_desde_mes} className="py-4">
            <p className="text-[15px] font-semibold text-ink">
              Desde {mesPorExtenso(c.valido_desde_mes)}. <span className="font-normal text-ink-muted">{SITUACAO[c.situacao]}<Autoria c={c} />.</span>
            </p>
            <p className="mt-1 text-[14px] leading-[1.6] text-ink-muted">
              {[...c.niveis]
                .sort((a, b) => a.vendas_minimas - b.vendas_minimas)
                .map((n) => `${n.nome}: ${moeda(n.valor_por_venda_centavos)} a partir de ${numero(n.vendas_minimas)}`)
                .join('. ')}
              .
            </p>
          </li>
        ))}
      </ol>
    </details>
  )
}
