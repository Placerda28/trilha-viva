import { cn } from '@/lib/cn'
import { sigla } from '@/lib/catalogo-util'

// A capa da música: public/capas/<slug>.webp (112 px, scripts/buscar-capas.mjs) por
// cima do quadrado preto com as iniciais (MUDANÇAS §13). Música sem capa: o
// navegador não acha o arquivo e a própria imagem mostra as iniciais (.capa-img no
// globals.css cobre o ícone de imagem quebrada).
// Assim não vai lista de "quem tem capa" para o navegador, e nenhum JavaScript.
// shortcut: 112 px na ficha (até 140 px) fica um pouco mole em tela retina; se
// incomodar, gerar uma versão maior só para a ficha.
export default function Capa({ slug, titulo, grande = false, className }) {
  const letras = sigla(titulo)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'font-semi-condensed relative flex shrink-0 items-center justify-center overflow-hidden bg-ink text-white',
        grande
          ? 'aspect-square w-[clamp(96px,12cqi,140px)] text-[clamp(32px,4cqi,44px)] font-extrabold'
          : 'h-[52px] w-[52px] text-[16px] font-bold',
        className
      )}
    >
      {letras}
      {slug && (
        // eslint-disable-next-line @next/next/no-img-element -- img simples: sem custo de CPU no Worker
        <img
          src={`/capas/${slug}.webp`}
          alt=""
          width={112}
          height={112}
          loading={grande ? 'eager' : 'lazy'}
          decoding="async"
          data-sigla={letras}
          className="capa-img absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  )
}
