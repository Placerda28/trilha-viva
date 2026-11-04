import { reais } from '@/lib/afiliados-campos'
import { dataBr, diaMes } from '@/lib/afiliados-painel'
import SituacaoVenda from './Situacao'

function Comissao({ v }) {
  return v.situacao === 'cancelada' ? (
    <span className="figs text-ink-faint line-through">{reais(v.comissaoCentavos)}</span>
  ) : (
    <span className="figs font-extrabold text-ink">{reais(v.comissaoCentavos)}</span>
  )
}

// Lista em linhas, para o celular e para o resumo do Início. O comprador chega
// mascarado do servidor (jo***@gmail.com).
export function VendaLinhas({ itens, resumida = false }) {
  return (
    <ul className="divide-y divide-line">
      {itens.map((v) => (
        <li key={v.compraId} className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="break-all text-[15.5px] font-semibold text-ink">{v.comprador}</p>
              <p className="mt-0.5 text-[13.5px] text-ink-muted">
                {resumida ? diaMes(v.data) : dataBr(v.data)}
                {!resumida && v.valorPagoCentavos ? ` · pagou ${reais(v.valorPagoCentavos)}` : ''}
              </p>
            </div>
            <p className="shrink-0 text-right text-[18px] leading-none">
              <Comissao v={v} />
            </p>
          </div>
          <div className="mt-2.5">
            <SituacaoVenda item={v} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Tabela para telas largas (aba Minhas vendas).
export function VendaTabela({ itens }) {
  return (
    <table className="w-full text-left text-[15px]">
      <caption className="sr-only">Vendas do mês</caption>
      <thead>
        <tr className="border-b border-line text-[13.5px] text-ink-muted">
          <th scope="col" className="py-3 pr-4 font-semibold">Data</th>
          <th scope="col" className="py-3 pr-4 font-semibold">Comprador</th>
          <th scope="col" className="py-3 pr-4 text-right font-semibold">Valor pago</th>
          <th scope="col" className="py-3 pr-6 text-right font-semibold">Sua comissão</th>
          <th scope="col" className="py-3 font-semibold">Situação</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {itens.map((v) => (
          <tr key={v.compraId}>
            <td className="figs py-3.5 pr-4 text-ink">{dataBr(v.data)}</td>
            <td className="py-3.5 pr-4 font-semibold text-ink">{v.comprador}</td>
            <td className="figs py-3.5 pr-4 text-right text-ink">{reais(v.valorPagoCentavos)}</td>
            <td className="py-3.5 pr-6 text-right">
              <Comissao v={v} />
            </td>
            <td className="py-3.5">
              <SituacaoVenda item={v} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
