'use client'

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

// O "ⓘ" ao lado de cada número. Abre uma janela curta com a explicação em
// português simples: no celular não existe passar o mouse, e uma janela nunca
// estoura a borda da tela. O botão tem 44 × 44 px de área, o desenho tem 18.
export default function Ajuda({ titulo, children, escuro = false, className = '' }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`O que é: ${titulo}`}
          className={`-my-3 -ml-1.5 -mr-3 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full align-middle transition-colors ${
            escuro ? 'text-white/65 hover:text-white' : 'text-ink-muted hover:text-ink'
          } ${className}`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="7.6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 8.2v4.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="9" cy="5.5" r="1" fill="currentColor" />
          </svg>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">{children}</div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
