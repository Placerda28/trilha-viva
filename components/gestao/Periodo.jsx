'use client'

import { Suspense, useState } from 'react'
import { useGestao } from './useGestao'
import { usePeriodo } from './usePeriodo'
import { CabecalhoPagina } from './Casca'
import Kpi, { variacao } from './Kpi'
import Grafico from './Grafico'
import Segmentos from './Segmentos'
import ClientesTabela from './ClientesTabela'
import { MostrarTestes } from './AcaoGestao'
import { useDetalhe } from './DetalheCliente'
import { Aviso, Esqueleto, Vazio, Paginacao, BaixarPlanilha } from './Estados'
import { agruparPara, diasEntre, somarDias, moeda, numero } from './formato'

const AGRUPAR = [{ id: 'dia', rotulo: 'Dia' }, { id: 'semana', rotulo: 'Semana' }, { id: 'mes', rotulo: 'Mês' }]
const NOME_AGRUPAR = { dia: 'dia', semana: 'semana', mes: 'mês' }

function textoVariacao(atual, anterior) {
  const v = variacao(atual, anterior)
  return v == null ? '—' : (v < 0 ? '▼ ' : v > 0 ? '▲ ' : '') + numero(Math.round(Math.abs(v) * 1000) / 10) + '%'
}

// Pix × cartão: os dois números e uma régua fina com a proporção. Em preto e
// cinza — o vermelho é reservado para destaque, e aqui nada está em alerta.
function Formas({ t, anterior }) {
  const soma = t.pix.centavos + t.cartao.centavos + t.outro.centavos + t.sem_info.centavos
  const parte = (c) => (soma ? (c / soma) * 100 : 0)
  return (
    <div className="rounded-md border border-line bg-white px-4 py-4 sm:px-5">
      <dt className="text-[13px] text-ink-muted">Pix × cartão</dt>
      <dd className="figs mt-1.5 space-y-0.5 text-[14px] text-ink">
        <p>
          <span className="font-semibold">Pix</span> {numero(t.pix.compras)} · {moeda(t.pix.centavos)}
        </p>
        <p>
          <span className="font-semibold">Cartão</span> {numero(t.cartao.compras)} · {moeda(t.cartao.centavos)}
        </p>
        {t.outro.compras > 0 && (
          <p className="text-ink-muted">
            Outro {numero(t.outro.compras)} · {moeda(t.outro.centavos)}
          </p>
        )}
        {t.sem_info.compras > 0 && (
          <p className="text-ink-muted">
            {numero(t.sem_info.compras)} ainda sem informação
          </p>
        )}
      </dd>
      <dd className="mt-2 text-[13px] text-ink-muted">Pix: {textoVariacao(t.pix.centavos, anterior?.pix.centavos)} / Cartão: {textoVariacao(t.cartao.centavos, anterior?.cartao.centavos)}</dd>
      {soma > 0 && (
        <dd aria-hidden="true" className="mt-2.5 flex h-1.5 gap-0.5 overflow-hidden rounded-sm">
          <span className="bg-ink" style={{ width: parte(t.pix.centavos) + '%' }} />
          <span className="bg-ink-faint" style={{ width: parte(t.cartao.centavos) + '%' }} />
          <span className="bg-mist-deep" style={{ width: parte(t.outro.centavos + t.sem_info.centavos) + '%' }} />
        </dd>
      )}
    </div>
  )
}

export default function Periodo() {
  return <Suspense fallback={<Esqueleto linhas={4} />}><VendasComPeriodo /></Suspense>
}

function VendasComPeriodo() {
  const periodo = usePeriodo()
  return <Vendas key={periodo.de + periodo.ate} periodo={periodo} />
}

function Vendas({ periodo }) {
  const detalhe = useDetalhe()
  const { de, ate, valido } = periodo
  const [agrupar, setAgrupar] = useState(() => valido ? agruparPara(de, ate, 'dia') : 'dia')
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)
  const [testes, setTestes] = useState(false)
  const [busca, setBusca] = useState('')
  const consulta = 'de=' + de + '&ate=' + ate
  const { dados, erro, carregando } = useGestao(valido ? '/api/gestao/periodo?' + consulta + '&agrupar=' + agrupar + '&pagina=' + pagina + (testes ? '&testes=1' : '') : null, tentativa)
  const antes = valido ? 'de=' + somarDias(de, -diasEntre(de, ate)) + '&ate=' + somarDias(de, -1) : ''
  const comparacao = useGestao(valido ? '/api/gestao/periodo?' + antes + '&agrupar=mes' : null, tentativa)
  const t = dados?.totais
  const a = comparacao.dados?.totais
  const itens = (dados?.itens || []).filter((c) => [c.nome, c.email, c.compra?.cupom].some((v) => String(v || '').toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR'))))
  const recarregar = () => setTentativa((n) => n + 1)

  return (
    <section className="[&_.figs]:break-words">
      <CabecalhoPagina titulo="Vendas" texto="Compras pagas e comparação com o período anterior de mesma duração." comPeriodo />
      {!valido ? <p role="alert">{periodo.erro}</p> : erro ? <Aviso erro={erro} onTentar={recarregar} /> : !dados ? <Esqueleto linhas={4} /> : (
        <div aria-busy={carregando} className={carregando ? 'opacity-60' : ''}>
          {comparacao.erro && <Aviso erro={comparacao.erro} onTentar={recarregar} />}
          <div className="grid grid-cols-1 gap-4 min-[390px]:grid-cols-2 xl:grid-cols-4">
            <Kpi rotulo="Faturamento bruto" valor={moeda(t.bruto_centavos)} variacao={variacao(t.bruto_centavos, a?.bruto_centavos)} />
            <Kpi rotulo="Vendas" valor={numero(t.compras)} variacao={variacao(t.compras, a?.compras)} />
            <Kpi rotulo="Clientes" valor={numero(t.clientes)} variacao={variacao(t.clientes, a?.clientes)} />
            <Kpi rotulo="Ticket médio" valor={t.compras ? moeda(t.ticket_medio_centavos) : '—'} variacao={variacao(t.ticket_medio_centavos, a?.ticket_medio_centavos)} />
          </div>
          <dl className="mt-4"><Formas t={t} anterior={a} /></dl>
          <div className="mt-6">
            <Grafico serie={dados.serie} titulo={'Faturamento por ' + NOME_AGRUPAR[agrupar]} acoes={<Segmentos opcoes={AGRUPAR} valor={agrupar} onEscolher={setAgrupar} rotulo="Agrupar gráfico por" />} />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <h2 className="text-[17px] font-bold">Compras no período ({numero(dados.total_itens)})</h2>
            <input type="search" aria-label="Buscar compras nesta página" placeholder="Buscar nesta página" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-11 min-w-0 w-full rounded border border-line px-3 text-[14px] sm:w-48" />
            {/* Os totais acima nunca contam teste; o filtro só mostra as compras
                de teste nesta lista, com o selo. */}
            <MostrarTestes valor={testes} onMudar={(v) => { setTestes(v); setPagina(1) }} />
            <BaixarPlanilha href={'/api/gestao/periodo/csv?' + consulta} />
          </div>
          <p className="mt-2 text-[13px] text-ink-muted">A planilha contém todas as compras reais do período. A busca filtra os 25 itens desta página.</p>
          {itens.length === 0 ? <Vazio titulo={busca ? 'Nenhuma compra encontrada nesta página' : 'Nenhuma compra neste período'} /> : <ClientesTabela itens={itens} rastreio onAbrir={(id) => detalhe.abrir(id, recarregar)} />}
          <Paginacao pagina={pagina} porPagina={25} total={dados.total_itens} onIr={setPagina} />
        </div>
      )}
    </section>
  )
}
