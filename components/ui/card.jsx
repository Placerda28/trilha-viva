import * as React from 'react'

import { cn } from '@/lib/cn'

// Origem: shadcn/ui, apps/www/registry/new-york/ui/card.tsx @ tag shadcn-ui@0.9.4.
// Convertido para JavaScript, com os tokens daqui.
//
// Duas mudanças de propósito, e a razão é a mesma: o card padrão do shadcn é
// `rounded-xl border shadow`, e "conteúdo picado em cards arredondados iguais,
// todos com a mesma sombra cinza" é um dos jeitos mais rápidos de um site
// parecer template. Este sistema não tem sombra em lugar nenhum — quem separa
// superfície é a borda `line` e a troca de fundo — e o raio segue o `.panel` do
// globals.css, que é 10px (`rounded-lg`), não 14px.

const Card = React.forwardRef(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('rounded-lg border border-line bg-white text-ink', className)}
      {...props}
    />
  )
})

const CardHeader = React.forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
})

const CardTitle = React.forwardRef(function CardTitle({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('text-[19px] font-bold leading-snug tracking-[-0.015em] text-ink', className)}
      {...props}
    />
  )
})

const CardDescription = React.forwardRef(function CardDescription({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('text-[15px] leading-[1.68] text-ink-muted', className)}
      {...props}
    />
  )
})

const CardContent = React.forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
})

const CardFooter = React.forwardRef(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
})

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
