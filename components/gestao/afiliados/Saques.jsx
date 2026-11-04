'use client'

import { useState } from 'react'
import { Tabs } from 'radix-ui'
import { CabecalhoPagina } from '../Casca'
import { Aviso, Esqueleto, Paginacao, Vazio } from '../Estados'
import { useListaSaques } from './apiSaques'
import PagarSaque from './PagarSaque'
import RecusarSaque from './RecusarSaque'
import SaqueLinha from './SaqueLinha'
import SaquesResumo from './SaquesResumo'
import SubAbas, { classeAba } from './SubAbas'
import { ABAS, POR_PAGINA_PADRAO, VAZIO } from './saquesUtil'

// Gestão > Afiliados > Saques: a fila de pedidos de saque. O dono abre o
// pedido, paga o Pix no banco, anexa o comprovante e marca como pago; o
// servidor manda o e-mail ao afiliado. Vale para o master e para a equipe.

export default function Saques() {
  const [aba, setAba] = useState('pendentes')
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)
  const [pagando, setPagando] = useState(null)
  const [recusando, setRecusando] = useState(null)
  const { dados, status, erro, carregando } = useListaSaques(aba, pagina, tentativa)

  const daAba = dados && status === aba
  const atualizar = () => setTentativa((n) => n + 1)
  const trocar = (v) => {
    setAba(v)
    setPagina(1)
  }

  return (
    <section aria-label="Saques dos afiliados">
      <CabecalhoPagina titulo="Saques dos afiliados" texto="Pague o Pix, anexe o comprovante e o afiliado recebe o aviso por e-mail." />
      <SubAbas atual="saques" />

      {dados?.resumo && <SaquesResumo resumo={dados.resumo} />}

      <Tabs.Root value={aba} onValueChange={trocar} className="mt-6">
        <Tabs.List aria-label="Situação dos pedidos" className="-mx-4 flex overflow-x-auto border-b border-line px-1 md:mx-0 md:px-0">
          {ABAS.map((a) => (
            <Tabs.Trigger key={a.id} value={a.id} className={classeAba(a.id === aba)}>
              {a.rotulo}
              {a.id === 'pendentes' && dados?.resumo?.pendentes_qtd > 0 && (
                <span className="figs ml-2 grid h-[18px] min-w-[18px] place-items-center rounded-sm bg-signal px-1 text-[11px] font-bold leading-none text-white">
                  {dados.resumo.pendentes_qtd}
                </span>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value={aba} tabIndex={-1} className="focus:outline-none">
          {erro ? (
            <Aviso erro={erro} onTentar={atualizar} />
          ) : !daAba ? (
            <Esqueleto linhas={3} />
          ) : dados.itens.length === 0 ? (
            <Vazio titulo={VAZIO[aba][0]} texto={VAZIO[aba][1]} />
          ) : (
            <div className={'transition-opacity duration-150 ' + (carregando ? 'opacity-60' : '')}>
              <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-white">
                {dados.itens.map((s) => (
                  <SaqueLinha key={s.id} saque={s} aoPagar={setPagando} aoRecusar={setRecusando} />
                ))}
              </ul>
              <Paginacao pagina={dados.pagina || pagina} porPagina={dados.por_pagina || POR_PAGINA_PADRAO} total={dados.total} onIr={setPagina} />
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {pagando && (
        <PagarSaque
          key={pagando.id}
          saque={pagando}
          aoFechar={() => setPagando(null)}
          aoMudou={atualizar}
          aoRecusar={() => {
            setRecusando(pagando)
            setPagando(null)
          }}
        />
      )}
      {recusando && <RecusarSaque key={recusando.id} saque={recusando} aoFechar={() => setRecusando(null)} aoMudou={atualizar} />}
    </section>
  )
}
