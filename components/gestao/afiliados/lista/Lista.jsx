'use client'

import { Suspense, useCallback, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CabecalhoPagina } from '../../Casca'
import { Aviso, Esqueleto, Paginacao, Vazio } from '../../Estados'
import { numero } from '../../formato'
import Ficha from '../ficha/Ficha'
import SubAbas from '../SubAbas'
import { useBusca } from '../apiAfiliados'
import { FILTROS_VAZIOS, POR_PAGINA, consultaDaLista, dirPadrao, filtrosAtivos } from '../afiliadosUtil'
import ListaFiltros from './ListaFiltros'
import ListaTabela from './ListaTabela'

// Gestão > Afiliados > Afiliados: a lista (busca, filtros, ordem, páginas) e,
// com ?afiliado=<id> no endereço, a ficha de um afiliado. É o mesmo endereço
// que os alertas usam (/gestao/afiliados/lista?afiliado=<id>), então o botão
// Voltar do navegador leva da ficha de volta para a lista, que guarda os filtros.
// `master` vem do servidor (papel da sessão); `base` é o endereço desta página.

const BASE = '/gestao/afiliados/lista'

export default function Lista(props) {
  return (
    <Suspense fallback={<Esqueleto linhas={4} />}>
      <ListaOuFicha {...props} />
    </Suspense>
  )
}

function ListaOuFicha({ master = false, base = BASE }) {
  const id = useSearchParams().get('afiliado')
  // Os filtros ficam aqui em cima: a lista some quando a ficha abre e volta como estava.
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
  const [pagina, setPagina] = useState(1)
  const mudar = useCallback((parte) => {
    setFiltros((f) => ({ ...f, ...parte }))
    setPagina(1)
  }, [])

  if (id && /^\d{1,12}$/.test(id)) return <Ficha id={id} master={master} voltar={base} />
  return <Afiliados filtros={filtros} aoMudar={mudar} pagina={pagina} aoPagina={setPagina} base={base} />
}

function Afiliados({ filtros, aoMudar, pagina, aoPagina, base }) {
  const [tentativa, setTentativa] = useState(0)
  const consulta = consultaDaLista(filtros, pagina)
  const { dados, erro, carregando } = useBusca((api, sinal) => api.lista(consulta, sinal), [consulta, tentativa])

  const ordem = dados?.ordem || filtros.ordem || 'vendas'
  const dir = dados?.dir || filtros.dir || dirPadrao(ordem)
  const ordenar = (coluna) => aoMudar(coluna === ordem ? { ordem: coluna, dir: dir === 'asc' ? 'desc' : 'asc' } : { ordem: coluna, dir: '' })
  const filtrando = Boolean(filtros.q.trim() || filtros.status || filtrosAtivos(filtros))

  return (
    <section aria-label="Lista de afiliados">
      <CabecalhoPagina titulo="Afiliados" texto="Quem vende, em que nível está e quanto tem a receber. Abra um nome para ver a ficha." />
      <SubAbas atual="afiliados" />
      <ListaFiltros filtros={filtros} aoMudar={aoMudar} dados={dados} />

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        <Esqueleto linhas={5} />
      ) : (
        <div className={'mt-5 transition-opacity duration-150 ' + (carregando ? 'opacity-60' : '')}>
          {dados.truncado && (
            <p role="status" className="mb-4 border-l-2 border-signal bg-white px-4 py-3 text-[14.5px] text-ink">
              A lista tem mais de 3.000 afiliados e só os 3.000 primeiros entram na busca, nos filtros e na ordem. Use a busca para achar quem não aparece.
            </p>
          )}
          <p className="figs mb-3 text-[14px] text-ink-muted" aria-live="polite">
            {dados.total === 1 ? '1 afiliado' : `${numero(dados.total)} afiliados`}
            {filtrando ? ' com esses filtros' : ''}
          </p>
          {dados.itens.length === 0 ? (
            filtrando ? (
              <Vazio titulo="Nenhum afiliado com esses filtros" texto="Tire um filtro ou mude a busca para ver mais gente." />
            ) : (
              <Vazio titulo="Ainda não há afiliados" texto="Quando alguém se cadastrar em /minha-conta/afiliado, aparece aqui." />
            )
          ) : (
            <>
              <ListaTabela itens={dados.itens} niveis={dados.niveis} ordem={ordem} dir={dir} base={base} aoOrdenar={ordenar} />
              <Paginacao pagina={dados.pagina || pagina} porPagina={dados.por_pagina || POR_PAGINA} total={dados.total} onIr={aoPagina} />
            </>
          )}
        </div>
      )}
    </section>
  )
}
