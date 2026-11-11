'use client'

import { useEffect, useRef, useState } from 'react'
import Moeda3D from '@/components/afiliados/landing/Moeda3D'
import ValorAnimado from '@/components/afiliados/landing/ValorAnimado'
import '@/app/afiliados/landing.css'

// Convite para o programa de afiliados, no topo de /acervo. O servidor só manda
// este componente para quem ainda não é afiliado e com o programa aberto, e já
// manda os números prontos (`exemplos`), então o navegador não calcula dinheiro.
//
// Dois tamanhos:
//   - "cheio": o card grande. Ao aparecer, o simulador sobe sozinho pelos
//     exemplos (a moeda troca de metal junto) e para no último. Um toque do
//     cliente interrompe a demonstração.
//   - "faixa": uma linha fina. É o que sobra depois de fechar o card (X), por
//     DIAS_FAIXA dias; depois disso o card grande volta uma vez.
// Nada é desenhado antes de montar, para não piscar para quem já fechou. Sem
// localStorage (aba anônima), o card aparece cheio e fechar vale só na visita.
const CHAVE = 'tv_convite_afiliado_fechado'
const DIAS_FAIXA = 30
const PASSO_MS = 900

function fechadoRecentemente() {
  try {
    const t = Number(window.localStorage.getItem(CHAVE))
    return t > 0 && Date.now() - t < DIAS_FAIXA * 864e5
  } catch {
    return false
  }
}
function gravarFechado(fechado) {
  try {
    if (fechado) window.localStorage.setItem(CHAVE, String(Date.now()))
    else window.localStorage.removeItem(CHAVE)
  } catch {
    // sem armazenamento: vale só nesta visita
  }
}

const Seta = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ml-2 shrink-0">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export default function ConviteAfiliado({
  exemplos,
  valorMaximo,
  hrefCadastro = '/minha-conta/afiliado',
  hrefComoFunciona = '/afiliados',
}) {
  const ultimo = exemplos.length - 1
  const [modo, setModo] = useState(null) // null (antes de montar) | 'cheio' | 'saindo' | 'faixa'
  const [escolha, setEscolha] = useState(0)
  const [tocou, setTocou] = useState(false)
  const demo = useRef(0)

  useEffect(() => {
    setModo(fechadoRecentemente() ? 'faixa' : 'cheio')
  }, [])

  // Demonstração: sobe um exemplo por vez até o último. Sem movimento
  // (prefers-reduced-motion), vai direto ao último.
  useEffect(() => {
    if (modo !== 'cheio' || tocou) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEscolha(ultimo)
      return undefined
    }
    if (escolha >= ultimo) return undefined
    demo.current = window.setTimeout(() => setEscolha((e) => Math.min(ultimo, e + 1)), escolha === 0 ? PASSO_MS + 500 : PASSO_MS)
    return () => window.clearTimeout(demo.current)
  }, [modo, tocou, escolha, ultimo])

  const escolher = (i) => {
    setTocou(true)
    setEscolha(i)
  }
  const fechar = () => {
    gravarFechado(true)
    setModo('saindo')
    window.setTimeout(() => setModo('faixa'), 240)
  }
  const reabrir = () => {
    gravarFechado(false)
    setTocou(true)
    setEscolha(ultimo)
    setModo('cheio')
  }

  if (!modo) return null

  if (modo === 'faixa') {
    return (
      <aside aria-label="Programa de afiliados" className="convite-faixa mt-8 flex items-center justify-between gap-4 rounded-xl bg-ink px-4 py-3 text-white sm:px-5">
        <p className="flex items-center gap-2.5 text-[14px] leading-snug text-white/85">
          <span className="h-2 w-2 shrink-0 rounded-full bg-signal" aria-hidden="true" />
          <span>
            Ganhe <strong className="convite-dourado whitespace-nowrap font-bold">até {valorMaximo} por venda</strong> indicando a Trilha Viva.
          </span>
        </p>
        <button type="button" onClick={reabrir} className="inline-flex min-h-[40px] shrink-0 items-center text-[14px] font-bold text-white underline underline-offset-4 hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Ver como
        </button>
      </aside>
    )
  }

  const atual = exemplos[escolha]
  return (
    <aside
      aria-labelledby="convite-afiliado-titulo"
      className={`convite-afiliado relative mt-8 overflow-hidden rounded-2xl bg-ink text-white ${modo === 'saindo' ? 'convite-saindo' : ''}`}
    >
      {/* brilho de fundo na cor do nível escolhido */}
      <div aria-hidden="true" className="convite-brilho pointer-events-none absolute -right-28 -top-28 h-[420px] w-[420px] rounded-full" style={{ '--convite-cor': atual.cor }} />

      <button
        type="button"
        onClick={fechar}
        aria-label="Fechar o convite"
        className="absolute right-2 top-2 z-20 grid h-11 w-11 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="relative z-10 grid gap-8 px-5 pb-6 pt-7 sm:px-9 sm:pb-8 sm:pt-9 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-10">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.14em] text-white/85">
            <span className="convite-ponto h-2 w-2 rounded-full bg-signal" aria-hidden="true" />
            Programa de afiliados
          </p>

          <h2 id="convite-afiliado-titulo" className="mt-5 max-w-[16ch] text-[31px] font-extrabold leading-[1.04] tracking-[-0.025em] [text-wrap:balance] sm:text-[44px]">
            Ganhe <span className="convite-ouro figs whitespace-nowrap">R$ 3.000+</span> por mês indicando a Trilha Viva
          </h2>

          <p className="mt-4 max-w-[44ch] text-[15.5px] leading-[1.6] text-white/75">
            Você já usa e sabe que funciona. Indique para outros ministérios e receba{' '}
            <strong className="font-bold text-white">até {valorMaximo} por venda</strong>, direto no seu Pix.
          </p>

          {/* mini simulador: o valor (pronto do servidor) muda com a quantidade */}
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 sm:p-5">
            <p id="convite-vendas" className="text-[13px] font-semibold text-white/60">
              Vendas pelo seu link, por mês
            </p>
            <div role="group" aria-labelledby="convite-vendas" className="mt-3 grid max-w-[360px] grid-cols-4 gap-1.5 sm:gap-2">
              {exemplos.map((ex, i) => (
                <button
                  key={ex.vendas}
                  type="button"
                  aria-pressed={i === escolha}
                  aria-label={`${ex.vendas} vendas`}
                  onClick={() => escolher(i)}
                  className={`figs min-h-[44px] rounded-full text-[15px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    i === escolha ? 'bg-white text-ink' : 'border border-white/20 text-white/80 hover:border-white/50 hover:text-white'
                  }`}
                >
                  {ex.vendas}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p>
                <ValorAnimado texto={atual.total} className="convite-dourado figs block text-[38px] font-extrabold leading-none tracking-[-0.02em] sm:text-[44px]" />
                <span className="sr-only" aria-live={tocou ? 'polite' : 'off'}>
                  {atual.vendas} vendas no mês rendem {atual.total}, nível {atual.nivel}
                </span>
                <span aria-hidden="true" className="mt-2 block text-[14px] text-white/60">
                  no mês · nível <strong className="font-semibold text-white/90">{atual.nivel}</strong>
                  <span className="hidden sm:inline"> · </span>
                  <span className="block whitespace-nowrap sm:inline">{atual.porVenda} por venda</span>
                </span>
              </p>
              {/* no celular a moeda fica aqui dentro; no computador, na coluna ao lado */}
              <div className="md:hidden">
                <Moeda3D cor={atual.cor} grau={atual.grau} tamanho={68} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href={hrefCadastro} className="btn-glow w-full min-[420px]:w-auto">
              Quero ser afiliado
              <Seta />
            </a>
            <a href={hrefComoFunciona} className="inline-flex min-h-[40px] w-full items-center justify-center text-[14px] font-semibold text-white/70 underline min-[420px]:w-auto underline-offset-4 hover:text-white">
              Como funciona
            </a>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-white/45">
            Cadastro grátis. Exemplo: 100 vendas no mês, no nível Ouro, a {valorMaximo} por venda = R$ 3.000. Quem compra paga o preço normal. O ganho
            depende das suas indicações.
          </p>
        </div>

        <div className="hidden md:flex md:flex-col md:items-center md:pr-6">
          <Moeda3D cor={atual.cor} grau={atual.grau} tamanho={176} />
          <p className="mt-6 text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-white/55">Nível {atual.nivel}</p>
        </div>
      </div>
    </aside>
  )
}
