'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Dentro da aba Recuperação: a lista de pessoas e as conversas do WhatsApp.
const SUBABAS = [
  { href: '/gestao/recuperacao', rotulo: 'Pessoas' },
  { href: '/gestao/recuperacao/whatsapp', rotulo: 'WhatsApp' },
]

export default function SubAbasRecuperacao() {
  const pathname = usePathname()
  return (
    <nav aria-label="Recuperação" className="mb-6 flex gap-2">
      {SUBABAS.map((aba) => {
        const ativa = pathname === aba.href
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? 'page' : undefined}
            className={
              'rounded border px-3.5 py-2 text-[14px] font-semibold transition-colors duration-150 ' +
              (ativa ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink')
            }
          >
            {aba.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
