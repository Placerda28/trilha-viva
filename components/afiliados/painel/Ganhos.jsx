'use client'

import { reais } from '@/lib/afiliados-campos'
import { dataBr, reaisSinal, rotuloMes, rotuloMesCurto, situacaoMes } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'
import { useDados } from './api'
import { Carregando, Falhou } from './Carregando'
import Medalha from './Medalha'
import { Selo } from './Situacao'

const TIPOS = { ajuste: 'Ajuste', estorno: 'Devolução depois do fechamento' }

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
  const s = situacaoMes(h)
  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <Selo chave={s.chave} texto={s.texto} />
      {s.detalhe && <span className="text-[13.5px] text-ink-muted">{s.detalhe}</span>}
    </span>
  )
}

function Historico({ historico, niveis }) {
  return (
    <section className="card-line px-5 py-6 sm:px-8" aria-labelledby="hist-titulo">
      <h2 id="hist-titulo" className="text-[17px] font-bold text-ink">
        Mês a mês{' '}
        <Ajuda titulo="Como o mês fecha">
          <p>No dia 1º o mês recomeça. Quando ele fecha, o nível que você atingiu é gravado e o total do mês fica disponível de uma vez.</p>
          <p>Enquanto o mês está em andamento, o total é só uma previsão: ele muda com as vendas e com as devoluções.</p>
        </Ajuda>
      </h2>

      <ul className="mt-2 divide-y divide-line md:hidden">
        {historico.map((h) => (
          <li key={h.mes} className="py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[16px] font-bold text-ink">{rotuloMes(h.mes)}</p>
              <p className="figs text-[24px] font-extrabold leading-none text-ink">{reais(h.total)}</p>
            </div>
            <div className="mt-2.5"><Situacao h={h} /></div>
            <dl className="figs mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">Vendas que contaram</dt><dd className="text-right font-semibold text-ink">{h.vendasValidas}</dd>
              <dt className="text-ink-muted">Nível</dt><dd className="text-right"><Nivel nivel={h.nivel} niveis={niveis} /></dd>
            </dl>
          </li>
        ))}
      </ul>

      <table className="figs mt-3 hidden w-full text-left text-[15px] md:table">
        <caption className="sr-only">Ganhos por mês</caption>
        <thead>
          <tr className="border-b border-line text-[13.5px] text-ink-muted">
            <th scope="col" className="py-3 pr-4 font-semibold">Mês</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Vendas que contaram</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Nível</th>
            <th scope="col" className="py-3 pr-6 text-right font-semibold">Total do mês</th>
            <th scope="col" className="py-3 font-semibold">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {historico.map((h) => (
            <tr key={h.mes}>
              <th scope="row" className="py-3.5 pr-4 font-semibold text-ink">{rotuloMesCurto(h.mes)}</th>
              <td className="py-3.5 pr-4 text-right text-ink">{h.vendasValidas}</td>
              <td className="py-3.5 pr-4"><Nivel nivel={h.nivel} niveis={niveis} /></td>
              <td className="py-3.5 pr-6 text-right font-extrabold text-ink">{reais(h.total)}</td>
              <td className="py-3.5"><Situacao h={h} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function Ajustes({ itens }) {
  return (
    <section className="card-line px-5 py-6 sm:px-8" aria-labelledby="ajustes-titulo">
      <h2 id="ajustes-titulo" className="text-[17px] font-bold text-ink">
        Ajustes{' '}
        <Ajuda titulo="Ajustes">
          <p>Aqui aparecem só dois tipos de lançamento: correções feitas pela equipe e o desconto de uma compra devolvida depois que o mês já tinha fechado.</p>
          <p>Valores negativos saem do seu saldo. As vendas do dia a dia não aparecem aqui: elas entram no total do mês.</p>
        </Ajuda>
      </h2>
      {itens.length === 0 ? (
        <p className="py-4 text-[15px] leading-[1.55] text-ink-muted">Nenhum ajuste por enquanto. Se uma correção ou uma devolução depois do fechamento mexer no seu saldo, ela aparece aqui.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {itens.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-[15.5px] font-semibold leading-snug text-ink">{e.descricao || TIPOS[e.tipo] || 'Lançamento'}</p>
                <p className="mt-0.5 text-[13.5px] text-ink-muted">
                  {e.descricao ? `${TIPOS[e.tipo] || e.tipo}, ` : ''}{dataBr(e.criado_em)}
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
      <Ajustes itens={dados.ajustes || []} />
    </div>
  )
}
