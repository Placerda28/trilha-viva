import { cn } from '@/lib/cn'

// Títulos de seção do redesenho: Archivo semicondensada, peso 750, espaçamento negativo.
//   <H2>…</H2>              seção (26 a 34 px)
//   <H2 pequeno>…</H2>      sub-seção (22 px)
export function H2({ pequeno = false, className, ...resto }) {
  return (
    <h2
      className={cn(
        'font-semi-condensed font-[750] tracking-[-0.02em]',
        pequeno ? 'text-[22px] leading-[1.15]' : 'text-[clamp(26px,3cqi,34px)] leading-[1.05]',
        className
      )}
      {...resto}
    />
  )
}
