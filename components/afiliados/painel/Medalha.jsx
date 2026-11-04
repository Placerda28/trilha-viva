import { useId } from 'react'
import { corMetal } from '@/lib/afiliados-painel'

// Selo do nível em metal de verdade. A cor de base é `nivel.cor`; o degradê tem
// uma faixa de brilho no meio para ler como metal e não como cor chapada. Os
// chevrons contam o degrau (1 bronze, 2 prata, 3 ouro) e usam a cor de traço de
// maior contraste sobre o metal. `grau` 0 = sem nível ainda: aro vazio.
export default function Medalha({ cor, grau = 1, tamanho = 64, titulo = '', className = '' }) {
  const id = useId().replace(/:/g, '')
  const m = corMetal(cor)
  const vazio = grau <= 0
  const passo = 7.5
  const altura = (grau - 1) * passo + 9
  const topo = 32 - altura / 2 + 1
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      role={titulo ? 'img' : undefined}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : 'true'}
    >
      <defs>
        <linearGradient id={`m${id}`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={m.claro} />
          <stop offset="0.3" stopColor={m.base} />
          <stop offset="0.48" stopColor={m.brilho} />
          <stop offset="0.66" stopColor={m.base} />
          <stop offset="1" stopColor={m.escuro} />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill={vazio ? 'none' : `url(#m${id})`} stroke={vazio ? 'currentColor' : 'none'} strokeOpacity="0.35" strokeWidth="2" strokeDasharray={vazio ? '3 4' : undefined} />
      {!vazio && (
        <>
          <circle cx="32" cy="32" r="25.5" fill="none" stroke={m.escuro} strokeOpacity="0.45" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="27" fill="none" stroke={m.brilho} strokeOpacity="0.5" strokeWidth="1" />
          {Array.from({ length: grau }, (_, i) => (
            <path
              key={i}
              d={`M21.5 ${topo + i * passo + 8} L32 ${topo + i * passo} L42.5 ${topo + i * passo + 8}`}
              fill="none"
              stroke={m.texto}
              strokeWidth="3.4"
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
          ))}
        </>
      )}
    </svg>
  )
}
