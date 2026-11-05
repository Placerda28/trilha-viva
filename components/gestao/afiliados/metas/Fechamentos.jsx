'use client'

import { useEffect, useRef, useState } from 'react'
import { rotuloMes } from '@/lib/afiliados-painel'
import { moeda, numero } from '../../formato'
import { urlCsvFechamento } from '../apiAfiliados'
import { nomeDoMesMinusculo, textoFechamento } from '../afiliadosUtil'
import RodarFechamento from './RodarFechamento'

// Os 6 meses anteriores ao de hoje: status do fechamento, relatório por nível
// e a planilha. O mês de `destaque` (vindo do alerta, ?mes=AAAA-MM) fica
// marcado e rola para a vista. "Rodar fechamento" só aparece para o Master.

const MARCA = { rodado: 'bg-ink', parcial: 'border border-signal bg-white', pendente: 'bg-signal' }

function Mes({ f, master, destaque, aoRodar }) {
  const ref = useRef(null)
  useEffect(() => {
    if (destaque) ref.current?.scrollIntoView?.({ block: 'center' })
  }, [destaque])
  const nome = nomeDoMesMinusculo(f.mes)
  return (
    <li ref={ref} id={`mes-${f.mes}`} className={'px-4 py-4 sm:px-6 ' + (destaque ? 'border-l-[3px] border-l-signal bg-white' : '')}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="text-[16px] font-bold text-ink">{rotuloMes(f.mes)}</h3>
          <p className={'mt-1 inline-flex items-center gap-2 text-[14px] font-semibold ' + (f.status === 'rodado' ? 'text-ink' : 'text-signal-deep')}>
            <span aria-hidden="true" className={'h-2.5 w-2.5 shrink-0 ' + MARCA[f.status]} />
            {textoFechamento(f)}
          </p>
        </div>
        <p className="figs text-right text-[22px] font-extrabold leading-none text-ink">
          {moeda(f.total_mes_centavos)}
          <span className="mt-1 block text-[12.5px] font-normal text-ink-muted">total do mês</span>
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-x-4 text-[14px]">
        <div>
          <dt className="text-ink-muted">Afiliados</dt>
          <dd className="figs font-bold text-ink">{numero(f.afiliados)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Comissão base</dt>
          <dd className="figs font-bold text-ink">{moeda(f.total_base_centavos)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Bônus de nível</dt>
          <dd className="figs font-bold text-ink">{moeda(f.total_bonus_centavos)}</dd>
        </div>
      </dl>

      {f.por_nivel?.length > 0 && (
        <p className="mt-3 text-[14px] text-ink-muted">
          Por nível:{' '}
          {f.por_nivel.map((n, i) => (
            <span key={n.nivel ?? i}>
              {i > 0 && '. '}
              <span className="font-semibold text-ink">{n.nivel || 'Sem nível'}</span> <span className="figs">{numero(n.afiliados)}</span>
            </span>
          ))}
          .
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {master && f.status !== 'rodado' && f.liberado && (
          <button type="button" onClick={() => aoRodar(f.mes)} className="btn-ink min-h-11 !px-5 !py-2.5 !text-[14.5px]">
            Rodar fechamento de {nome}
          </button>
        )}
        {f.status !== 'rodado' && !f.liberado && <p className="self-center text-[14px] text-ink-muted">Ainda não chegou o dia de fechar este mês.</p>}
        {f.afiliados > 0 && (
          <a href={urlCsvFechamento(f.mes)} download className="btn-quiet min-h-11 !px-5 !py-2.5 !text-[14.5px]">
            Exportar planilha<span className="sr-only"> de {nome}</span>
          </a>
        )}
      </div>
    </li>
  )
}

export default function Fechamentos({ itens, master, destaque, aoMudou }) {
  const [rodando, setRodando] = useState(null)
  return (
    <section aria-labelledby="fechamentos">
      <h2 id="fechamentos" className="text-[17px] font-bold text-ink">
        Fechamento dos últimos 6 meses
      </h2>
      <p className="mt-0.5 text-[14px] text-ink-muted">Cada mês fecha uma vez: calcula o nível e o bônus de cada afiliado.</p>
      <ul className="card-line mt-3 divide-y divide-line overflow-hidden">
        {itens.map((f) => (
          <Mes key={f.mes} f={f} master={master} destaque={destaque === f.mes} aoRodar={setRodando} />
        ))}
      </ul>
      {rodando && <RodarFechamento key={rodando} mes={rodando} aoFechar={() => setRodando(null)} aoMudou={aoMudou} />}
    </section>
  )
}
