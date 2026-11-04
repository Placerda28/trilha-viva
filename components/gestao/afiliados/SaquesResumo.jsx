import { moeda, numero } from '../formato'
import { tempoMedio } from './saquesUtil'

function Cartao({ rotulo, valor, detalhe, corte = false }) {
  return (
    <div className={'rounded-md border border-line bg-white p-4 sm:p-5 ' + (corte ? 'border-t-2 border-t-signal' : '')}>
      <p className="text-[13.5px] text-ink-muted">{rotulo}</p>
      <p className="figs mt-1.5 text-[24px] font-bold leading-none tracking-[-0.02em] text-ink sm:text-[28px]">{valor}</p>
      <p className="figs mt-2.5 text-[13px] text-ink-muted">{detalhe}</p>
    </div>
  )
}

// Os quatro números do topo. O cartão de pendentes leva o corte vermelho só
// quando há pedido esperando: é o único que pede ação.
export default function SaquesResumo({ resumo: r }) {
  const pendentes = Number(r.pendentes_qtd) || 0
  const pagos = Number(r.pagos_30d_qtd) || 0
  const recusados = Number(r.recusados_30d_qtd) || 0
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Cartao
        corte={pendentes > 0}
        rotulo="Esperando pagamento"
        valor={moeda(r.pendentes_valor_centavos)}
        detalhe={pendentes === 1 ? '1 pedido' : numero(pendentes) + ' pedidos'}
      />
      <Cartao
        rotulo="Pagos nos últimos 30 dias"
        valor={moeda(r.pagos_30d_valor_centavos)}
        detalhe={pagos === 1 ? '1 saque' : numero(pagos) + ' saques'}
      />
      <Cartao rotulo="Tempo médio para pagar" valor={tempoMedio(r.tempo_medio_horas)} detalhe="do pedido ao pagamento, em 30 dias" />
      <Cartao
        rotulo="Recusados nos últimos 30 dias"
        valor={numero(recusados)}
        detalhe={recusados === 1 ? '1 pedido' : numero(recusados) + ' pedidos'}
      />
    </div>
  )
}
