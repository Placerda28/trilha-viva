'use client'

import Link from 'next/link'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { LogoMark } from '../Logo'
import Icone from './Icone'
import { Conta, ListaMenu } from './BarraLateral'

// Celular (< 768 px): barra de baixo com 4 atalhos e "Mais", e a gaveta com o
// menu inteiro (a mesma lista da barra lateral). O "Mais" e o ☰ do topo abrem
// a mesma gaveta, que é controlada pela Casca.

const ATALHOS = ['/gestao', '/gestao/vendas', '/gestao/clientes', '/gestao/recuperacao/whatsapp']

function achaItem(menu, href) {
  for (const g of menu) for (const i of g.itens) if (i.href === href) return i
  return null
}

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-inset'

export default function NavCelular({ menu, ativo, avisos, papel, email, aberta, aoMudar, onSair }) {
  const itens = ATALHOS.map((h) => achaItem(menu, h)).filter(Boolean)
  const fechar = () => aoMudar(false)

  return (
    <>
      <nav
        aria-label="Atalhos da gestão"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="grid h-16 grid-cols-5">
          {itens.map((i) => {
            const marcado = ativo === i.href
            const n = i.contador && avisos ? avisos[i.contador] : 0
            return (
              <li key={i.href} className="relative">
                <Link
                  href={i.href}
                  prefetch={false}
                  aria-current={marcado ? 'page' : undefined}
                  className={
                    'relative flex h-full flex-col items-center justify-center gap-1 text-[11.5px] font-semibold transition-colors duration-150 ' +
                    FOCO +
                    ' ' +
                    (marcado
                      ? 'text-ink before:absolute before:inset-x-3 before:-top-px before:h-[2px] before:bg-signal'
                      : 'text-ink-muted')
                  }
                >
                  <span className="relative">
                    <Icone nome={i.icone} tamanho={22} />
                    {n > 0 && (
                      <span className="figs absolute -right-3 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-sm bg-signal px-1 text-[11px] font-bold leading-none text-white">
                        <span className="sr-only">{n} conversas esperando resposta</span>
                        <span aria-hidden="true">{n}</span>
                      </span>
                    )}
                  </span>
                  {i.rotulo}
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => aoMudar(true)}
              aria-haspopup="dialog"
              className={'flex h-full w-full flex-col items-center justify-center gap-1 text-[11.5px] font-semibold text-ink-muted ' + FOCO}
            >
              <Icone nome="mais" tamanho={22} />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <DialogPrimitive.Root open={aberta} onOpenChange={aoMudar}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/60 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none md:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[86vw] flex-col bg-ink text-white duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left motion-reduce:animate-none md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <DialogPrimitive.Title className="sr-only">Menu da gestão</DialogPrimitive.Title>
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 pl-4 pr-2">
              <div className="flex items-center gap-3">
                <LogoMark size={28} tone="light" />
                <div className="leading-tight">
                  <p className="text-[15px] font-bold tracking-[-0.01em]">Trilha Viva</p>
                  <p className="text-[12.5px] text-ink-faint">Gestão</p>
                </div>
              </div>
              <DialogPrimitive.Close
                aria-label="Fechar menu"
                className="grid h-11 w-11 place-items-center rounded text-white/80 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <Icone nome="x" tamanho={22} />
              </DialogPrimitive.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
              <ListaMenu menu={menu} ativo={ativo} avisos={avisos} grande onEscolher={fechar} />
            </div>
            <Conta email={email} papel={papel} grande onSair={onSair} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
