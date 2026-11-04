'use client'

import { useEffect, useRef } from 'react'

export const ABAS = [
  { id: 'inicio', nome: 'Início' },
  { id: 'vendas', nome: 'Minhas vendas' },
  { id: 'ganhos', nome: 'Meus ganhos' },
  { id: 'saques', nome: 'Saques' },
  { id: 'pix', nome: 'Dados Pix' },
  { id: 'como', nome: 'Como funciona' },
]

// Faixa de abas que rola de lado no celular e fica presa logo abaixo do menu do
// site (68 px). A aba ativa leva um fio vermelho embaixo e é trazida para o
// meio da faixa quando troca. Setas esquerda/direita andam entre as abas.
export default function Abas({ ativa, onTrocar }) {
  const faixa = useRef(null)

  useEffect(() => {
    const el = faixa.current?.querySelector('[aria-selected="true"]')
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }, [ativa])

  function teclas(e) {
    const i = ABAS.findIndex((a) => a.id === ativa)
    const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const alvo = ABAS[e.key === 'Home' ? 0 : ABAS.length - 1].id
      onTrocar(alvo)
      faixa.current?.querySelector(`#aba-${alvo}`)?.focus()
      return
    }
    if (!passo) return
    e.preventDefault()
    const alvo = ABAS[(i + passo + ABAS.length) % ABAS.length].id
    onTrocar(alvo)
    faixa.current?.querySelector(`#aba-${alvo}`)?.focus()
  }

  return (
    <div className="sticky top-[68px] z-30 -mx-5 border-b border-line bg-paper/95 px-5 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
      <div
        ref={faixa}
        role="tablist"
        aria-label="Seções do painel"
        onKeyDown={teclas}
        className="flex gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ABAS.map((a) => {
          const sel = a.id === ativa
          return (
            <button
              key={a.id}
              id={`aba-${a.id}`}
              type="button"
              role="tab"
              aria-selected={sel}
              aria-controls={`painel-${a.id}`}
              tabIndex={sel ? 0 : -1}
              onClick={() => onTrocar(a.id)}
              className={`relative min-h-12 shrink-0 whitespace-nowrap px-4 text-[15.5px] transition-colors focus-visible:outline-offset-[-4px] ${
                sel ? 'font-extrabold text-ink' : 'font-semibold text-ink-muted hover:text-ink'
              }`}
            >
              {a.nome}
              <span aria-hidden="true" className={`absolute inset-x-3 bottom-0 h-[3px] ${sel ? 'bg-signal' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
