import { moeda, numero } from '../../formato'
import { mesLongo } from '../painelUtil'

// O resumo mensal em tabela (especificação 6.4): vendas por afiliado, receita
// bruta, taxas do Mercado Pago, receita líquida, comissões, bônus, ajustes,
// estornos, custo e lucro. Cobre os meses inteiros que o período toca. A
// tabela rola dentro do próprio bloco e a coluna do mês fica fixa.
// `estimadas` = vendas sem a taxa informada (contadas pelo valor cheio).

const COLUNAS = [
  ['vendas', 'Vendas', numero],
  ['bruto', 'Receita bruta', moeda],
  ['taxas', 'Taxas Mercado Pago', moeda],
  ['liquido', 'Receita líquida', moeda],
  ['comissoes_base', 'Comissões', moeda],
  ['bonus', 'Bônus de nível', moeda],
  ['ajustes', 'Ajustes', moeda],
  ['estornos', 'Estornos', moeda],
  ['custo', 'Custo do programa', moeda],
  ['lucro', 'Lucro', moeda],
]

const CELULA = 'figs whitespace-nowrap px-3 py-2.5 text-right text-[13.5px] '

function Celula({ coluna, linha, total }) {
  const [chave, , formato] = coluna
  const v = linha[chave]
  const estimada = chave === 'liquido' && linha.estimadas > 0
  const ruim = chave === 'lucro' && v < 0
  return (
    <td className={CELULA + (total ? 'font-bold ' : '') + (ruim ? 'text-signal-deep' : 'text-ink')}>
      {formato(v)}
      {estimada && (
        <span title={linha.estimadas + ' vendas sem a taxa informada, contadas pelo valor cheio'} className="ml-0.5 font-bold text-signal-deep">
          *<span className="sr-only"> ({linha.estimadas} {linha.estimadas === 1 ? 'venda' : 'vendas'} sem a taxa informada)</span>
        </span>
      )}
    </td>
  )
}

export default function ResumoMensal({ resumo }) {
  const { meses, totais } = resumo
  const estimadas = totais.estimadas
  return (
    <section aria-labelledby="titulo-resumo" className="rounded-md border border-line bg-white p-4 sm:p-5">
      <h2 id="titulo-resumo" className="text-[17px] font-bold tracking-[-0.01em] text-ink">Resumo mensal</h2>
      <p className="mt-1 text-[14px] text-ink-muted">Meses inteiros que o período toca. Só vendas por afiliado. Lucro é receita líquida menos custo.</p>
      {meses.length === 0 ? (
        <p className="mt-4 rounded border border-dashed border-mist-deep px-4 py-6 text-center text-[14px] text-ink-muted">Nenhum mês neste período.</p>
      ) : (
        <div className="relative -mx-4 mt-3 overflow-x-auto sm:mx-0 sm:rounded sm:border sm:border-line" tabIndex={0} role="region" aria-label="Resumo mensal, role para os lados para ver todas as colunas">
          <table className="w-full min-w-max border-collapse">
            <thead className="bg-mist">
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-mist px-3 py-2.5 text-left text-[13px] font-semibold text-ink">Mês</th>
                {COLUNAS.map(([k, rotulo]) => (
                  <th key={k} scope="col" className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-semibold text-ink">
                    {rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {meses.map((m) => (
                <tr key={m.mes}>
                  <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2.5 text-left text-[13.5px] font-semibold text-ink first-letter:uppercase">
                    {mesLongo(m.mes)}
                  </th>
                  {COLUNAS.map((c) => (
                    <Celula key={c[0]} coluna={c} linha={m} />
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-ink">
              <tr>
                <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2.5 text-left text-[13.5px] font-bold text-ink">Total</th>
                {COLUNAS.map((c) => (
                  <Celula key={c[0]} coluna={c} linha={totais} total />
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {estimadas > 0 && (
        <p className="mt-3 text-[13px] text-ink-muted">
          <span className="font-bold text-signal-deep">*</span> {numero(estimadas)} {estimadas === 1 ? 'venda antiga não tem' : 'vendas antigas não têm'} a taxa do Mercado Pago e{' '}
          {estimadas === 1 ? 'foi contada' : 'foram contadas'} pelo valor cheio.
        </p>
      )}
    </section>
  )
}
