'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { cn } from '@/lib/cn'

// Origem: shadcn/ui, apps/www/registry/new-york/ui/dialog.tsx @ tag shadcn-ui@0.9.4.
// Convertido para JavaScript; os primitivos vêm do pacote unificado `radix-ui`
// em vez de `@radix-ui/react-dialog` — mesmos primitivos, um pacote só.
//
// O ícone de fechar é SVG inline, no traço 1.8 que o resto do site já usa
// (Header.jsx, ui.jsx, AccessPanel.jsx), em vez de trazer o lucide-react
// inteiro por causa de um X.
//
// Superfície: fundo branco com borda `line` e raio de 10px, igual ao `.panel`.
// Sem sombra — quem separa o diálogo da página é a cortina `bg-ink/60`.

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-ink/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  )
})

const DialogContent = React.forwardRef(function DialogContent(
  { className, children, ...props },
  ref
) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-line bg-white p-6 duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      >
        {children}
        {/* 40x40 de área clicável para um ícone de 18px: o padrão do shadcn dá
            26px, que passa raspando no mínimo da WCAG 2.2 e é apertado para o
            dedo. O ícone não muda de tamanho, só o alvo. */}
        <DialogPrimitive.Close className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded text-ink-muted transition-colors hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          <span className="sr-only">Fechar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})

function DialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-2 pr-8', className)} {...props} />
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-3 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

const DialogTitle = React.forwardRef(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-[21px] font-bold leading-snug tracking-[-0.02em] text-ink', className)}
      {...props}
    />
  )
})

const DialogDescription = React.forwardRef(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-[15.5px] leading-[1.68] text-ink-muted', className)}
      {...props}
    />
  )
})

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
