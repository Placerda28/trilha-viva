'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CabecalhoPagina } from './Casca'
import { useDetalhe } from './DetalheCliente'
import { Aviso, Esqueleto, Vazio } from './Estados'
import Grafico from './Grafico'
import Kpi from './Kpi'
import Segmentos from './Segmentos'
import { numero } from './formato'
import { useGestao } from './useGestao'
import { usePeriodo } from './usePeriodo'

const AGRUPAMENTOS = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
]

function Musica({ musica }) {
  return <Link href={'/musicas/' + musica.slug} prefetch={false} className="inline-flex min-h-11 items-center break-words font-semibold underline decoration-line underline-offset-4 [overflow-wrap:anywhere]">{musica.slug.replaceAll('-', ' ')}</Link>
}

function Cliente({ cliente, abrir }) {
  return (
    <button type="button" onClick={() => abrir(cliente.id)} className="min-h-11 max-w-full text-left underline decoration-line underline-offset-4">
      <span className="block break-words font-semibold [overflow-wrap:anywhere]">{cliente.nome || 'Sem nome'}</span>
      <span className="block break-all text-[13px] text-ink-muted">{cliente.email}</span>
    </button>
  )
}

export default function Downloads() {
  const periodo = usePeriodo()
  const { abrir } = useDetalhe()
  const [agrupar, setAgrupar] = useState('dia')
  const [tentativa, setTentativa] = useState(0)
  const { dados, erro, carregando } = useGestao(
    periodo.valido ? '/api/gestao/downloads?de=' + periodo.de + '&ate=' + periodo.ate + '&agrupar=' + agrupar : null,
    tentativa
  )
  const serie = useMemo(() => (dados?.serie || []).map((p) => ({ ...p, valor: p.downloads })), [dados?.serie])
  const t = dados?.totais

  return (
    <section>
      <CabecalhoPagina titulo="Downloads" texto="Veja o que o público baixa e o uso da cota." comPeriodo />
      {!periodo.valido ? (
        <p role="alert" className="text-[14px] text-signal-deep">{periodo.erro}</p>
      ) : erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? <Esqueleto /> : (
        <div aria-busy={carregando} className={carregando ? 'opacity-60' : ''}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi rotulo="Downloads no período" valor={numero(t.downloads)} />
            <Kpi rotulo="Clientes que baixaram" valor={numero(t.clientes)} />
            <Kpi rotulo="Média por cliente" valor={numero(t.media)} />
            <Kpi rotulo="Bateram a cota hoje" valor={numero(t.na_cota_hoje)} detalhe={'Cota de ' + numero(t.limite_dia) + ' downloads por dia'} />
          </div>
          <Grafico serie={serie} titulo="Downloads no período" formato="numero" unidade="downloads"
            acoes={<Segmentos opcoes={AGRUPAMENTOS} valor={agrupar} onEscolher={setAgrupar} rotulo="Agrupar downloads" tamanho="compacto" />} />
          {!t.downloads && <Vazio titulo="Nenhum download neste período" texto="Escolha outro período para consultar o uso do acervo." />}

          <section className="mt-6" aria-labelledby="mais-baixadas">
            <h2 id="mais-baixadas" className="text-[18px] font-bold">Mais baixadas</h2>
            <p className="mt-1 text-[13px] text-ink-muted">Até 50 músicas no período.</p>
            {!dados.top_musicas.length ? <Vazio titulo="Nenhuma música registrada" /> : (
              <>
                <div className="mt-3 hidden rounded border border-line bg-white md:block">
                  <table className="w-full table-fixed text-left text-[14px]">
                    <thead className="border-b border-line text-[13px] text-ink-muted"><tr>
                      <th scope="col" className="w-16 px-4 py-3">Posição</th>
                      <th scope="col" className="px-4 py-3">Música</th>
                      <th scope="col" className="w-28 px-4 py-3 text-right">Downloads</th>
                      <th scope="col" className="w-32 px-4 py-3 text-right">Clientes diferentes</th>
                    </tr></thead>
                    <tbody className="divide-y divide-line">{dados.top_musicas.map((m, i) => (
                      <tr key={m.slug}>
                        <td className="figs px-4 py-3 text-ink-muted">{i + 1}</td>
                        <td className="px-4 py-3"><Musica musica={m} /></td>
                        <td className="figs px-4 py-3 text-right">{numero(m.downloads)}</td>
                        <td className="figs px-4 py-3 text-right">{numero(m.clientes)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <ol className="mt-3 divide-y divide-line rounded border border-line bg-white md:hidden">{dados.top_musicas.map((m, i) => (
                  <li key={m.slug} className="px-4 py-3">
                    <p className="figs text-[12px] text-ink-muted">Posição {i + 1}</p>
                    <Musica musica={m} />
                    <p className="figs mt-1 text-[13px] text-ink-muted">{numero(m.downloads)} downloads · {numero(m.clientes)} clientes diferentes</p>
                  </li>
                ))}</ol>
              </>
            )}
          </section>

          <section className="mt-6" aria-labelledby="quem-baixou">
            <h2 id="quem-baixou" className="text-[18px] font-bold">Quem mais baixou</h2>
            <p className="mt-1 text-[13px] text-ink-muted">Até 20 clientes no período. Toque no nome para ver os detalhes.</p>
            {!dados.top_clientes.length ? <Vazio titulo="Nenhum cliente neste período" /> : (
              <>
                <div className="mt-3 hidden rounded border border-line bg-white md:block">
                  <table className="w-full table-fixed text-left text-[14px]">
                    <thead className="border-b border-line text-[13px] text-ink-muted"><tr>
                      <th scope="col" className="px-4 py-3">Cliente</th>
                      <th scope="col" className="w-36 px-4 py-3 text-right">Downloads no período</th>
                      <th scope="col" className="w-28 px-4 py-3 text-right">Hoje</th>
                    </tr></thead>
                    <tbody className="divide-y divide-line">{dados.top_clientes.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3"><Cliente cliente={c} abrir={abrir} /></td>
                        <td className="figs px-4 py-3 text-right">{numero(c.downloads)}</td>
                        <td className="figs px-4 py-3 text-right">{numero(c.hoje)} de {numero(t.limite_dia)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <ul className="mt-3 divide-y divide-line rounded border border-line bg-white md:hidden">{dados.top_clientes.map((c) => (
                  <li key={c.id} className="px-4 py-3">
                    <Cliente cliente={c} abrir={abrir} />
                    <p className="figs mt-2 text-[13px]">{numero(c.downloads)} downloads no período</p>
                    <p className="figs mt-1 text-[13px] text-ink-muted">Hoje: {numero(c.hoje)} de {numero(t.limite_dia)}</p>
                  </li>
                ))}</ul>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
