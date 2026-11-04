import { nomeDoMes, resumoGrafico, serieDoMes, textoRitmo, vendasTxt } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'

// Barras feitas à mão em SVG (sem biblioteca). As barras esticam com a largura;
// por isso rótulos e a linha tracejada do ritmo são HTML por cima, que não
// deformam. Para quem usa leitor de tela: texto-resumo no lugar do desenho e a
// mesma informação em tabela.
export default function GraficoVendas({ d }) {
  const { mes, vendasPorDia, ritmoNecessario, proximo } = d
  const serie = serieDoMes(mes, vendasPorDia)
  const nome = nomeDoMes(mes).toLowerCase()
  const r = resumoGrafico(serie, nome)
  const ritmo = proximo && ritmoNecessario ? ritmoNecessario : null
  const maxBarra = Math.max(...serie.map((x) => x.vendas), 0)
  const topo = Math.max(maxBarra, ritmo ? Math.ceil(ritmo) : 0, 3)
  const n = serie.length
  const rotuloRitmo = ritmo ? `Ritmo para o ${proximo.nome}: ${textoRitmo(ritmoNecessario)}` : ''
  const resumo = `Gráfico de barras de vendas por dia em ${nome}. ${r.texto}${rotuloRitmo ? ` ${rotuloRitmo}.` : ''}`
  const comVenda = serie.filter((x) => x.vendas > 0)

  return (
    <section className="card-line px-5 py-6 sm:px-8 sm:py-7" aria-labelledby="grafico-titulo">
      <h2 id="grafico-titulo" className="text-[17px] font-bold text-ink">
        Vendas por dia{' '}
        <Ajuda titulo="Vendas por dia">
          <p>Cada barra é um dia de {nome}. Quanto mais alta, mais vendas naquele dia.</p>
          {ritmo ? <p>A linha tracejada vermelha é o ritmo que você precisa manter para chegar ao {proximo.nome}.</p> : null}
        </Ajuda>
      </h2>
      <p className="mt-1 text-[14.5px] text-ink-muted">{r.total === 0 ? r.texto : `${vendasTxt(r.total)} em ${nome}.`}</p>

      <div className="mt-5 grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
        <div className="figs relative h-40 text-right text-[12.5px] leading-none text-ink-muted sm:h-48" aria-hidden="true">
          <span className="absolute right-0 top-0 -translate-y-1/2">{topo}</span>
          <span className="absolute bottom-0 right-0 translate-y-1/2">0</span>
        </div>
        <div>
          <div className="relative h-40 border-b border-ink/70 sm:h-48" role="img" aria-label={resumo}>
            <div className="absolute inset-x-0 top-0 border-t border-line" aria-hidden="true" />
            <svg viewBox={`0 0 ${n * 10} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
              {serie.map((x, i) => (
                <rect key={x.dia} x={i * 10 + 1.5} width="7" y={100 - (x.vendas / topo) * 100} height={(x.vendas / topo) * 100} fill="#0D0D0D" />
              ))}
            </svg>
            {ritmo ? (
              <div className="pointer-events-none absolute inset-x-0" style={{ bottom: `${Math.min(100, (ritmo / topo) * 100)}%` }} aria-hidden="true">
                <div className="border-t-2 border-dashed border-signal" />
                <span className="absolute right-0 -top-5 text-[12.5px] font-semibold text-signal-deep">ritmo</span>
              </div>
            ) : null}
          </div>
          <div className="figs relative mt-2 h-5 text-[12.5px] text-ink-muted" aria-hidden="true">
            {[1, 10, 20, n].map((dia) => (
              <span key={dia} className="absolute -translate-x-1/2" style={{ left: `${((dia - 0.5) / n) * 100}%` }}>
                {dia}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-3 border-t border-line pt-1">
        <summary className="flex min-h-11 cursor-pointer items-center text-[14.5px] font-semibold text-ink">Ver os números em tabela</summary>
        {comVenda.length ? (
          <table className="figs mt-1 w-full max-w-xs text-left text-[14.5px]">
            <caption className="sr-only">Vendas por dia em {nome}</caption>
            <thead>
              <tr className="text-ink-muted">
                <th scope="col" className="py-1.5 pr-4 font-semibold">Dia</th>
                <th scope="col" className="py-1.5 font-semibold">Vendas</th>
              </tr>
            </thead>
            <tbody>
              {comVenda.map((x) => (
                <tr key={x.dia} className="border-t border-line">
                  <th scope="row" className="py-1.5 pr-4 font-semibold text-ink">{x.dia}</th>
                  <td className="py-1.5 text-ink">{x.vendas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-2 text-[14.5px] text-ink-muted">Ainda não há vendas neste mês.</p>
        )}
      </details>
    </section>
  )
}
