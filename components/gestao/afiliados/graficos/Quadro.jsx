import Icone from '../../Icone'

// A moldura de todo gráfico do Dashboard: título, uma linha que diz o que se
// vê, legenda (quando há 2 séries ou mais), o gráfico e a "tabela" que diz
// a mesma coisa em texto (para leitor de tela e para quem prefere números).
// `vazio` troca o gráfico por uma frase; `semDado` avisa "ainda sem dado".
//
// `tabela`: { colunas: [rotulos], linhas: [[células]] }. A primeira coluna é o
// nome da linha.

export function Legenda({ itens }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13.5px] text-ink-muted" aria-label="Legenda">
      {itens.map((i) => (
        <li key={i.id} className="flex items-center gap-2">
          {i.linha ? (
            <span aria-hidden="true" className="h-[2px] w-4 rounded-sm" style={{ backgroundColor: i.cor }} />
          ) : (
            <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ backgroundColor: i.cor }} />
          )}
          {i.nome}
        </li>
      ))}
    </ul>
  )
}

function Tabela({ tabela, legenda }) {
  return (
    <details className="group mt-3 border-t border-line pt-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[14px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink [&::-webkit-details-marker]:hidden">
        <Icone nome="direita" tamanho={16} className="text-ink-muted transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" />
        Ver como tabela
      </summary>
      <div className="relative max-h-72 overflow-auto rounded border border-line">
        <table className="w-full min-w-max border-collapse text-left text-[13.5px]">
          <caption className="sr-only">{legenda}</caption>
          <thead className="sticky top-0 bg-mist">
            <tr>
              {tabela.colunas.map((c, i) => (
                <th key={c} scope="col" className={'whitespace-nowrap px-3 py-2 font-semibold text-ink ' + (i ? 'text-right' : '')}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tabela.linhas.map((l) => (
              <tr key={l[0]}>
                {l.map((c, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-ink">
                      {c}
                    </th>
                  ) : (
                    <td key={i} className="figs whitespace-nowrap px-3 py-2 text-right text-ink">
                      {c}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export default function Quadro({ titulo, texto, legenda, tabela, vazio, semDado, className = '', children }) {
  return (
    <figure className={'min-w-0 rounded-md border border-line bg-white px-4 pb-2 pt-4 sm:px-5 ' + className}>
      <figcaption>
        <h3 className="text-[15.5px] font-bold tracking-[-0.01em] text-ink">{titulo}</h3>
        {texto && <p className="mt-0.5 text-[13.5px] text-ink-muted">{texto}</p>}
      </figcaption>
      {legenda && legenda.length > 1 && <div className="mt-3"><Legenda itens={legenda} /></div>}
      {semDado ? (
        <p className="mt-4 rounded border border-dashed border-mist-deep px-4 py-6 text-center text-[14px] text-ink-muted">
          <span className="block font-semibold text-ink">Ainda sem dado</span>
          {semDado}
        </p>
      ) : vazio ? (
        <p className="mt-4 rounded border border-dashed border-mist-deep px-4 py-6 text-center text-[14px] text-ink-muted">{vazio}</p>
      ) : (
        <>
          <div className="mt-3">{children}</div>
          {tabela && <Tabela tabela={tabela} legenda={titulo} />}
        </>
      )}
      {(semDado || vazio) && <div className="pb-2" />}
    </figure>
  )
}
