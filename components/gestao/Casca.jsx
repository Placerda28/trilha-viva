'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import BarraLateral, { achaAtivo, menuDoPapel } from './BarraLateral'
import BarraTopo, { SeletorPeriodo } from './BarraTopo'
import NavCelular from './NavCelular'

// A casca da gestão: barra lateral (computador), barra do topo, e no celular a
// barra de baixo com a gaveta. Quem usa passa `papel` e `email` (do layout) e
// `avisos` (o JSON de /api/gestao/avisos, que traz o número do WhatsApp).
//
// `ativo` força o endereço marcado no menu (o protótipo usa); sem ele, vale o
// caminho da página.
const CHAVE = 'gestao-barra-recolhida'

export default function Casca({ papel, email, avisos, ativo, titulo, intervalo, onSair, children }) {
  const caminho = usePathname()
  const menu = useMemo(() => menuDoPapel(papel), [papel])
  const achado = achaAtivo(menu, ativo || caminho)

  const [recolhida, setRecolhida] = useState(false)
  const [gaveta, setGaveta] = useState(false)

  // A escolha de recolher fica só neste navegador. Lida depois da montagem,
  // para o servidor e o navegador desenharem a mesma coisa na primeira vez.
  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE) === '1') setRecolhida(true)
    } catch {
      /* navegador sem armazenamento: a barra abre aberta */
    }
  }, [])

  const alternar = () => {
    setRecolhida((r) => {
      try {
        localStorage.setItem(CHAVE, r ? '0' : '1')
      } catch {
        /* sem armazenamento, vale só nesta visita */
      }
      return !r
    })
  }

  return (
    <div className="flex min-h-dvh bg-paper font-sans text-ink">
      <BarraLateral
        menu={menu}
        ativo={achado?.item.href}
        avisos={avisos}
        papel={papel}
        email={email}
        recolhida={recolhida}
        onSair={onSair}
      />
      <div className="min-w-0 flex-1">
        <BarraTopo
          grupo={achado?.grupo}
          titulo={titulo || achado?.item.rotulo}
          email={email}
          papel={papel}
          intervalo={intervalo}
          recolhida={recolhida}
          onRecolher={alternar}
          onMenu={() => setGaveta(true)}
          onSair={onSair}
        />
        <main className="mx-auto w-full max-w-[1280px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:pb-10 md:pt-6">
          {children}
        </main>
      </div>
      <NavCelular
        menu={menu}
        ativo={achado?.item.href}
        avisos={avisos}
        papel={papel}
        email={email}
        aberta={gaveta}
        aoMudar={setGaveta}
        onSair={onSair}
      />
    </div>
  )
}

// Título da página e uma linha curta de explicação. No celular, o seletor de
// período vem logo abaixo (no computador ele já está na barra do topo).
export function CabecalhoPagina({ titulo, texto, comPeriodo = false, intervalo }) {
  return (
    <div className="mb-5 md:mb-6">
      <h1 className="text-[24px] font-bold leading-[1.15] tracking-[-0.015em] text-ink">{titulo}</h1>
      {texto && <p className="mt-1 text-[14.5px] text-ink-muted">{texto}</p>}
      {comPeriodo && (
        <div className="mt-4 md:hidden">
          <SeletorPeriodo cheio intervalo={intervalo} />
        </div>
      )}
    </div>
  )
}
