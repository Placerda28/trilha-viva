'use client'

import { reais } from '@/lib/afiliados-campos'
import { dataBr, diaMes, reaisSinal, rotuloMesCurto, rotuloMes } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'
import { useDados } from './api'
import { Carregando, Falhou } from './Carregando'
import Medalha from './Medalha'

const TIPOS = { venda: 'Venda', bonus_nivel: 'Bônus de nível', ajuste: 'Ajuste', estorno: 'Estorno' }
const STATUS = { pendente: 'Aguardando', em_saque: 'Em saque', paga: 'Paga', cancelada: 'Cancelada' }

function Nivel({ nivel, niveis }) {
  if (!nivel) return <span className="text-ink-muted">Sem nível</span>
  const ordem = [...niveis].sort((a, b) => a.vendas_minimas - b.vendas_minimas)
  const grau = ordem.findIndex((n) => n.nome === nivel.nome) + 1
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-ink">
      <Medalha cor={nivel.cor} grau={grau || 1} tamanho={24} className="text-ink" />
      {nivel.nome}
    </span>
  )
}

function Situacao({ h }) {
  return h.situacao === 'em_andamento' ? 'Em andamento' : `Fechado em ${diaMes(h.fechadoEm)}`
}

function Bonus({ h }) {
  if (!h.bonus) return <span className="text-ink-muted">—</span>
  return (
    <>
      {reais(h.bonus)}
      {h.situacao === 'em_andamento' && <span className="text-ink-muted"> (previsto)</span>}
    </>
  )
}

function Historico({ historico, niveis }) {
  return (
    <section className="card-line px-5 py-6 sm:px-8" aria-labelledby="hist-titulo">
      <h2 id="hist-titulo" className="text-[17px] font-bold text-ink">
        Mês a mês{' '}
        <Ajuda titulo="Como o mês fecha">
          <p>No dia 1º o mês recomeça. Quando ele fecha, o nível que você atingiu é gravado e o bônus entra na sua conta.</p>
          <p>Enquanto o mês está em andamento, o bônus é só uma previsão.</p>
        </Ajuda>
      </h2>

      <ul className="mt-2 divide-y divide-line md:hidden">
        {historico.map((h) => (
          <li key={h.mes} className="py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[16px] font-bold text-ink">{rotuloMes(h.mes)}</p>
              <p className="figs text-[24px] font-extrabold leading-none text-ink">{reais(h.total)}</p>
            </div>
            <p className="mt-1 text-[14px] text-ink-muted"><Situacao h={h} /></p>
            <dl className="figs mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">Vendas válidas</dt><dd className="text-right font-semibold text-ink">{h.vendasValidas}</dd>
              <dt className="text-ink-muted">Nível</dt><dd className="text-right"><Nivel nivel={h.nivel} niveis={niveis} /></dd>
              <dt className="text-ink-muted">Garantido</dt><dd className="text-right font-semibold text-ink">{reais(h.garantido)}</dd>
              <dt className="text-ink-muted">Bônus de nível</dt><dd className="text-right font-semibold text-ink"><Bonus h={h} /></dd>
            </dl>
          </li>
        ))}
      </ul>

      <table className="figs mt-3 hidden w-full text-left text-[15px] md:table">
        <caption className="sr-only">Ganhos por mês</caption>
        <thead>
          <tr className="border-b border-line text-[13.5px] text-ink-muted">
            <th scope="col" className="py-3 pr-4 font-semibold">Mês</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Vendas válidas</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Nível</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Garantido</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Bônus de nível</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Total do mês</th>
            <th scope="col" className="py-3 font-semibold">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {historico.map((h) => (
            <tr key={h.mes}>
              <th scope="row" className="py-3.5 pr-4 font-semibold text-ink">{rotuloMesCurto(h.mes)}</th>
              <td className="py-3.5 pr-4 text-right text-ink">{h.vendasValidas}</td>
              <td className="py-3.5 pr-4"><Nivel nivel={h.nivel} niveis={niveis} /></td>
              <td className="py-3.5 pr-4 text-right text-ink">{reais(h.garantido)}</td>
              <td className="py-3.5 pr-4 text-right text-ink"><Bonus h={h} /></td>
              <td className="py-3.5 pr-4 text-right font-extrabold text-ink">{reais(h.total)}</td>
              <td className="py-3.5 text-ink-muted"><Situacao h={h} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function Extrato({ itens }) {
  return (
    <section className="card-line px-5 py-6 sm:px-8" aria-labelledby="extrato-titulo">
      <h2 id="extrato-titulo" className="text-[17px] font-bold text-ink">
        Extrato{' '}
        <Ajuda titulo="Extrato">
          <p>Cada linha é uma entrada ou uma saída da sua conta de afiliado, na ordem em que aconteceu. Valores negativos são descontos, como o de uma venda devolvida.</p>
        </Ajuda>
      </h2>
      {itens.length === 0 ? (
        <p className="py-6 text-[15px] text-ink-muted">Nada por aqui ainda. As vendas e os bônus aparecem nesta lista.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {itens.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-[15.5px] font-semibold leading-snug text-ink">{e.descricao || TIPOS[e.tipo] || 'Lançamento'}</p>
                <p className="mt-0.5 text-[13.5px] text-ink-muted">
                  {TIPOS[e.tipo] || e.tipo} · {dataBr(e.criado_em)}
                  {e.status === 'pendente' && e.disponivel_em ? ` · libera em ${diaMes(e.disponivel_em)}` : STATUS[e.status] ? ` · ${STATUS[e.status].toLowerCase()}` : ''}
                </p>
              </div>
              <p className={`figs shrink-0 text-[17px] font-extrabold leading-snug ${e.valor_centavos < 0 ? 'text-signal-deep' : 'text-ink'}`}>
                {reaisSinal(e.valor_centavos)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function Ganhos({ niveis }) {
  const { dados, erro, carregando, recarregar } = useDados('/api/afiliados/ganhos')
  if (carregando && !dados) return <Carregando />
  if (erro) return <Falhou onTentar={recarregar} />
  return (
    <div className="space-y-5 sm:space-y-6">
      {dados.historico.length === 0 ? (
        <div className="card-line px-5 py-10 text-center">
          <p className="text-[17px] font-bold text-ink">Seus ganhos mês a mês aparecem aqui.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[15px] leading-[1.55] text-ink-muted">Eles começam depois da primeira venda.</p>
        </div>
      ) : (
        <Historico historico={dados.historico} niveis={niveis} />
      )}
      <Extrato itens={dados.extrato} />
    </div>
  )
}
