import { ACOES } from '../../Registro'
import { dataHora } from '../../formato'
import { detalheDaAcao } from '../afiliadosUtil'

// Anotações internas (só a equipe lê) e o histórico de tudo que foi feito com
// esse afiliado, do mais novo para o mais antigo.

export function Anotacoes({ itens, aoAnotar }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 pt-4">
        <p className="text-[14.5px] text-ink-muted">Só a equipe lê estas anotações.</p>
        <button type="button" onClick={aoAnotar} className="btn-ink min-h-11 shrink-0 !px-5 !py-2.5 !text-[14.5px]">
          Anotar
        </button>
      </div>
      {itens.length === 0 ? (
        <p className="py-8 text-center text-[14.5px] text-ink-muted">Nenhuma anotação ainda.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {itens.map((n) => (
            <li key={n.id} className="py-3.5">
              <p className="whitespace-pre-line break-words text-[15px] leading-[1.55] text-ink">{n.texto}</p>
              <p className="figs mt-1 text-[13px] text-ink-muted">
                {n.autor}, {dataHora(n.criado_em)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function HistoricoAcoes({ itens }) {
  if (itens.length === 0) return <p className="py-8 text-center text-[14.5px] text-ink-muted">Ainda não há ações registradas.</p>
  return (
    <ul className="divide-y divide-line">
      {itens.map((r) => {
        const detalhe = detalheDaAcao(r.acao, r.detalhe)
        return (
          <li key={r.id} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:gap-6">
            <span className="figs shrink-0 text-[13px] text-ink-muted sm:w-[140px]">{dataHora(r.quando)}</span>
            <span className="min-w-0 text-[14.5px] text-ink">
              <span className="break-words font-semibold">{r.quem}</span> {ACOES[r.acao] || 'fez uma ação na gestão'}{' '}
              <span className="break-words font-semibold">{r.alvo}</span>
              {detalhe && <span className="block break-words text-[13.5px] text-ink-muted">{detalhe}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
