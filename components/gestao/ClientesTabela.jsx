import { dataHora, moeda, numero, FORMAS } from './formato'

// Uma linha por cliente (ou por compra, na tela de período). No computador é
// uma tabela; no celular, uma lista em que cada cliente é um bloco — sete
// colunas não cabem em 375 px sem rolar de lado.

function Forma({ forma }) {
  if (!forma) return <span className="text-ink-faint">—</span>
  return <span>{FORMAS[forma] || forma}</span>
}

function Marcas({ c }) {
  const status = c.compra?.status
  return (
    <>
      {c.bloqueado && (
        <span className="rounded-sm border border-signal-deep px-1.5 py-0.5 text-[11.5px] font-semibold text-signal-deep">
          Bloqueado
        </span>
      )}
      {status && status !== 'pago' && (
        <span className="rounded-sm border border-line px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-muted">
          {status}
        </span>
      )}
    </>
  )
}

function Nome({ c }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">{c.nome || 'Sem nome'}</span>
        <Marcas c={c} />
      </span>
      <span className="block break-all text-[13.5px] text-ink-muted">{c.email}</span>
    </>
  )
}

const chave = (c, i) => (c.compra?.id || 'c') + '-' + c.id + '-' + i

export default function ClientesTabela({ itens }) {
  return (
    <>
      <div className="mt-6 hidden overflow-hidden rounded border border-line bg-white md:block">
        <table className="w-full text-left text-[14.5px]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[12.5px] text-ink-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
              <th scope="col" className="px-4 py-3 font-semibold">Compra</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Valor</th>
              <th scope="col" className="px-4 py-3 font-semibold">Forma</th>
              <th scope="col" className="px-4 py-3 font-semibold">Cupom</th>
              <th scope="col" className="px-4 py-3 font-semibold">Senha</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Downloads</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens.map((c, i) => (
              <tr key={chave(c, i)} className="align-top">
                <td className="max-w-[320px] px-4 py-3.5">
                  <Nome c={c} />
                </td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-ink-muted">{dataHora(c.compra?.em)}</td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-right text-ink">
                  {c.compra ? moeda(c.compra.valor_centavos) : '—'}
                </td>
                <td className="px-4 py-3.5 text-ink">
                  <Forma forma={c.compra?.forma} />
                </td>
                <td className="px-4 py-3.5 text-ink">
                  {c.compra?.cupom || <span className="text-ink-faint">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  {c.tem_senha ? (
                    <span className="text-ink">Criou</span>
                  ) : (
                    <span className="text-ink-muted">Não criou</span>
                  )}
                </td>
                <td className="figs px-4 py-3.5 text-right text-ink">{numero(c.downloads)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 divide-y divide-line rounded border border-line bg-white md:hidden">
        {itens.map((c, i) => (
          <li key={chave(c, i)} className="px-4 py-4">
            <Nome c={c} />
            <dl className="figs mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13.5px]">
              <div>
                <dt className="text-ink-muted">Compra</dt>
                <dd className="text-ink">{dataHora(c.compra?.em)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Valor</dt>
                <dd className="text-ink">
                  {c.compra ? moeda(c.compra.valor_centavos) : '—'}
                  {c.compra?.forma && <> · <Forma forma={c.compra.forma} /></>}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Senha</dt>
                <dd className="text-ink">{c.tem_senha ? 'Criou' : 'Não criou'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Downloads</dt>
                <dd className="text-ink">{numero(c.downloads)}</dd>
              </div>
              {c.compra?.cupom && (
                <div className="col-span-2">
                  <dt className="text-ink-muted">Cupom</dt>
                  <dd className="text-ink">{c.compra.cupom}</dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
