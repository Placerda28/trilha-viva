'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useConsultarUsuario, useUsuario } from './usuario'
import { Logo } from './Logo'
import { Botao, EmBreve, Icone } from './ds'
import { LINHA_PRECO, MINHA_CONTA, TEXTO_COMPRA, nav, navSecundario } from '@/lib/site'

// Cabeçalho do redesenho (DESIGN.md, MUDANÇAS §1).
//
// Tema: escuro (fundo preto, disco branco) na home e em /palco; claro no resto.
// Modo compra (/assinar): só a marca e "Pagamento seguro", sem menu.
// Página atual: traço vermelho de 2 px embaixo do link (computador) ou quadrado
// vermelho de 6 px (menu do celular).
//
// Quem está olhando: as páginas são estáticas, então o servidor não sabe. O
// cabeçalho assume "visitante" na primeira pintura e pergunta a /api/conta/estado
// uma vez por carregamento (de novo só nas rotas de entrada e compra, onde o
// estado muda). O último estado fica em sessionStorage só para a próxima página
// já nascer certa; a resposta do servidor sempre manda.
//   visitante   -> "Entrar" e o botão vermelho
//   sem-pacote  -> "Minha conta" (com ícone) e o botão vermelho
//   com-pacote  -> "Minha conta" em contorno; o botão vermelho sai
//
// `palco` ('em-breve' | 'lancado') vem do servidor (app/layout.js, lib/palco.js):
// ler process.env aqui no navegador daria um valor diferente do da página.

const ROTAS_DE_ENTRADA = ['/entrar', '/criar-senha', '/primeiro-acesso', '/recuperar', '/redefinir']
// Onde vender de novo não faz sentido (acabou de comprar, está entrando ou já está na conta).
const SEM_BOTAO_DE_COMPRA = [...ROTAS_DE_ENTRADA, '/sucesso', '/acervo', MINHA_CONTA]
const dentro = (pathname, rotas) => rotas.some((r) => pathname === r || pathname.startsWith(r + '/'))
const CONTORNO = 'border-[color-mix(in_srgb,currentColor_40%,transparent)]'
const LINHA = 'border-[color-mix(in_srgb,currentColor_14%,transparent)]'
const VOLTA = 'hover:bg-[color-mix(in_srgb,currentColor_8%,transparent)]'

function ativoDe(pathname) {
  const item = nav.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))
  return item ? item.id : ''
}

function BotaoConta({ className = '', onClick }) {
  return (
    <Link
      href={MINHA_CONTA}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-control border ${CONTORNO} px-[18px] text-[15px] font-semibold ${VOLTA} ${className}`}
    >
      <Icone nome="usuario" tamanho={18} />
      Minha conta
    </Link>
  )
}

export default function Header({ palco = 'em-breve' }) {
  const pathname = usePathname() || '/'
  useConsultarUsuario(pathname)
  const usuario = useUsuario()
  const [aberto, setAberto] = useState(false)
  const botaoMenu = useRef(null)

  const escuro = pathname === '/' || pathname === '/palco' || pathname.startsWith('/palco/')
  const compra = pathname === '/assinar' || pathname.startsWith('/assinar/')
  const ativo = ativoDe(pathname)
  const emBreve = palco !== 'lancado'
  const logado = usuario !== 'visitante'
  const comPacote = usuario === 'com-pacote'
  const mostraCTA = !comPacote && !dentro(pathname, SEM_BOTAO_DE_COMPRA)
  const mostraEntrar = !logado && !dentro(pathname, ROTAS_DE_ENTRADA)
  const fechar = () => setAberto(false)

  // Fecha o menu ao trocar de página, com Escape, e trava a rolagem enquanto aberto.
  useEffect(() => {
    setAberto(false)
  }, [pathname])
  useEffect(() => {
    document.body.style.overflow = aberto ? 'hidden' : ''
    if (!aberto) return undefined
    const esc = (e) => {
      if (e.key === 'Escape') {
        setAberto(false)
        botaoMenu.current?.focus()
      }
    }
    document.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  const marca = (
    <Link href="/" aria-label="Trilha Viva, página inicial" onClick={fechar} className="flex min-h-11 shrink-0 items-center">
      <Logo tone={escuro ? 'light' : 'ink'} />
    </Link>
  )

  return (
    <header
      data-site-chrome=""
      data-tema={escuro ? 'escuro' : 'claro'}
      className={`sticky top-0 z-50 ${escuro ? 'bg-ink text-white' : 'bg-white text-ink'}`}
    >
      <div className={`border-b ${LINHA}`}>
        <div className="mx-auto flex h-[60px] max-w-[1280px] items-center gap-2 pl-4 pr-2 nav:h-[72px] nav:items-stretch nav:gap-[clamp(16px,3vw,48px)] nav:px-[clamp(16px,2.5vw,32px)]">
          {marca}

          {compra ? (
            <span className="ml-auto flex items-center gap-1.5 pr-2 text-[13px] font-medium opacity-80 nav:gap-2 nav:pr-0 nav:text-[14px]">
              <Icone nome="cadeado" tamanho={16} />
              <span className="nav:hidden">Pagamento seguro</span>
              <span className="hidden nav:inline">Pagamento seguro pelo Mercado Pago</span>
            </span>
          ) : (
            <>
              <nav aria-label="Principal" className="hidden min-w-0 items-stretch gap-[clamp(14px,2.2vw,32px)] nav:flex">
                {nav.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={ativo === item.id ? 'page' : undefined}
                    className="relative flex items-center gap-2 whitespace-nowrap text-[15px] font-medium underline-offset-[6px] hover:underline"
                  >
                    {item.label}
                    {item.palco && emBreve && <EmBreve tema="atual" />}
                    {ativo === item.id && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-red" />}
                  </Link>
                ))}
              </nav>

              {/* computador: entrar / conta / compra */}
              <div className="ml-auto hidden shrink-0 items-center gap-[clamp(12px,2vw,24px)] nav:flex">
                {mostraEntrar && (
                  <Link href="/entrar" data-cta-compra="" className="flex min-h-11 items-center text-[15px] font-medium underline-offset-[6px] hover:underline">
                    Entrar
                  </Link>
                )}
                {logado && !comPacote && (
                  <Link href={MINHA_CONTA} className="flex min-h-11 items-center gap-2 text-[15px] font-medium underline-offset-[6px] hover:underline">
                    <Icone nome="usuario" tamanho={18} />
                    Minha conta
                  </Link>
                )}
                {mostraCTA && (
                  <Botao variante="compra" tamanho="sm" href="/assinar" data-cta-compra="" className="px-5">
                    {TEXTO_COMPRA}
                  </Botao>
                )}
                {comPacote && <BotaoConta />}
              </div>

              {/* celular: botão compacto + menu */}
              <div className="ml-auto flex items-center gap-2 nav:hidden">
                {mostraCTA && (
                  <Botao variante="compra" tamanho="sm" href="/assinar" data-cta-compra="" className="px-3.5 text-[14px]">
                    {TEXTO_COMPRA}
                  </Botao>
                )}
                {logado && !mostraCTA && <BotaoConta className="px-3.5 text-[14px]" />}
                <button
                  ref={botaoMenu}
                  type="button"
                  onClick={() => setAberto((v) => !v)}
                  aria-expanded={aberto}
                  aria-controls="menu-celular"
                  aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control ${VOLTA}`}
                >
                  <Icone nome={aberto ? 'fechar' : 'menu'} tamanho={24} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Menu em tela cheia (celular): 5 links grandes, 3 menores, compra e conta no pé. */}
      {aberto && !compra && (
        <div
          id="menu-celular"
          className={`fixed inset-x-0 bottom-0 top-[61px] z-50 overflow-y-auto nav:hidden ${escuro ? 'bg-ink text-white' : 'bg-white text-ink'}`}
        >
          <nav aria-label="Menu" className="flex min-h-full flex-col px-4 pb-6 pt-2">
            <div className="flex flex-col">
              {nav.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={fechar}
                  aria-current={ativo === item.id ? 'page' : undefined}
                  className={`flex min-h-14 items-center justify-between border-b text-[20px] font-semibold ${LINHA}`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.label}
                    {item.palco && emBreve && <EmBreve tema="atual" />}
                    {ativo === item.id && <span aria-hidden="true" className="h-1.5 w-1.5 bg-red" />}
                  </span>
                  <Icone nome="seta-direita" tamanho={20} traco={1.5} className="opacity-60" />
                </Link>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4">
              {navSecundario.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={fechar}
                  className="flex min-h-11 items-center text-[15px] opacity-80 underline-offset-4 hover:underline"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-3 pt-6">
              {mostraCTA && (
                <>
                  <Botao variante="compra" tamanho="lg" href="/assinar" onClick={fechar} bloco data-cta-compra="">
                    {TEXTO_COMPRA}
                  </Botao>
                  <p className="text-center text-[13px] opacity-80">{LINHA_PRECO}</p>
                </>
              )}
              {!logado && (
                <Link
                  href="/entrar"
                  onClick={fechar}
                  className={`flex h-12 items-center justify-center rounded-control border ${CONTORNO} text-[16px] font-semibold ${VOLTA}`}
                >
                  Entrar
                </Link>
              )}
              {logado && <BotaoConta onClick={fechar} className="h-12 text-[16px]" />}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
