'use client'

import { useEffect } from 'react'

// Não desenha nada. Procura os elementos marcados com `data-rv` e, só nos que
// estão abaixo da dobra, liga o estado "antes" (escondido); um único
// IntersectionObserver passa para "depois" quando chegam à tela. O padrão do
// HTML é visível, então sem JS, sem IntersectionObserver ou com
// `prefers-reduced-motion` nada fica escondido.
export default function RevelarAoRolar() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const alvos = [...document.querySelectorAll('[data-rv]')].filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92)
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue
          e.target.dataset.rvEstado = 'depois'
          obs.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
    )
    for (const el of alvos) {
      el.dataset.rvEstado = 'antes'
      obs.observe(el)
    }
    return () => {
      obs.disconnect()
      for (const el of alvos) delete el.dataset.rvEstado
    }
  }, [])
  return null
}
