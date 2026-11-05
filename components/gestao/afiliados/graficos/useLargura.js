'use client'

import { useEffect, useRef, useState } from 'react'

// Largura real (em px) da caixa do gráfico, acompanhando a tela. O SVG é
// desenhado nessa largura, sem esticar: o texto fica do tamanho certo no celular.
export function useLargura() {
  const caixa = useRef(null)
  const [largura, setLargura] = useState(0)
  useEffect(() => {
    const el = caixa.current
    if (!el) return undefined
    const medir = () => setLargura(el.clientWidth)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [caixa, largura]
}
