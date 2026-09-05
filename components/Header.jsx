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
    <header className="sticky top-0 z-50 bg-ink text-white">
      <div className="flex h-[68px] w-full items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Trilha Viva, página inicial" onClick={() => setOpen(false)}>
          <Logo tone="light" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px] text-white/70 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/assinar"
            className="btn-signal hidden !px-5 !py-3 !text-[14.5px] sm:inline-flex"
          >
            Liberar por {priceBRL(site.price)}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            className="flex h-10 w-10 items-center justify-center text-white lg:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              {open ? (
                <path d="M5.5 5.5l11 11M16.5 5.5l-11 11" stroke="currentColor" strokeWidth="1.8" />
              ) : (
                <path d="M3 7h16M3 11h16M3 15h16" stroke="currentColor" strokeWidth="1.8" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-ink lg:hidden">
          <div className="flex flex-col divide-y divide-white/10 px-5 sm:px-8">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-4 text-[17px] font-medium text-white"
              >
                {item.label}
              </Link>
            ))}
            <div className="py-5">
              <Link href="/assinar" onClick={() => setOpen(false)} className="btn-signal w-full">
                Liberar acesso por {priceBRL(site.price)}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
