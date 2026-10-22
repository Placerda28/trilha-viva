// Barras horizontais finas: fundo `mist`, barra preta e a maior em vermelho
// (detalhe, uma só). Serve para "De onde vieram as vendas" e, na Fase 4, para
// o uso de cada cupom.
//
// itens: [{ id, rotulo, valor (número que dá o tamanho), texto (o que aparece à direita) }]
export default function BarrasHorizontais({ itens, rotuloLista }) {
  const maior = itens.reduce((m, i) => Math.max(m, i.valor), 0)
  return (
    <ul aria-label={rotuloLista} className="flex flex-col gap-3.5">
      {itens.map((i) => {
        const destaque = maior > 0 && i.valor === maior
        const pct = maior > 0 ? Math.max(2, (i.valor / maior) * 100) : 0
        return (
          <li key={i.id}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="min-w-0 truncate font-medium text-ink">{i.rotulo}</span>
              <span className="figs shrink-0 text-ink-muted">{i.texto}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-sm bg-mist" aria-hidden="true">
              <div
                className={'h-full rounded-sm ' + (destaque ? 'bg-signal' : 'bg-ink')}
                style={{ width: pct + '%' }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
