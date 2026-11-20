'use client'

import { useEffect, useState } from 'react'
import { Botao } from '@/components/ds'
import { ROTA_AFILIADO } from './rotas'

// Barra fixa no pé da tela, só no celular (MUDANÇAS §8): "Até R$ 30 por venda" e
// o botão "Quero ser afiliado". Entra quando o bloco `inicio` (os botões do topo)
// sai da tela e sai quando o bloco `fim` (a chamada final) ou o rodapé entram,
// para nunca repetir botão nem cobrir link. Sem salto de layout: é `fixed`, por
// isso fica FORA do elemento com container-type da página. Escondida, fica fora
// da ordem de tabulação (`inert`).
export default function BarraAfiliado({ maximo, inicio = 'topo-acesso', fim = 'chamada-final' }) {
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
      className="barra-afi fixed inset-x-0 bottom-0 z-40 border-t border-line-2 bg-white text-ink lg:hidden"
      data-escondida={visivel ? undefined : ''}
      inert={!visivel}
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5">
        <span className="text-[14px] leading-[1.3] text-text-2">
          Até <strong className="font-bold tabular-nums text-ink">{maximo}</strong> por venda
        </span>
        <Botao variante="compra" href={ROTA_AFILIADO} tamanho="md" className="shrink-0">
          Quero ser afiliado
        </Botao>
      </div>
    </div>
  )
}
