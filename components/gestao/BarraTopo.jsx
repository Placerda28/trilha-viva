'use client'

import { useEffect, useRef, useState } from 'react'
import { DropdownMenu, Dialog as DialogPrimitive } from 'radix-ui'
import Icone from './Icone'
import { Avatar, PAPEL, sairDaConta } from './BarraLateral'

// Barra do topo do computador (60 px) e a barra do celular (56 px). A busca de
// pessoa e o seletor de período aqui são só a casca: quem liga os dados é a
// Fase 3 (busca) e o hook usePeriodo (período, que mora na URL).

export const PERIODOS = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: '7d', rotulo: '7 dias' },
  { id: '30d', rotulo: '30 dias' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes-passado', rotulo: 'Mês passado' },
]

const ITEM_MENU =
  'flex cursor-default select-none items-center gap-2 rounded-sm px-3 text-[14px] text-ink outline-none data-[highlighted]:bg-mist '
const CONTEUDO_MENU = 'z-[60] min-w-[200px] rounded-md border border-line bg-white p-1'

// Seletor de período: no computador mora na barra do topo; no celular vai para
// uma linha logo abaixo do título da página (CabecalhoPagina).
export function SeletorPeriodo({ valor, onEscolher, intervalo = '', cheio = false }) {
  const [interno, setInterno] = useState('30d')
  const atual = valor ?? interno
  const escolher = (id) => {
    setInterno(id)
    if (onEscolher) onEscolher(id)
  }
  const rotulo = (PERIODOS.find((p) => p.id === atual) || PERIODOS[2]).rotulo
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={
            'flex items-center gap-2 rounded border border-line bg-white px-3 text-[14px] font-semibold text-ink transition-colors duration-150 hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper ' +
            (cheio ? 'h-11 w-full justify-between' : 'h-10')
          }
        >
          <span className="flex items-center gap-2">
            <Icone nome="calendario" tamanho={18} className="text-ink-muted" />
            <span>{rotulo}</span>
            {intervalo && <span className="figs hidden font-normal text-ink-muted xl:inline">{intervalo}</span>}
            {intervalo && cheio && <span className="figs font-normal text-ink-muted">{intervalo}</span>}
          </span>
          <Icone nome="baixo" tamanho={16} className="text-ink-muted" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={CONTEUDO_MENU}>
          {PERIODOS.map((p) => (
            <DropdownMenu.Item key={p.id} onSelect={() => escolher(p.id)} className={ITEM_MENU + 'h-11 md:h-10'}>
              <span className="w-4">{p.id === atual && <Icone nome="confere" tamanho={16} />}</span>
              {p.rotulo}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={ITEM_MENU + 'h-11 md:h-10'}>
            <span className="w-4" />
            Escolher datas
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function MenuConta({ email, papel, onSair = sairDaConta }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Conta"
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <Avatar email={email} className="h-10 w-10 !bg-ink text-[13.5px]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={CONTEUDO_MENU + ' w-[260px]'}>
          <div className="px-3 pb-2 pt-2">
            <p className="break-all text-[14px] font-semibold text-ink">{email}</p>
            <p className="text-[13px] text-ink-muted">{PAPEL[papel] || papel}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <a href="/acervo" className={ITEM_MENU + 'h-10'}>
              Ir para o acervo
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={onSair} className={ITEM_MENU + 'h-10'}>
            Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// Busca em tela cheia do celular (a lupa da barra de 56 px).
function BuscaCelular() {
  const [aberta, setAberta] = useState(false)
  return (
    <DialogPrimitive.Root open={aberta} onOpenChange={setAberta}>
      <DialogPrimitive.Trigger asChild>
        <button type="button" aria-label="Buscar pessoa" className="grid h-11 w-11 place-items-center rounded text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
          <Icone nome="lupa" tamanho={20} />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 bg-paper md:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Buscar pessoa</DialogPrimitive.Title>
          <div className="flex h-14 items-center gap-2 border-b border-line bg-white px-2">
            <div className="relative min-w-0 flex-1">
              <Icone nome="lupa" tamanho={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                autoFocus
                placeholder="Nome, e-mail ou celular"
                className="h-11 w-full rounded border border-line bg-paper pl-10 pr-3 text-[16px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
              />
            </div>
            <DialogPrimitive.Close className="h-11 shrink-0 rounded px-3 text-[14.5px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
              Cancelar
            </DialogPrimitive.Close>
          </div>
          <p className="px-4 pt-4 text-[14px] text-ink-muted">
            Digite pelo menos 3 letras do nome, do e-mail ou do celular.
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export default function BarraTopo({ grupo, titulo, email, papel, intervalo, recolhida, onRecolher, onMenu, comPeriodo = true, onSair }) {
  const busca = useRef(null)
  const [atalho, setAtalho] = useState('Ctrl K')

  // Ctrl K (ou ⌘ K no Mac) põe o cursor na busca.
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || '')) setAtalho('⌘ K')
    const tecla = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        busca.current?.focus()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      {/* Celular: ☰, título, lupa. */}
      <div className="flex h-14 items-center justify-between px-2 md:hidden">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Abrir menu"
          className="grid h-11 w-11 place-items-center rounded text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <Icone nome="menu" tamanho={22} />
        </button>
        <p className="truncate px-2 text-[16px] font-bold tracking-[-0.01em] text-ink">{titulo}</p>
        <BuscaCelular />
      </div>

      {/* Tablet e computador. */}
      <div className="hidden h-[60px] items-center gap-3 px-4 md:flex lg:px-6">
        <button
          type="button"
          onClick={onRecolher}
          aria-label={recolhida ? 'Abrir a barra lateral' : 'Recolher a barra lateral'}
          aria-pressed={recolhida}
          className="hidden h-10 w-10 shrink-0 place-items-center rounded text-ink-muted transition-colors duration-150 hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink lg:grid"
        >
          <Icone nome="recolher" tamanho={18} />
        </button>

        <p className="flex shrink-0 items-center gap-1.5 text-[14.5px]">
          <span className="text-ink-muted">{grupo}</span>
          <Icone nome="direita" tamanho={14} className="text-ink-faint" />
          <span className="font-bold tracking-[-0.01em] text-ink">{titulo}</span>
        </p>

        <div className="relative mx-auto min-w-0 max-w-[440px] flex-1">
          <Icone nome="lupa" tamanho={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            ref={busca}
            type="search"
            aria-label="Buscar pessoa por nome, e-mail ou celular"
            aria-keyshortcuts="Control+K Meta+K"
            placeholder="Buscar nome, e-mail ou celular"
            className="h-10 w-full rounded border border-transparent bg-paper pl-10 pr-3 text-[14px] text-ink placeholder:text-ink-muted focus:border-ink focus:bg-white focus:outline-none lg:pr-16"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-sm border border-line bg-white px-1.5 py-0.5 font-sans text-[12px] text-ink-muted lg:block">
            {atalho}
          </kbd>
        </div>

        {comPeriodo && <SeletorPeriodo intervalo={intervalo} />}
        <MenuConta email={email} papel={papel} onSair={onSair} />
      </div>
    </header>
  )
}
