import { cn } from '@/lib/cn'
import { sigla } from '@/lib/catalogo-util'

// A capa da música. Ainda não há capas no acervo: aparece o quadrado preto com
// as iniciais (MUDANÇAS §13). Quando as capas existirem, é aqui que entram.
export default function Capa({ titulo, grande = false, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'font-semi-condensed flex shrink-0 items-center justify-center bg-ink text-white',
        grande
          ? 'aspect-square w-[clamp(96px,12cqi,140px)] text-[clamp(32px,4cqi,44px)] font-extrabold'
          : 'h-[52px] w-[52px] text-[16px] font-bold',
        className
      )}
    >
      {sigla(titulo)}
    </span>
  )
}
