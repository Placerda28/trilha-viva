'use client'

import { DropdownMenu } from 'radix-ui'
import Icone from './Icone'
import { Avatar, PAPEL, sairDaConta } from './BarraLateral'
import Busca, { BuscaCelular } from './Busca'
import PeriodoGlobal from './PeriodoGlobal'

// Barra do topo do computador (60 px) e a barra do celular (56 px): título e
// caminho, a Busca de pessoa (Busca.jsx), o período global (PeriodoGlobal.jsx,
// só nas telas que usam data) e o menu da conta.

const ITEM_MENU =
  'flex cursor-default select-none items-center gap-2 rounded-sm px-3 text-[14px] text-ink outline-none data-[highlighted]:bg-mist '
const CONTEUDO_MENU = 'z-[60] min-w-[200px] rounded-md border border-line bg-white p-1'

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

export default function BarraTopo({ grupo, titulo, email, papel, recolhida, onRecolher, onMenu, comPeriodo = true, comBusca = true, onSair }) {
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
        {comBusca ? <BuscaCelular /> : <span className="h-11 w-11" aria-hidden="true" />}
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

        {comBusca ? <Busca /> : <div className="flex-1" />}

        {comPeriodo && <PeriodoGlobal />}
        <MenuConta email={email} papel={papel} onSair={onSair} />
      </div>
    </header>
  )
}
