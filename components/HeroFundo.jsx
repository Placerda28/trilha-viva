'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// O efeito só existe no navegador e só é baixado depois que a página está
// pronta: o título aparece primeiro, sobre o fundo estático em CSS, e o
// animado entra por cima com um fade. Quem pediu "reduzir movimento" fica
// só com o estático (o arquivo do efeito nem é baixado).
const Gradiente = dynamic(() => import('./HeroGradiente'), { ssr: false })

export default function HeroFundo() {
  const [ligar, setLigar] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let cancelado = false
    let idle
    const agendar = () => {
      const ocioso = window.requestIdleCallback || ((fn) => setTimeout(fn, 200))
      idle = ocioso(() => !cancelado && setLigar(true), { timeout: 2500 })
    }
    if (document.readyState === 'complete') agendar()
    else window.addEventListener('load', agendar, { once: true })
    return () => {
      cancelado = true
      window.removeEventListener('load', agendar)
      if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle)
    }
  }, [])

  return ligar ? <Gradiente /> : null
}
