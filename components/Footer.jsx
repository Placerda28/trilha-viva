'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './Logo'
import { EmBreve, Icone } from './ds'
import { EMAIL_SUPORTE, TEXTO_COMPRA } from '@/lib/site'

// Rodapé do redesenho (DESIGN.md, MUDANÇAS §2). Sempre preto, com o disco branco.
// 4 colunas: Pacote 2.000 VS, Acervo, Aprender e Palco (a do Palco muda no
// lançamento). Modo compra (/assinar): uma linha só, sem distração.
//
// `palco` ('em-breve' | 'lancado') e `ano` vêm do servidor (app/layout.js): ler
// process.env ou a data aqui, no navegador, daria um valor diferente do da página.
//
// Não aparece na gestão: o `data-site-chrome` é escondido pelo layout dela.

const COLUNAS = [
  {
    titulo: 'Pacote 2.000 VS',
    links: [
      { href: '/assinar', label: TEXTO_COMPRA, forte: true },
      { href: '/#pacote', label: 'O que vem no pacote' },
      { href: '/vs-gratis', label: 'VS grátis' },
      { href: '/faq#garantia', label: 'Garantia de 7 dias' },
      { href: '/entrar', label: 'Entrar' },
    ],
  },
  {
    titulo: 'Acervo',
    links: [
      { href: '/musicas', label: 'Todas as músicas' },
      { href: '/artistas', label: 'Artistas e ministérios' },
      { href: '/musicas?cat=Adora%C3%A7%C3%A3o', label: 'Adoração' },
      { href: '/musicas?cat=Celebra%C3%A7%C3%A3o', label: 'Celebração' },
      { href: '/musicas?cat=Congregacional', label: 'Congregacionais' },
      { href: '/colecoes/natal', label: 'Natal' },
      { href: '/bpm', label: 'BPM e tom' },
    ],
  },
  {
    titulo: 'Aprender',
    links: [
      { href: '/como-usar', label: 'Como usar multitrack' },
      { href: '/como-usar#reaper', label: 'Multitrack no Reaper' },
      { href: '/como-usar#tablet', label: 'Multitrack no tablet' },
      { href: '/blog', label: 'Blog' },
      { href: '/faq', label: 'Dúvidas frequentes' },
    ],
  },
]

const PALCO_EM_BREVE = [
  { href: '/palco', label: 'O que é o Palco' },
  { href: '/palco#lista-de-espera', label: 'Entrar na lista de espera' },
]
const PALCO_LANCADO = [
  { href: '/palco', label: 'O que é o Palco' },
  { href: '/palco/baixar', label: 'Baixar para Windows' },
  { href: '/palco/ajuda', label: 'Ajuda do Palco' },
  { href: '/palco/novidades', label: 'Novidades' },
]

const LINK = 'flex min-h-11 items-center text-[15px] underline-offset-4 hover:underline'
const LINK_BAIXO = 'flex min-h-11 items-center text-[14px] text-dark-text-2 underline-offset-4 hover:underline'

function Coluna({ titulo, etiqueta, links }) {
  return (
    <div className="flex flex-col">
      <h2 className="mb-1.5 flex min-h-6 items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-dark-text-3">
        {titulo}
        {etiqueta}
      </h2>
      {links.map((l) => (
        <Link key={l.href + l.label} href={l.href} className={`${LINK} ${l.forte ? 'font-semibold' : ''}`}>
          {l.label}
        </Link>
      ))}
    </div>
  )
}

export default function Footer({ palco = 'em-breve', ano = 2026 }) {
  const pathname = usePathname() || '/'
  const compra = pathname === '/assinar' || pathname.startsWith('/assinar/')
  const emBreve = palco !== 'lancado'

  if (compra) {
    return (
      <footer data-site-chrome="" data-tema="escuro" className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-8 gap-y-1 px-6 py-3">
          <div className="flex flex-wrap gap-x-6">
            <a href={`mailto:${EMAIL_SUPORTE}`} className={LINK_BAIXO}>
              Dúvidas na compra: {EMAIL_SUPORTE}
            </a>
            <Link href="/termos" className={LINK_BAIXO}>
              Termos de uso
            </Link>
            <Link href="/privacidade" className={LINK_BAIXO}>
              Privacidade
            </Link>
          </div>
          <span className="py-2 text-[13px] text-dark-text-3">
            © {ano} Trilha Viva — Pix ou cartão, processado pelo Mercado Pago
          </span>
        </div>
      </footer>
    )
  }

  return (
    <footer data-site-chrome="" data-tema="escuro" className="mt-24 bg-ink text-white">
      <div className="mx-auto max-w-[1280px] px-6 pb-7 pt-12">
        <div className="flex flex-wrap gap-x-14 gap-y-10">
          <div className="flex max-w-[340px] flex-[1_1_260px] flex-col gap-4">
            <Link href="/" aria-label="Trilha Viva, página inicial" className="flex min-h-11 self-start items-center">
              <Logo tone="light" />
            </Link>
            <p className="text-[15px] leading-[1.55] text-dark-text-3 [text-wrap:pretty]">
              Multitracks gospel com clique, guia e cada instrumento em um canal separado. Um pagamento, sem
              mensalidade.
            </p>
            <div className="flex flex-col">
              <a
                href="https://www.instagram.com/trilhavivamultitracks/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram da Trilha Viva: @trilhavivamultitracks (abre em nova aba)"
                className="flex min-h-11 items-center gap-2.5 text-[15px] underline-offset-4 hover:underline"
              >
                <Icone nome="instagram" tamanho={18} traco={1.5} />
                @trilhavivamultitracks
              </a>
              <a href={`mailto:${EMAIL_SUPORTE}`} className="flex min-h-11 items-center gap-2.5 text-[15px] underline-offset-4 hover:underline">
                <Icone nome="email" tamanho={18} traco={1.5} />
                {EMAIL_SUPORTE}
              </a>
            </div>
          </div>

          <div className="grid flex-[3_1_520px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-6 gap-y-8">
            {COLUNAS.map((c) => (
              <Coluna key={c.titulo} {...c} />
            ))}
            <Coluna
              titulo="Palco"
              etiqueta={emBreve ? <EmBreve tema="escuro" className="px-[5px] py-0.5" /> : null}
              links={emBreve ? PALCO_EM_BREVE : PALCO_LANCADO}
            />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-dark-line pt-4">
          <div className="flex flex-wrap gap-x-6">
            <Link href="/afiliados" className={LINK_BAIXO}>
              Seja afiliado
            </Link>
            <Link href="/termos" className={LINK_BAIXO}>
              Termos de uso
            </Link>
            <Link href="/privacidade" className={LINK_BAIXO}>
              Privacidade
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-dark-text-3">
            <span>Pix ou cartão, processado pelo Mercado Pago</span>
            <span>© {ano} Trilha Viva — Multitracks Gospel</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
