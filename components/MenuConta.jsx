'use client'

import Link from 'next/link'
import { useState } from 'react'
import { EmBreve, Icone } from './ds'
import { esquecerUsuario } from './usuario'

// Menu da conta (/minha-conta/*, MUDANÇAS §7).
//   Computador (a partir de 1000 px): lista fixa, no lugar da coluna de 260 px.
//   Celular: uma barra "Minha conta · [página atual]" que abre a lista inteira.
//
//   <MenuConta ativo="acervo" palco={palcoEstado()} plano="nenhum" nome="Ana Souza" email="ana@gmail.com" />
//
// `ativo`: inicio | acervo | pedidos | conhecer | baixar | assinatura |
//          computadores | dados | afiliado | ajuda
// `plano`: 'nenhum' (não assina) | 'assinante' (em teste ou assinando, inclusive
//          com pagamento recusado). Só muda o grupo Palco depois do lançamento.
// `palco`: 'em-breve' | 'lancado' (lib/palco.js).
// "Sair" faz POST em /api/conta/sair e manda para /entrar.

export function gruposDaConta({ palco = 'em-breve', plano = 'nenhum' } = {}) {
  const emBreve = palco !== 'lancado'
  const assinante = plano === 'assinante'
  return [
    { itens: [{ id: 'inicio', rotulo: 'Início', href: '/minha-conta', icone: 'casa' }] },
    {
      titulo: 'Pacote 2.000 VS',
      itens: [
        { id: 'acervo', rotulo: 'Minhas VS', href: '/minha-conta/acervo', icone: 'musica' },
        { id: 'pedidos', rotulo: 'Pedidos', href: '/minha-conta/pedidos', icone: 'recibo' },
      ],
    },
    {
      titulo: 'Palco',
      emBreve,
      itens:
        assinante && !emBreve
          ? [
              { id: 'baixar', rotulo: 'Baixar o Palco', href: '/minha-conta/palco', icone: 'baixar' },
              { id: 'assinatura', rotulo: 'Assinatura', href: '/minha-conta/assinatura', icone: 'cartao' },
              { id: 'computadores', rotulo: 'Computadores', href: '/minha-conta/palco#computadores', icone: 'monitor' },
            ]
          : [
              { id: 'conhecer', rotulo: 'Conhecer o Palco', href: '/minha-conta/conhecer-palco', icone: 'palco' },
              { id: 'baixar', rotulo: 'Baixar o Palco', href: '/minha-conta/palco', icone: 'baixar' },
              { id: 'assinatura', rotulo: 'Assinatura', href: '/minha-conta/assinatura', icone: 'cartao' },
            ],
    },
    {
      titulo: 'Conta',
      itens: [
        { id: 'dados', rotulo: 'Meus dados', href: '/minha-conta/dados', icone: 'pessoa' },
        { id: 'afiliado', rotulo: 'Afiliado', href: '/minha-conta/afiliado', icone: 'moeda' },
        { id: 'ajuda', rotulo: 'Ajuda', href: '/minha-conta/ajuda', icone: 'ajuda' },
      ],
    },
  ]
}

const ROTULO = 'text-[12px] font-semibold uppercase tracking-[0.08em] text-text-3'

export default function MenuConta({ ativo = 'inicio', palco = 'em-breve', plano = 'nenhum', nome = '', email = '', className = '' }) {
  const [aberto, setAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const grupos = gruposDaConta({ palco, plano })
  const atual = grupos.flatMap((g) => g.itens).find((i) => i.id === ativo)?.rotulo ?? 'Início'

  async function sair() {
    setSaindo(true)
    try {
      await fetch('/api/conta/sair', { method: 'POST' })
    } catch {
      /* mesmo sem resposta, manda para a entrada */
    }
    esquecerUsuario()
    window.location.href = '/entrar'
  }

  return (
    <nav aria-label="Minha conta" className={`w-full text-ink ${className}`}>
      <div className="border-b border-line bg-white nav:hidden">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="menu-conta-lista"
          className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left hover:bg-surface"
        >
          <span className="flex flex-col gap-px">
            <span className={ROTULO}>Minha conta</span>
            <span className="text-[17px] font-[650]">{atual}</span>
          </span>
          <Icone nome="seta-baixo" tamanho={20} traco={1.5} className={aberto ? 'rotate-180' : ''} />
        </button>
      </div>

      <div
        id="menu-conta-lista"
        className={`${aberto ? 'flex' : 'hidden'} flex-col gap-5 border-b border-line bg-white px-2 pb-4 pt-3 nav:flex nav:border-b-0 nav:p-0`}
      >
        {(nome || email) && (
          <div className="hidden flex-col gap-0.5 px-3 nav:flex">
            {nome && <span className="text-[17px] font-[650]">{nome}</span>}
            {email && <span className="truncate text-[14px] text-text-3">{email}</span>}
          </div>
        )}
        {grupos.map((g, gi) => (
          <div key={g.titulo || gi} className="flex flex-col">
            {g.titulo && (
              <span className={`flex items-center gap-2 px-3 pb-1 ${ROTULO}`}>
                {g.titulo}
                {g.emBreve && <EmBreve className="px-[5px] py-0.5 text-[10px]" />}
              </span>
            )}
            {g.itens.map((i) => {
              const a = i.id === ativo
              return (
                <Link
                  key={i.id}
                  href={i.href}
                  aria-current={a ? 'page' : undefined}
                  onClick={() => setAberto(false)}
                  className={`relative flex min-h-11 items-center gap-3 px-3 text-[15px] hover:bg-surface ${a ? 'bg-surface font-[650]' : 'font-medium'}`}
                >
                  {a && <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-0.5 bg-red" />}
                  <Icone nome={i.icone} tamanho={18} traco={1.5} />
                  <span className="flex-1">{i.rotulo}</span>
                </Link>
              )
            })}
          </div>
        ))}
        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="flex min-h-11 items-center gap-3 border-t border-line px-3 text-left text-[15px] text-text-2 hover:bg-surface hover:text-ink disabled:opacity-[.45]"
        >
          <Icone nome="sair" tamanho={18} traco={1.5} />
          {saindo ? 'Saindo…' : 'Sair'}
        </button>
      </div>
    </nav>
  )
}
