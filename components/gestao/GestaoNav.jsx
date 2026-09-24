'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// As abas da gestão. Novas telas (Cupons, Equipe, Registro) entram nesta
// lista; a Equipe só aparece para o master, e a própria rota dela recusa quem
// não é — esconder aqui é conforto, não segurança.
const ABAS = [
  { href: '/gestao/clientes', rotulo: 'Clientes' },
  { href: '/gestao/periodo', rotulo: 'Por período' },
  { href: '/gestao/cupons', rotulo: 'Cupons' },
]

export default function GestaoNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Gestão" className="-mx-5 mt-8 overflow-x-auto border-b border-line px-5 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-7">
        {ABAS.map((aba) => {
          const ativa = pathname === aba.href || pathname.startsWith(aba.href + '/')
          return (
            <li key={aba.href}>
              <Link
                href={aba.href}
                aria-current={ativa ? 'page' : undefined}
                className={
                  '-mb-px inline-block border-b-2 pb-3 text-[15px] font-semibold transition-colors duration-150 ' +
                  (ativa
                    ? 'border-signal text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink')
                }
              >
                {aba.rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
