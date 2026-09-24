'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { nav, priceBRL, site } from '@/lib/site'

// Rotas da conta: quem está aqui já comprou e já está logado, então "Entrar"
// e "Liberar por R$ X" não fazem sentido — o primeiro é redundante e o
// segundo tenta vender de novo para quem já pagou.
const ROTAS_DE_CONTA = ['/acervo', '/entrar', '/criar-senha', '/recuperar', '/redefinir']
// Os elementos com data-cta-compra são esses mesmos botões. A gestão, que não
// pode aparecer nesta lista (este arquivo vai para todo visitante), os esconde
// por conta própria com um estilo que só ela entrega.

export default function Header() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const emConta = ROTAS_DE_CONTA.some((r) => pathname === r || pathname.startsWith(r + '/'))

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 bg-ink text-white">
      <div className="flex h-[68px] w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* inline-flex items-center no proprio link: sem isso, o "a" vira uma
            caixa de linha comum, que soma a entrelinha do texto por cima do
            conteudo e empurra o conjunto (disco + "Trilha Viva") para cima
            do centro do cabecalho — visivel so ao medir, mas visivel. */}
        <Link
          href="/"
          aria-label="Trilha Viva, página inicial"
          onClick={() => setOpen(false)}
          className="inline-flex items-center"
        >
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
          {!emConta && (
            <>
              {/* Quem ja comprou volta aqui toda semana. O link fica discreto
                  para nao competir com a compra, mas presente para nao virar
                  suporte. */}
              <Link
                href="/entrar"
                data-cta-compra=""
                className="hidden text-[14.5px] text-white/70 transition-colors hover:text-white sm:inline"
              >
                Entrar
              </Link>
              <Link
                href="/assinar"
                data-cta-compra=""
                className="btn-signal hidden !px-5 !py-3 !text-[14.5px] sm:inline-flex"
              >
                Liberar por {priceBRL(site.price)}
              </Link>
            </>
          )}
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
          <div className="flex flex-col divide-y divide-white/10 px-4 sm:px-6">
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
            {!emConta && (
              <>
                <Link
                  href="/entrar"
                  data-cta-compra=""
                  onClick={() => setOpen(false)}
                  className="py-4 text-[17px] font-medium text-white"
                >
                  Entrar na minha conta
                </Link>
                <div className="py-5" data-cta-compra="">
                  <Link
                    href="/assinar"
                    onClick={() => setOpen(false)}
                    className="btn-signal w-full"
                  >
                    Liberar acesso por {priceBRL(site.price)}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
