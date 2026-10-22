'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LogoMark } from '../Logo'
import BarraLateral, { achaAtivo, menuDoPapel, sairDaConta } from './BarraLateral'
import BarraTopo, { SeletorPeriodo } from './BarraTopo'
import NavCelular from './NavCelular'
import { useAvisos } from './useAvisos'

// A casca da gestão: barra lateral (computador), barra do topo, e no celular a
// barra de baixo com a gaveta. Quem usa passa `papel` e `email` (do layout) e
// `avisos` (o JSON de /api/gestao/avisos, que traz o número do WhatsApp).
//
// `ativo` força o endereço marcado no menu (o protótipo usa); sem ele, vale o
// caminho da página.
//
// `fase1`: a gestão de verdade, com as telas atuais dentro. O menu só tem o que
// existe, e a busca e o período globais (que ainda não têm dados) ficam de fora.
// Sem `avisos` na chamada, a casca busca /api/gestao/avisos sozinha.
//
// `semMenu`: a pessoa com senha provisória só vê a troca de senha, sem navegação.
const CHAVE = 'gestao-barra-recolhida'

export default function Casca({
  papel,
  email,
  avisos: avisosDados,
  ativo,
  titulo,
  intervalo,
  fase1 = false,
  semMenu = false,
  onSair = sairDaConta,
  children,
}) {
  // O middleware reescreve /gestao para /interno/gestao; compara sem o prefixo.
  const caminho = (usePathname() || '').replace(/^\/interno(?=\/)/, '')
  const menu = useMemo(() => menuDoPapel(papel, fase1), [papel, fase1])
  const achado = achaAtivo(menu, ativo || caminho)
  const buscados = useAvisos(avisosDados === undefined && !semMenu)
  const avisos = avisosDados === undefined ? buscados : avisosDados

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

  if (semMenu) {
    return (
      <div className="min-h-dvh bg-paper font-sans text-ink">
        <header className="flex h-14 items-center justify-between border-b border-line bg-white px-4 md:px-6">
          <span className="flex items-center gap-3">
            <LogoMark size={28} tone="ink" />
            <span className="text-[15px] font-bold tracking-[-0.01em]">Trilha Viva · Gestão</span>
          </span>
          <button
            type="button"
            onClick={onSair}
            className="h-11 rounded px-3 text-[14px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            Sair
          </button>
        </header>
        <div className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-5 md:px-6 md:pt-6">
          <h1 className="sr-only">{titulo}</h1>
          <div className="[&>*:first-child]:!mt-0">{children}</div>
        </div>
      </div>
    )
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
          comPeriodo={!fase1}
          comBusca={!fase1}
          onSair={onSair}
        />
        {/* Sem <main> aqui: o layout raiz do site já entrega um (id="conteudo"). */}
        <div className="mx-auto w-full max-w-[1280px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:pb-10 md:pt-6">
          <h1 className="sr-only">{titulo || achado?.item.rotulo}</h1>
          {/* As telas atuais trazem o próprio espaço de cima; aqui ele sobra. */}
          <div className="[&>*:first-child]:!mt-0">{children}</div>
        </div>
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
