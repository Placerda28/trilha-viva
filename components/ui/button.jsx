import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/cn'

// Origem: shadcn/ui, apps/www/registry/new-york/ui/button.tsx @ tag shadcn-ui@0.9.4
// (era Tailwind 3 — o main de hoje é escrito para Tailwind 4). Convertido para
// JavaScript e com as classes trocadas pelos tokens daqui: ink, paper, mist,
// signal, line. Nenhum token novo foi criado.
//
// Sem a variante `destructive`: a paleta Frosted aura não tem tom de alerta e o
// site não tem ação destrutiva. Quando tiver, a cor se decide na hora.
//
// As medidas não são as do shadcn, são as que o site já usa: `.btn-signal` em
// app/globals.css é px-7 py-4 text-[15px] leading-none, o que dá 48px de altura
// — daí o h-12 do tamanho `default`. Raio de 4px (`rounded`), como todo botão
// daqui, e nenhuma sombra: neste sistema quem separa superfície é a borda
// `line` e a troca de fundo.
const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded font-semibold leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-signal-deep text-white hover:bg-ink',
        outline: 'border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-mist',
        secondary: 'bg-mist text-ink hover:bg-mist-deep',
        ghost: 'text-ink hover:bg-mist',
        link: 'text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-ink',
        // Para uso dentro de painel escuro (.panel / bg-ink), onde o contorno
        // claro é o que aparece.
        onink:
          'border border-white/25 bg-transparent text-white hover:border-white hover:bg-white hover:text-ink focus-visible:ring-mist focus-visible:ring-offset-ink',
      },
      size: {
        default: 'h-12 px-7 text-[15px]',
        sm: 'h-10 px-5 text-[14px]',
        lg: 'h-14 px-9 text-[16px]',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
})

export { Button, buttonVariants }
