'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { rotuloMes, textoDias } from '@/lib/afiliados-painel'
import CodigoLink from './CodigoLink'
import EscadaNiveis from './EscadaNiveis'
import Abas, { ABAS } from './painel/Abas'
import ComoFunciona from './painel/ComoFunciona'
import DadosPix from './painel/DadosPix'
import Ganhos from './painel/Ganhos'
import Inicio from './painel/Inicio'
import Saques from './painel/Saques'
import Vendas from './painel/Vendas'

const STATUS = {
  ativo: { texto: 'Ativo', marca: 'bg-ink' },
  pendente: { texto: 'Em análise', marca: 'border-2 border-ink bg-transparent' },
  suspenso: { texto: 'Suspenso', marca: 'bg-signal' },
}

// Regras que o admin pode mudar; o servidor manda os valores vigentes.
const CONFIG_PADRAO = { carenciaDias: 7, diaFechamento: 8, intervaloSaqueDias: 15 }
const IDS = ABAS.map((a) => a.id)
const abaDoEndereco = () => {
  try {
    const h = window.location.hash.replace('#', '')
    return IDS.includes(h) ? h : 'inicio'
  } catch {
    return 'inicio'
  }
}

function Aviso({ status, emailSuporte }) {
  if (status === 'pendente') {
    return (
      <p role="status" className="mt-6 rounded border border-line bg-white px-4 py-3 text-[15px] leading-[1.6] text-ink">
        Seu cadastro está em análise. Você recebe um e-mail quando for aprovado.
      </p>
    )
  }
  if (status !== 'suspenso') return null
  return (
    <p role="alert" className="mt-6 rounded border border-signal/30 bg-signal-wash px-4 py-3 text-[15px] leading-[1.6] text-ink">
      Sua conta de afiliado está suspensa.
      {emailSuporte ? (
        <>
          {' '}Fale com a gente em{' '}
          <a href={`mailto:${emailSuporte}`} className="link-quiet font-semibold">{emailSuporte}</a>.
        </>
      ) : null}
    </p>
  )
}

// Quem já é afiliado. Em análise: só o código e a escada (ainda não há venda para
// mostrar). Ativo ou suspenso: o painel com as 6 abas da seção 6.3.
export default function AfiliadoPainel({ nome, codigo, link, status, emailSuporte, dados, niveis, config, avisarCadaVenda }) {
  const st = STATUS[status] || STATUS.pendente
  const cfg = { ...CONFIG_PADRAO, ...(config || {}) }
  const primeiroNome = String(nome || '').trim().split(' ')[0]
  const [aba, setAba] = useState('inicio')
  const topo = useRef(null)

  useEffect(() => {
    setAba(abaDoEndereco())
    const ouvir = () => setAba(abaDoEndereco())
    window.addEventListener('hashchange', ouvir)
    return () => window.removeEventListener('hashchange', ouvir)
  }, [])

  const trocar = useCallback((id) => {
    setAba(id)
    try {
      window.history.replaceState(null, '', id === 'inicio' ? window.location.pathname : `#${id}`)
    } catch {
      // navegador sem histórico (previa): a aba troca do mesmo jeito
    }
    // Preso no topo da tela: leva o conteúdo novo para o começo, sem pular se já está visível.
    const el = topo.current
    if (el && el.getBoundingClientRect().top < 70) {
      el.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
  }, [])

  const cabeca = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div>
        <h1 className="text-d2 text-ink">{primeiroNome ? `Olá, ${primeiroNome}` : 'Sua conta de afiliado'}</h1>
        {dados && status !== 'pendente' && (
          <p className="mt-2 text-[16px] text-ink-muted">
            {rotuloMes(dados.mes)} <span aria-hidden="true">·</span> {textoDias(dados.diasRestantes).toLowerCase()}
          </p>
        )}
      </div>
      <p className="inline-flex items-center gap-2.5 border border-line bg-white px-3.5 py-2 text-[14px] font-semibold text-ink">
        <span className={`h-2.5 w-2.5 ${st.marca}`} aria-hidden="true" />
        <span>
          <span className="sr-only">Situação: </span>
          {st.texto}
        </span>
      </p>
    </div>
  )

  if (status === 'pendente' || !dados) {
    return (
      <div className="max-w-3xl">
        {cabeca}
        <Aviso status={status} emailSuporte={emailSuporte} />
        <CodigoLink codigo={codigo} link={link} className="mt-8" />
        {(dados?.niveis || niveis)?.length > 0 && (
          <div className="card-line mt-8 px-6 py-6 sm:px-8">
            <EscadaNiveis niveis={dados?.niveis || niveis} comSelo />
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {cabeca}
      <Aviso status={status} emailSuporte={emailSuporte} />
      <div ref={topo} className="mt-7 scroll-mt-[68px]">
        <Abas ativa={aba} onTrocar={trocar} />
      </div>
      <div id={`painel-${aba}`} role="tabpanel" aria-labelledby={`aba-${aba}`} tabIndex={-1} className="mt-6 focus:outline-none">
        {aba === 'inicio' && <Inicio d={dados} codigo={codigo} link={link} nome={nome} config={cfg} avisarCadaVenda={avisarCadaVenda} irPara={trocar} />}
        {aba === 'vendas' && <Vendas mesAtual={dados.mes} />}
        {aba === 'ganhos' && <Ganhos niveis={dados.niveis} />}
        {aba === 'saques' && <Saques />}
        {aba === 'pix' && <DadosPix />}
        {aba === 'como' && <ComoFunciona niveis={dados.niveis} config={cfg} />}
      </div>
    </div>
  )
}
