import Link from 'next/link'
import { cn } from '@/lib/cn'
import Capa from './Capa'

// Uma linha do acervo: capa, título, "Artista · Estilo" e, à direita, Tom e BPM.
// Campo sem dado não aparece (nada de "—"). `detalhe` troca o "Estilo" por outro
// texto (na ficha, o motivo de a música estar na lista). `direita` troca Tom e BPM.
// Sem prefetch: são centenas de links por página.
//
// `musica`: { slug, titulo, artista, estilo, tom, bpm }
export function LinhaMusica({ musica, detalhe, direita }) {
  const { slug, titulo, artista, estilo, tom, bpm } = musica
  const sub = [artista, detalhe ?? estilo].filter(Boolean).join(' · ')
  return (
    <li className="border-t border-line">
      <Link
        href={`/musicas/${slug}`}
        prefetch={false}
        className="flex min-h-[76px] items-center gap-3.5 py-2 hover:bg-surface"
      >
        <Capa titulo={titulo} />
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="text-[16px] font-semibold leading-[1.3]">{titulo}</span>
          <span className="text-[14px] text-text-3">{sub}</span>
        </span>
        {direita ?? (
          <span className="figs flex shrink-0 flex-col items-end gap-[3px] text-[14px] text-text-2">
            {tom && <span>Tom {tom}</span>}
            {bpm > 0 && <span>{bpm} BPM</span>}
          </span>
        )}
      </Link>
    </li>
  )
}

// Duas colunas no computador, uma no celular; o fio de baixo fecha a lista.
export function ListaMusicas({ children, largura = 520, folga = 48, className }) {
  return (
    <ul
      className={cn('m-0 grid list-none border-b border-line p-0', className)}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${largura}px), 1fr))`,
        columnGap: folga,
      }}
    >
      {children}
    </ul>
  )
}
