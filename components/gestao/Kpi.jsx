import Icone from './Icone'
import Minilinha from './Minilinha'

// Variação contra o período anterior, como fração (0,124 = 12,4%). Sem período
// anterior para comparar (zero ou vazio), devolve null e o cartão mostra "—".
export function variacao(atual, anterior) {
  if (!anterior) return null
  return (atual - anterior) / anterior
}

const PERCENTUAL = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Cartão de número único (plano 5.3). Variação: ▲ em preto, ▼ em vermelho de
// texto e "—" sem comparação. Nunca verde: a paleta não tem.
export default function Kpi({ rotulo, valor, variacao: v, detalhe, serie, rotuloSerie }) {
  const sem = v === null || v === undefined || Number.isNaN(v)
  const zero = !sem && Math.abs(v) < 0.0005
  const negativa = !sem && !zero && v < 0
  return (
    <div className="rounded-md border border-line bg-white p-4 sm:p-5">
      <p className="text-[13.5px] text-ink-muted">{rotulo}</p>
      <p className="figs mt-1.5 text-[24px] font-bold leading-none tracking-[-0.02em] text-ink sm:text-[28px]">{valor}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className={'figs flex items-center gap-1 text-[13px] font-semibold ' + (negativa ? 'text-signal-deep' : 'text-ink')}>
          {sem || zero ? (
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">sem comparação com o período anterior</span>
            </>
          ) : (
            <>
              <Icone nome={negativa ? 'desce' : 'sobe'} tamanho={9} />
              <span>{PERCENTUAL.format(Math.abs(v))}</span>
              <span className="sr-only">{negativa ? 'abaixo do período anterior' : 'acima do período anterior'}</span>
            </>
          )}
        </p>
        <Minilinha serie={serie} rotulo={rotuloSerie} />
      </div>
      {detalhe && <p className="figs mt-1 text-[13px] text-ink-muted">{detalhe}</p>}
    </div>
  )
}
