'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ROTA_AFILIADO } from './rotas'

// Barra fixa no pé da tela, só no celular, com os dois caminhos da página:
// "Quero ser afiliado" e "Já sou afiliado". Entra quando o bloco `inicio` (os
// botões do topo) sai da tela e sai quando o bloco `fim` (a chamada final) ou o
// rodapé entram, para nunca repetir botão nem cobrir link. Sem salto de layout:
// é `fixed`. Escondida, fica fora da ordem de tabulação (`inert`).
export default function BarraAfiliado({ inicio = 'topo-acesso', fim = 'chamada-final' }) {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const primeiro = document.getElementById(inicio)
    if (!primeiro || typeof IntersectionObserver === 'undefined') return undefined
    const alvos = [primeiro, document.getElementById(fim), document.querySelector('footer')].filter(Boolean)
    const naTela = new Map()
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) naTela.set(e.target, e.isIntersecting)
      setVisivel(naTela.has(alvos[0]) && !alvos.some((a) => naTela.get(a)))
    })
    alvos.forEach((a) => obs.observe(a))
    return () => obs.disconnect()
  }, [inicio, fim])

  return (
    <div
      className="barra-afi fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-ink text-white lg:hidden"
      data-escondida={visivel ? undefined : ''}
      inert={!visivel}
    >
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <Link href={ROTA_AFILIADO} className="btn-signal min-h-12 !px-3">
          Quero ser afiliado
        </Link>
        <Link href={ROTA_AFILIADO} className="btn-onink min-h-12 !px-3">
          Já sou afiliado
        </Link>
      </div>
    </div>
  )
}
