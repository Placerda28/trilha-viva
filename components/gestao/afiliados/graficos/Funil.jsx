import { numero } from '../../formato'
import { pctTexto } from '../painelUtil'

// Funil de cliques até vendas: etapas em ordem (uma cor só, barra mais curta a
// cada passo), com a taxa de passagem entre elas. Os estornos ficam à parte e
// em vermelho: são venda que voltou, não uma etapa do caminho.
// funil: { cliques, checkouts, vendas, estornos: { reembolsos, chargebacks, total }, taxa_clique_checkout, taxa_checkout_venda }

const MIN = 0.8 // largura mínima, em %, para a etapa pequena não sumir

export function tabelaDoFunil(f) {
  return {
    colunas: ['Etapa', 'Quantidade', 'Passagem'],
    linhas: [
      ['Cliques no link', numero(f.cliques), '—'],
      ['Checkouts iniciados', numero(f.checkouts), pctTexto(f.taxa_clique_checkout)],
      ['Vendas', numero(f.vendas), pctTexto(f.taxa_checkout_venda)],
      ['Reembolsos', numero(f.estornos.reembolsos), '—'],
      ['Chargebacks', numero(f.estornos.chargebacks), '—'],
    ],
  }
}

function Etapa({ rotulo, valor, base, taxa, textoTaxa, vermelho }) {
  const pct = base > 0 ? Math.max(MIN, (valor / base) * 100) : 0
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-[14px]">
        <span className="font-medium text-ink">{rotulo}</span>
        <span className="figs font-semibold text-ink">{numero(valor)}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-sm bg-mist" aria-hidden="true">
        <div className={'h-full rounded-sm ' + (vermelho ? 'bg-signal' : 'bg-ink')} style={{ width: (valor > 0 ? pct : 0) + '%' }} />
      </div>
      {textoTaxa && (
        <p className="figs mt-1 text-[13px] text-ink-muted">
          {taxa === null || taxa === undefined ? 'Sem base para calcular' : pctTexto(taxa) + ' ' + textoTaxa}
        </p>
      )}
    </li>
  )
}

export default function Funil({ funil: f }) {
  const base = Math.max(f.cliques, f.checkouts, f.vendas)
  return (
    <div>
      <ol className="flex flex-col gap-4" aria-label="Etapas do funil">
        <Etapa rotulo="Cliques no link" valor={f.cliques} base={base} />
        <Etapa rotulo="Checkouts iniciados" valor={f.checkouts} base={base} taxa={f.taxa_clique_checkout} textoTaxa="dos cliques foram ao checkout" />
        <Etapa rotulo="Vendas" valor={f.vendas} base={base} taxa={f.taxa_checkout_venda} textoTaxa="dos checkouts viraram venda" />
      </ol>
      <div className="mt-5 border-t border-line pt-4">
        <ul>
          <Etapa rotulo="Estornos" valor={f.estornos.total} base={Math.max(f.vendas + f.estornos.total, 1)} vermelho />
        </ul>
        <p className="figs mt-1 text-[13px] text-ink-muted">
          {numero(f.estornos.reembolsos)} {f.estornos.reembolsos === 1 ? 'reembolso' : 'reembolsos'} e {numero(f.estornos.chargebacks)}{' '}
          {f.estornos.chargebacks === 1 ? 'chargeback' : 'chargebacks'} de vendas por afiliado
        </p>
      </div>
    </div>
  )
}
