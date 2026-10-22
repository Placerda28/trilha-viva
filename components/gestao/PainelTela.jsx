'use client'

import { useEffect, useState } from 'react'
import Painel from './Painel'
import { CabecalhoPagina, useAvisosDaCasca } from './Casca'
import { Aviso } from './Estados'
import { agruparPara, hojeBrasilia } from './formato'
import { useGestao } from './useGestao'
import { usePeriodo } from './usePeriodo'

// A tela do Painel: lê o período da URL (usePeriodo), busca /api/gestao/painel
// e passa tudo ao Painel. Os avisos vêm da casca, que já os busca para o número
// do WhatsApp no menu. Troca de período mantém a tela anterior, apagada, até os
// números novos chegarem: nada de pulo para o esqueleto a cada clique.

function Bloco({ className }) {
  return <div className={'rounded-md border border-line bg-white ' + className} />
}

function EsqueletoPainel() {
  return (
    <div aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Bloco key={i} className="h-[116px] sm:h-[124px]" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Bloco className="h-[290px] xl:col-span-2" />
        <Bloco className="h-[290px]" />
      </div>
      <Bloco className="mt-4 h-24" />
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Bloco className="h-[380px]" />
        <Bloco className="h-[380px]" />
      </div>
    </div>
  )
}

export default function PainelTela() {
  const periodo = usePeriodo()
  const avisos = useAvisosDaCasca()
  const [agrupar, setAgrupar] = useState('dia')
  const [tentativa, setTentativa] = useState(0)
  const [agora, setAgora] = useState('')

  // O instante da leitura só existe no navegador (os dados também chegam de lá).
  useEffect(() => {
    setAgora(new Date().toISOString())
  }, [tentativa, periodo.de, periodo.ate])

  const efetivo = agruparPara(periodo.de, periodo.ate, agrupar)
  const url = periodo.valido
    ? '/api/gestao/painel?de=' + periodo.de + '&ate=' + periodo.ate + '&agrupar=' + efetivo
    : null
  const { dados, erro, carregando } = useGestao(url, tentativa)

  if (!periodo.valido) {
    return (
      <>
        <CabecalhoPagina titulo="Painel" comPeriodo />
        <div role="alert" className="rounded-md border border-signal/40 bg-white px-5 py-4">
          <p className="text-[14.5px] text-ink">{periodo.erro}</p>
          <button
            type="button"
            onClick={() => periodo.mudar({ de: hojeBrasilia().slice(0, 8) + '01', ate: hojeBrasilia() })}
            className="btn-quiet mt-3 h-11 !px-4 !py-0 !text-[14px]"
          >
            Ver este mês
          </button>
        </div>
      </>
    )
  }

  if (erro && !dados) {
    return (
      <>
        <CabecalhoPagina titulo="Painel" comPeriodo />
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      </>
    )
  }

  if (!dados) {
    return (
      <>
        <CabecalhoPagina titulo="Painel" comPeriodo />
        <EsqueletoPainel />
      </>
    )
  }

  return (
    <div
      aria-busy={carregando}
      className={carregando ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}
    >
      {erro && <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />}
      <Painel
        painel={dados}
        avisos={avisos}
        agora={agora || new Date().toISOString()}
        agrupar={efetivo}
        onAgrupar={setAgrupar}
        aoMudar={() => setTentativa((n) => n + 1)}
      />
    </div>
  )
}
