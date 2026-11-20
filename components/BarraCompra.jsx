'use client'

import { useEffect, useState } from 'react'
import { Botao } from './ds'
import { useUsuario } from './usuario'
import { TEXTO_COMPRA, priceBRL, site } from '@/lib/site'

// Barra de compra fixa no pe da tela, so no celular (some a partir de lg).
//
// Aparece quando o bloco `inicio` ja saiu da tela e some de novo quando o
// bloco `fim` ou o rodape entram nela: o `fim` e o outro lugar da pagina com
// botao de compra (para nao mostrar dois ao mesmo tempo), o rodape para a
// barra nunca cobrir os links dele. Na home: inicio = #topo, fim = #preco.
// Em /assinar: inicio = #comprar (card de preco do topo), fim = #comprar-fim.
// Tudo roda no navegador com IntersectionObserver; o servidor so entrega a
// pagina pronta, sem custo nenhum de processamento.
//
// Redesenho: o botao e o unico texto de compra do site ("Liberar as 2.000 VS"),
// e quem ja tem o pacote nao ve a barra (estado do usuario: components/usuario.js).
//
// Sem animacao de entrada: pela regra de movimento do site, o unico movimento
// e o ponto do clique no painel de sessao. A barra so aparece e some.
export default function BarraCompra({ inicio = 'topo', fim = 'preco', href = '/assinar' }) {
  const [visivel, setVisivel] = useState(false)
  const comPacote = useUsuario() === 'com-pacote'

  useEffect(() => {
    const primeiro = document.getElementById(inicio)
    if (!primeiro || typeof IntersectionObserver === 'undefined') return
    const alvos = [primeiro, document.getElementById(fim), document.querySelector('footer')].filter(
      Boolean
    )

    const naTela = new Map()
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) naTela.set(e.target, e.isIntersecting)
      const algumNaTela = alvos.some((a) => naTela.get(a))
      // Antes da primeira leitura do topo, nao mostra nada.
      setVisivel(naTela.has(alvos[0]) && !algumNaTela)
    })
    alvos.forEach((a) => obs.observe(a))
    return () => obs.disconnect()
  }, [inicio, fim])

  return (
    <div
      data-cta-compra=""
      data-tema="escuro"
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-dark-line bg-ink text-white lg:hidden ${
        visivel && !comPacote ? '' : 'hidden'
      }`}
    >
      <div className="flex items-center justify-between gap-4 px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5">
        <p className="leading-tight">
          <span className="figs block text-[17px] font-extrabold tracking-[-0.02em]">
            {priceBRL(site.price)}
          </span>
          <span className="block text-[12.5px] text-dark-text-3">pagamento único</span>
        </p>
        <Botao variante="compra" tamanho="md" href={href} className="px-5">
          {TEXTO_COMPRA}
        </Botao>
      </div>
    </div>
  )
}
