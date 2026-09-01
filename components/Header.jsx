'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { nav, priceBRL, site } from '@/lib/site'

export default function Header() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-md">
      {/* largura total: a marca encosta na esquerda, o botão na direita */}
      <div className="flex h-[70px] w-full items-center justify-between gap-4 px-4 sm:px-5">
        <Link href="/" aria-label="Trilha Viva — página inicial" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[14.5px] text-ink-muted transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/assinar" className="btn-solid hidden !px-5 !py-2.5 !text-[14px] sm:inline-flex">
            Garantir por {priceBRL(site.price)}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            className="flex h-9 w-9 items-center justify-center text-ink lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-paper lg:hidden">
          <div className="flex flex-col divide-y divide-line px-4 sm:px-5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-4 text-[16px] text-ink"
              >
                {item.label}
              </Link>
            ))}
            <div className="py-5">
              <Link href="/assinar" onClick={() => setOpen(false)} className="btn-accent w-full">
                Garantir por {priceBRL(site.price)}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
