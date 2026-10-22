'use client'

import { useState } from 'react'
import { useGestao } from './useGestao'
import Grafico from './Grafico'
import Segmentos from './Segmentos'
import ClientesTabela from './ClientesTabela'
import { MostrarTestes } from './AcaoGestao'
import { useDetalhe } from './DetalheCliente'
import { Aviso, Esqueleto, Vazio, Paginacao, BaixarPlanilha } from './Estados'
import { ATALHOS, agruparPara, intervaloDoAtalho, diasEntre, diaPorExtenso, moeda, numero } from './formato'

const POR_PAGINA = 25
const AGRUPAR = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
]
const NOME_AGRUPAR = { dia: 'dia', semana: 'semana', mes: 'mês' }

function Total({ rotulo, valor, detalhe }) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
      <dt className="text-[13px] text-ink-muted">{rotulo}</dt>
      <dd className="figs mt-1 text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink">{valor}</dd>
      {detalhe && <dd className="figs mt-0.5 text-[13px] text-ink-muted">{detalhe}</dd>}
    </div>
  )
}

// Pix × cartão: os dois números e uma régua fina com a proporção. Em preto e
// cinza — o vermelho é reservado para destaque, e aqui nada está em alerta.
function Formas({ t }) {
  const soma = t.pix.centavos + t.cartao.centavos + t.outro.centavos + t.sem_info.centavos
  const parte = (c) => (soma ? (c / soma) * 100 : 0)
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
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

// Vendas por campanha e por anúncio. É aqui que se vê qual criativo vende.
// Compras de antes de 12/10/2026 não têm a origem gravada e ficam numa linha
// à parte, para não se misturarem com as vendas diretas.
function Origens({ linhas }) {
  const nomeCampanha = (l) =>
    !l.registrado ? 'Sem registro (antes de 12/10)' : l.campanha || l.fonte || 'Direto'
  return (
    <>
      <h3 className="mt-10 text-[17px] font-bold text-ink">Vendas por campanha e anúncio</h3>
      <div className="mt-4 overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[12.5px] text-ink-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Campanha</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">Anúncio</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Vendas</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {linhas.map((l, i) => (
              <tr key={i} className="align-top">
                <td className={'break-words px-3 py-3 sm:px-4 ' + (l.registrado ? 'text-ink' : 'text-ink-muted')}>
                  {nomeCampanha(l)}
                  {l.registrado && l.campanha && l.fonte && (
                    <span className="block text-[12.5px] text-ink-muted">{l.fonte}</span>
                  )}
                  {/* No celular o anúncio vai embaixo da campanha: 4 colunas não cabem. */}
                  {l.anuncio && <span className="block text-[13px] text-ink sm:hidden">Anúncio: {l.anuncio}</span>}
                </td>
                <td className="hidden break-words px-4 py-3 text-ink sm:table-cell">
                  {l.anuncio || <span className="text-ink-faint">—</span>}
                </td>
                <td className="figs px-3 py-3 text-right text-ink sm:px-4">{numero(l.compras)}</td>
                <td className="figs whitespace-nowrap px-3 py-3 text-right text-ink sm:px-4">{moeda(l.centavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function Periodo() {
  const detalhe = useDetalhe()
  const inicial = intervaloDoAtalho('30d')
  const [atalho, setAtalho] = useState('30d')
  const [de, setDe] = useState(inicial.de)
  const [ate, setAte] = useState(inicial.ate)
  const [agrupar, setAgrupar] = useState('dia')
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)
  const [testes, setTestes] = useState(false)

  const valido = /^\d{4}-\d{2}-\d{2}$/.test(de) && /^\d{4}-\d{2}-\d{2}$/.test(ate) && de <= ate
  const longoDemais = valido && diasEntre(de, ate) > 731

  const url =
    valido && !longoDemais
      ? '/api/gestao/periodo?de=' + de + '&ate=' + ate + '&agrupar=' + agrupar + '&pagina=' + pagina +
        (testes ? '&testes=1' : '')
      : null
  const { dados, erro, carregando } = useGestao(url, tentativa)

  function aplicar(novoDe, novoAte) {
    setDe(novoDe)
    setAte(novoAte)
    setPagina(1)
    if (novoDe && novoAte && novoDe <= novoAte) setAgrupar((a) => agruparPara(novoDe, novoAte, a))
  }

  function escolherAtalho(id) {
    const r = intervaloDoAtalho(id)
    setAtalho(id)
    aplicar(r.de, r.ate)
  }

  const t = dados?.totais
  const campo =
    'w-full rounded border border-line bg-white px-3 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none'

  return (
    <section aria-labelledby="titulo-periodo" className="mt-8">
      <h2 id="titulo-periodo" className="sr-only">
        Clientes por período
      </h2>

      <div className="space-y-4">
        <Segmentos opcoes={ATALHOS} valor={atalho} onEscolher={escolherAtalho} rotulo="Atalhos de período" />

        <div className="flex flex-wrap items-end gap-3">
          <label className="block w-[calc(50%-6px)] sm:w-44">
            <span className="text-[13px] text-ink-muted">De</span>
            <input
              type="date"
              value={de}
              max={ate || undefined}
              onChange={(e) => {
                setAtalho('')
                aplicar(e.target.value, ate)
              }}
              className={campo + ' mt-1'}
            />
          </label>
          <label className="block w-[calc(50%-6px)] sm:w-44">
            <span className="text-[13px] text-ink-muted">Até</span>
            <input
              type="date"
              value={ate}
              min={de || undefined}
              onChange={(e) => {
                setAtalho('')
                aplicar(de, e.target.value)
              }}
              className={campo + ' mt-1'}
            />
          </label>
          <div className="sm:ml-auto">
            {url && <BaixarPlanilha href={'/api/gestao/periodo/csv?de=' + de + '&ate=' + ate} />}
          </div>
        </div>

        {!valido && (
          <p role="alert" className="text-[14px] text-signal-deep">
            A data inicial precisa ser igual ou anterior à final.
          </p>
        )}
        {longoDemais && (
          <p role="alert" className="text-[14px] text-signal-deep">
            O período pode ter no máximo dois anos. Encurte as datas.
          </p>
        )}
      </div>

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        url ? <Esqueleto linhas={4} /> : null
      ) : (
        <div className={carregando ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}>
          <p className="figs mt-6 text-[13.5px] text-ink-muted">
            {dados.de === dados.ate
              ? diaPorExtenso(dados.de)
              : diaPorExtenso(dados.de) + ' a ' + diaPorExtenso(dados.ate)}{' '}
            · horário de Brasília · só compras pagas
          </p>

          {/* Fios de 1 px entre as células: o fundo do grid é a cor do fio e
              cada célula é branca, com 1 px de vão. Funciona em 2 e em 4
              colunas sem regra especial para cada borda. */}
          <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line lg:grid-cols-4">
            <Total
              rotulo="Clientes"
              valor={numero(t.clientes)}
              detalhe={numero(t.compras) + (t.compras === 1 ? ' compra' : ' compras')}
            />
            <Total rotulo="Faturamento bruto" valor={moeda(t.bruto_centavos)} />
            <Total rotulo="Ticket médio" valor={t.compras ? moeda(t.ticket_medio_centavos) : '—'} />
            <Formas t={t} />
          </dl>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-ink-muted">Agrupar por</p>
            <Segmentos
              opcoes={AGRUPAR}
              valor={agrupar}
              onEscolher={(id) => {
                setAgrupar(id)
                setPagina(1)
              }}
              rotulo="Agrupar o gráfico por"
            />
          </div>

          {t.compras > 0 ? (
            <Grafico serie={dados.serie} titulo={'Faturamento por ' + NOME_AGRUPAR[dados.agrupar]} />
          ) : null}

          {dados.origens?.length > 0 && <Origens linhas={dados.origens} />}

          <h3 className="mt-10 text-[17px] font-bold text-ink">
            Compras no período{' '}
            <span className="figs font-normal text-ink-muted">({numero(dados.total_itens)})</span>
          </h3>
          {/* Os totais acima nunca contam teste; o filtro só mostra as compras
              de teste nesta lista, com o selo. */}
          <div className="mt-2">
            <MostrarTestes
              valor={testes}
              onMudar={(v) => {
                setTestes(v)
                setPagina(1)
              }}
            />
          </div>
          {dados.itens.length === 0 ? (
            <Vazio
              titulo="Nenhuma compra neste período"
              texto="Escolha outro atalho ou aumente as datas. Só entram compras com pagamento confirmado."
            />
          ) : (
            <>
              <ClientesTabela itens={dados.itens} rastreio onAbrir={(id) => detalhe.abrir(id, () => setTentativa((n) => n + 1))} />
              <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={dados.total_itens} onIr={setPagina} />
            </>
          )}
        </div>
      )}
    </section>
  )
}
