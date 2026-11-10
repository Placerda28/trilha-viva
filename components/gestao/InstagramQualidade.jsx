'use client'

import { useGestao } from './useGestao'
import { numero } from './formato'
import { nomeDaSituacao } from './instagramUtil'

// Etapa 6: quanto do que a IA sugere o Paulo aproveita (últimos 30 dias) e os
// 10 últimos rascunhos que ele editou (sugestão x o que foi enviado).

const pct = (parte, todo) => (todo ? Math.round((parte / todo) * 100) + '%' : '—')

function Linha({ rotulo, s }) {
  return (
    <tr className="border-t border-line">
      <th scope="row" className="py-2 pr-3 text-left text-[13.5px] font-semibold text-ink">{rotulo}</th>
      <td className="figs py-2 pr-3 text-right">{numero(s.gerados)}</td>
      <td className="figs py-2 pr-3 text-right">{numero(s.enviados_sem_mudanca)} <span className="text-ink-muted">({pct(s.enviados_sem_mudanca, s.gerados)})</span></td>
      <td className="figs py-2 pr-3 text-right">{numero(s.editados)}</td>
      <td className="figs py-2 pr-3 text-right">{numero(s.descartados)}</td>
      <td className="figs py-2 text-right">{numero(s.falhas_cota)}</td>
    </tr>
  )
}

function Editados({ lista }) {
  if (!lista.length) return null
  return (
    <div className="mt-4">
      <p className="text-[14px] font-semibold text-ink">Últimos rascunhos editados</p>
      <ul className="mt-2 space-y-3">
        {lista.map((e) => (
          <li key={e.id} className="grid gap-2 rounded border border-line bg-paper p-3 text-[13.5px] md:grid-cols-2">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted">Sugestão da IA {e.situacao ? '· ' + nomeDaSituacao(e.situacao) : ''}</p>
              <p className="whitespace-pre-wrap break-words text-ink">{e.sugestao}</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-ink-muted">O que foi enviado</p>
              <p className="whitespace-pre-wrap break-words text-ink">{e.enviado}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function InstagramQualidade({ tentativa }) {
  const { dados } = useGestao('/api/gestao/instagram/qualidade', tentativa)
  if (!dados) return null
  return (
    <details className="mb-4 rounded border border-line bg-white px-4 py-3 sm:px-5">
      <summary className="min-h-11 cursor-pointer py-2 text-[14.5px] font-semibold text-ink">
        Qualidade da IA · últimos {dados.dias} dias · {numero(dados.total.gerados)} rascunhos,{' '}
        {pct(dados.total.enviados_sem_mudanca, dados.total.gerados)} enviados sem mudança
      </summary>
      {dados.situacoes.length === 0 ? (
        <p className="pb-2 text-[13.5px] text-ink-muted">Ainda não há rascunhos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[13.5px] text-ink">
            <thead>
              <tr className="text-[12px] text-ink-muted">
                <th className="py-1 pr-3 text-left font-semibold">Situação</th>
                <th className="py-1 pr-3 text-right font-semibold">Gerados</th>
                <th className="py-1 pr-3 text-right font-semibold">Sem mudança</th>
                <th className="py-1 pr-3 text-right font-semibold">Editados</th>
                <th className="py-1 pr-3 text-right font-semibold">Descartados</th>
                <th className="py-1 text-right font-semibold">Falhas por cota</th>
              </tr>
            </thead>
            <tbody>
              {dados.situacoes.map((s) => (
                <Linha key={s.situacao} rotulo={nomeDaSituacao(s.situacao) || 'sem situação'} s={s} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dados.modelos.length > 0 && (
        <p className="mt-2 text-[12.5px] text-ink-muted">
          Modelo usado: {dados.modelos.map((m) => m.provedor + ' / ' + m.modelo + ' (' + numero(m.total) + ')').join(' · ')}
        </p>
      )}
      <Editados lista={dados.ultimos_editados} />
    </details>
  )
}
