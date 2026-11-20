import Link from 'next/link'
import { cn } from '@/lib/cn'
import { Icone } from './Icone'

// Migalhas de pão. O último item é a página atual (sem link).
//
//   <Migalhas itens={[{ href: '/', label: 'Início' }, { href: '/musicas', label: 'Acervo' }, { label: 'Ousado Amor' }]} />
//
// `tema="escuro"` para fundo preto. Os links têm 44 px de altura de toque.
export function Migalhas({ itens, tema = 'claro', className }) {
  const escuro = tema === 'escuro'
  return (
    <nav aria-label="Trilha de navegação" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1">
        {itens.map((it, i) => {
          const ultimo = i === itens.length - 1
          return (
            <li key={(it.href || '') + it.label} className="flex items-center gap-1">
              {i > 0 && (
                <Icone nome="seta-direita" tamanho={14} traco={1.5} className={escuro ? 'text-dark-text-3' : 'text-text-3'} />
              )}
              {it.href && !ultimo ? (
                <Link
                  href={it.href}
                  className={cn(
                    'inline-flex min-h-11 min-w-11 items-center text-[14px] underline-offset-4 hover:underline',
                    escuro ? 'text-dark-text-2' : 'text-text-3 hover:text-ink'
                  )}
                >
                  {it.label}
                </Link>
              ) : (
                <span
                  aria-current={ultimo ? 'page' : undefined}
                  className={cn('inline-flex min-h-11 min-w-11 items-center text-[14px] font-[650]', escuro ? 'text-white' : 'text-ink')}
                >
                  {it.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
