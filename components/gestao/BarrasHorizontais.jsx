// Prismas baixos sobre trilho `mist`. A maior barra ganha o detalhe vermelho.
//
// itens: [{ id, rotulo, valor (número que dá o tamanho), texto (o que aparece à direita) }]
export default function BarrasHorizontais({ itens, rotuloLista }) {
  const maior = itens.reduce((m, i) => Math.max(m, i.valor), 0)
  const indiceMaior = itens.findIndex((i) => i.valor === maior)
  return (
    <ul aria-label={rotuloLista} className="flex flex-col gap-3.5">
      {itens.map((i, indice) => {
        const destaque = maior > 0 && indice === indiceMaior
        const pct = maior > 0 ? Math.max(2, (i.valor / maior) * 100) : 0
        return (
          <li key={i.id}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="min-w-0 truncate font-medium text-ink">{i.rotulo}</span>
              <span className="figs shrink-0 text-ink-muted">{i.texto}</span>
            </div>
            <div className="mt-1.5 h-[15px] bg-mist" aria-hidden="true">
              {pct > 0 && <div
                className="relative h-full"
                style={{ width: pct + '%' }}
              >
                <div className={'absolute bottom-0 left-0 right-[5px] top-[5px] ' + (destaque ? 'bg-signal' : 'bg-ink')} />
                <div className={'absolute bottom-0 right-0 top-0 w-[5px] [clip-path:polygon(0_5px,100%_0,100%_10px,0_100%)] ' + (destaque ? 'bg-signal-deep' : 'bg-ink-muted')} />
                <div className={'absolute inset-x-0 top-0 h-[5px] [clip-path:polygon(5px_0,100%_0,calc(100%_-_5px)_100%,0_100%)] ' + (destaque ? 'bg-signal-lite' : 'bg-mist-deep')} />
              </div>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
