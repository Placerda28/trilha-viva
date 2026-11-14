import Icone from './Icone'
import Minilinha from './Minilinha'

// Variação contra o período anterior, como fração (0,124 = 12,4%). Sem período
// anterior para comparar (zero ou vazio), devolve null e o cartão mostra "—".
export function variacao(atual, anterior) {
  if (!anterior) return null
  return (atual - anterior) / anterior
}

const PERCENTUAL = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
const PONTOS = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function compararKpi(variacao, pontos) {
  const emPontos = pontos !== undefined && pontos !== null
  const valor = emPontos ? pontos : variacao
  const sem = valor === null || valor === undefined || Number.isNaN(valor)
  const zero = !sem && Math.abs(valor) < (emPontos ? 0.05 : 0.0005)
  return { emPontos, sem, zero, negativa: !sem && !zero && valor < 0,
    texto: emPontos ? PONTOS.format(Math.abs(valor)) + ' p.p.' : PERCENTUAL.format(Math.abs(valor)) }
}

// Cartão de número único (plano 5.3). Variação: ▲ em preto, ▼ em vermelho de
// texto e "—" sem comparação. Nunca verde: a paleta não tem.
// `invertida`: para números que pioram quando sobem (custo), o vermelho vai na subida.
export default function Kpi({ rotulo, valor, variacao: v, pontos, detalhe, serie, rotuloSerie, invertida = false }) {
  const { emPontos, sem, zero, negativa, texto } = compararKpi(v, pontos)
  const ruim = invertida ? !sem && !zero && !negativa : negativa
  return (
    <div className="rounded-md border border-line bg-white p-4 sm:p-5">
      <p className="text-[13.5px] text-ink-muted">{rotulo}</p>
      <p className="figs mt-1.5 text-[24px] font-bold leading-none tracking-[-0.02em] text-ink sm:text-[28px]">{valor}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className={'figs flex items-center gap-1 text-[13px] font-semibold ' + (ruim ? 'text-signal-deep' : 'text-ink')}>
          {sem || zero ? (
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">sem comparação com o período anterior</span>
            </>
          ) : (
            <>
              <Icone nome={negativa ? 'desce' : 'sobe'} tamanho={9} />
              <span>{texto}</span>
              <span className="sr-only">{(emPontos ? 'pontos percentuais ' : '') + (negativa ? 'abaixo do período anterior' : 'acima do período anterior')}</span>
            </>
          )}
        </p>
        <Minilinha serie={serie} rotulo={rotuloSerie} />
      </div>
      {detalhe && <p className="figs mt-1 text-[13px] text-ink-muted">{detalhe}</p>}
    </div>
  )
}
