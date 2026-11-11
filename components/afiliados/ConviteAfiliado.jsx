'use client'

import { useEffect, useState } from 'react'
import Moeda3D from '@/components/afiliados/landing/Moeda3D'
import ValorAnimado from '@/components/afiliados/landing/ValorAnimado'
import '@/app/afiliados/landing.css'

// Convite para o programa de afiliados, no topo de /acervo. O servidor só manda
// este componente para quem ainda não é afiliado e com o programa aberto, e já
// manda os números prontos (`exemplos`), então o navegador não calcula dinheiro.
//
// Fechar ("Agora não" ou o X) guarda a data no localStorage e o card some por
// DIAS_ESCONDIDO. Ele só aparece depois de montar, para não piscar para quem já
// fechou; sem localStorage (aba anônima), aparece normalmente.
const CHAVE = 'tv_convite_afiliado_fechado'
const DIAS_ESCONDIDO = 10

function fechadoRecentemente() {
  try {
    const t = Number(window.localStorage.getItem(CHAVE))
    return t > 0 && Date.now() - t < DIAS_ESCONDIDO * 864e5
  } catch {
    return false
  }
}

export default function ConviteAfiliado({ exemplos, corOuro, valorOuro, vendasOuro, href = '/afiliados' }) {
  const [visivel, setVisivel] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [escolha, setEscolha] = useState(exemplos.length - 1)

  useEffect(() => {
    if (!fechadoRecentemente()) setVisivel(true)
  }, [])

  const fechar = () => {
    try {
      window.localStorage.setItem(CHAVE, String(Date.now()))
    } catch {
      // sem armazenamento: some só nesta visita
    }
    setSaindo(true)
    window.setTimeout(() => setVisivel(false), 260)
  }

  if (!visivel) return null
  const atual = exemplos[escolha]

  return (
    <aside
      aria-labelledby="convite-afiliado-titulo"
      className={`convite-afiliado relative mt-8 overflow-hidden rounded-2xl bg-ink text-white ${saindo ? 'convite-saindo' : ''}`}
    >
      {/* brilho dourado de fundo, atrás da moeda */}
      <div aria-hidden="true" className="convite-brilho pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full" />

      <button
        type="button"
        onClick={fechar}
        aria-label="Fechar o convite"
        className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="relative z-10 grid gap-8 px-5 pb-7 pt-7 sm:px-9 sm:pb-9 sm:pt-9 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.14em] text-white/85">
            <span className="convite-ponto h-2 w-2 rounded-full bg-signal" aria-hidden="true" />
            Programa de afiliados
          </p>

          <h2 id="convite-afiliado-titulo" className="mt-5 max-w-[17ch] text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[42px]">
            Ganhe <span className="convite-ouro figs whitespace-nowrap">R$ 3.000+</span> por mês indicando a Trilha Viva
          </h2>

          <p className="mt-4 max-w-[46ch] text-[15.5px] leading-[1.6] text-white/75">
            Você já sabe o quanto as VS ajudam no culto. Indique para outros ministérios e receba{' '}
            <strong className="font-bold text-white">até {valorOuro} por venda</strong>, direto no seu Pix. Cadastro grátis, em 2 minutos.
          </p>

          {/* mini simulador: o número muda conforme a quantidade escolhida */}
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 sm:p-5">
            <p id="convite-vendas" className="text-[13px] font-semibold text-white/60">
              Vendas pelo seu link, por mês:
            </p>
            <div role="radiogroup" aria-labelledby="convite-vendas" className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
              {exemplos.map((ex, i) => (
                <button
                  key={ex.vendas}
                  type="button"
                  role="radio"
                  aria-checked={i === escolha}
                  aria-label={`${ex.vendas} vendas`}
                  onClick={() => setEscolha(i)}
                  className={`figs min-h-[40px] rounded-full min-w-[60px] px-3.5 text-[13.5px] sm:px-4 sm:text-[14px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    i === escolha ? 'bg-white text-ink' : 'border border-white/20 text-white/80 hover:border-white/50 hover:text-white'
                  }`}
                >
                  {ex.vendas}
                  <span className="hidden min-[400px]:inline"> vendas</span>
                </button>
              ))}
            </div>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <ValorAnimado texto={atual.total} className="convite-ouro figs text-[34px] font-extrabold leading-none sm:text-[40px]" />
              <span className="sr-only" aria-live="polite">
                {atual.vendas} vendas no mês rendem {atual.total}
              </span>
              <span className="text-[14px] text-white/60">
                no mês · nível <strong className="font-semibold text-white/90">{atual.nivel}</strong>
              </span>
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a href={href} className="btn-glow">
              Quero ser afiliado
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ml-2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <button type="button" onClick={fechar} className="text-[14px] font-semibold text-white/55 underline-offset-4 hover:text-white hover:underline">
              Agora não
            </button>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-white/45">
            Exemplo: {vendasOuro} vendas ou mais no mês = nível Ouro, {valorOuro} por venda; 100 vendas = R$ 3.000. Quem compra paga o preço normal. O
            ganho depende das suas indicações.
          </p>
        </div>

        <div className="hidden md:flex md:flex-col md:items-center md:pr-4">
          <Moeda3D cor={corOuro} grau={3} tamanho={168} titulo="Nível Ouro" />
          <p className="mt-5 text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-white/55">Nível Ouro</p>
        </div>
      </div>
    </aside>
  )
}
