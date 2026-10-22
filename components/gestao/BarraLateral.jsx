'use client'

import Link from 'next/link'
import { Tooltip } from 'radix-ui'
import { LogoMark } from '../Logo'
import Icone from './Icone'

// O mapa da gestão (plano 2.1). Os links levam prefetch={false}: são cerca de
// 14 páginas dinâmicas, e com prefetch cada visita à gestão dispararia 14
// requisições pelo middleware e pelo D1.
//
// `contador` é a chave do objeto de /api/gestao/avisos que vira o número
// vermelho; sem número (ou zero), o quadradinho some.
export const MENU = [
  {
    grupo: 'Visão geral',
    itens: [{ href: '/gestao', rotulo: 'Painel', icone: 'painel' }],
  },
  {
    grupo: 'Vendas',
    itens: [
      { href: '/gestao/vendas', rotulo: 'Vendas', icone: 'vendas' },
      { href: '/gestao/clientes', rotulo: 'Clientes', icone: 'clientes' },
      { href: '/gestao/cupons', rotulo: 'Cupons', icone: 'cupons' },
    ],
  },
  {
    grupo: 'Recuperação',
    itens: [
      { href: '/gestao/recuperacao', rotulo: 'Carrinhos', icone: 'carrinhos' },
      { href: '/gestao/recuperacao/whatsapp', rotulo: 'WhatsApp', icone: 'whatsapp', contador: 'whatsapp_esperando' },
    ],
  },
  {
    grupo: 'Marketing',
    itens: [
      { href: '/gestao/campanhas', rotulo: 'Campanhas', icone: 'campanhas' },
      { href: '/gestao/leads', rotulo: 'Leads VS grátis', icone: 'leads' },
    ],
  },
  {
    grupo: 'Acervo',
    itens: [{ href: '/gestao/downloads', rotulo: 'Downloads', icone: 'downloads' }],
  },
  {
    grupo: 'Sistema',
    itens: [
      { href: '/gestao/registro', rotulo: 'Registro', icone: 'registro' },
      { href: '/gestao/testes', rotulo: 'Contatos de teste', icone: 'testes' },
      { href: '/gestao/equipe', rotulo: 'Equipe', icone: 'equipe', soMaster: true },
    ],
  },
]

// Mesmo caminho do SairBotao da conta: a saída é um POST, não um link.
export async function sairDaConta() {
  try {
    await fetch('/api/conta/sair', { method: 'POST' })
  } catch {
    /* mesmo sem resposta, manda para a entrada */
  }
  window.location.href = '/entrar'
}

export const PAPEL = { master: 'Administrador master', membro: 'Equipe de gestão' }

// Esconder o item do membro é conforto, não segurança: a rota da Equipe recusa
// quem não é master por conta própria.
export function menuDoPapel(papel) {
  return MENU.map((g) => ({ ...g, itens: g.itens.filter((i) => !i.soMaster || papel === 'master') })).filter(
    (g) => g.itens.length
  )
}

// Item ativo = o de endereço mais longo que abre o caminho atual. Assim
// /gestao/recuperacao/whatsapp acende WhatsApp, e não Carrinhos.
export function achaAtivo(menu, caminho) {
  let achado = null
  for (const g of menu) {
    for (const i of g.itens) {
      const bate = i.href === '/gestao' ? caminho === '/gestao' : caminho === i.href || caminho.startsWith(i.href + '/')
      if (bate && (!achado || i.href.length > achado.item.href.length)) achado = { grupo: g.grupo, item: i }
    }
  }
  return achado
}

function iniciais(email) {
  const base = (email || '?').split('@')[0].replace(/[^a-zA-Z]+/g, ' ').trim()
  const partes = base.split(' ').filter(Boolean)
  const duas = partes.length > 1 ? partes[0][0] + partes[1][0] : base.slice(0, 2)
  return (duas || '?').toUpperCase()
}

export function Avatar({ email, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={'grid shrink-0 place-items-center rounded bg-ink-soft font-bold text-white ' + className}
    >
      {iniciais(email)}
    </span>
  )
}

function Contador({ n, recolhida, grande }) {
  if (!n) return null
  // Barra estreita: o número vira um quadradinho no canto do ícone.
  const lugar = grande
    ? 'ml-auto'
    : recolhida
      ? 'absolute right-1 top-1'
      : 'absolute right-1 top-1 lg:static lg:ml-auto'
  return (
    <span
      className={
        'figs grid h-[18px] min-w-[18px] place-items-center rounded-sm bg-signal px-1 text-[11px] font-bold leading-none text-white ' +
        lugar
      }
    >
      <span className="sr-only">{n === 1 ? '1 conversa esperando resposta' : n + ' conversas esperando resposta'}</span>
      <span aria-hidden="true">{n}</span>
    </span>
  )
}

function Item({ item, ativo, n, recolhida, grande, onEscolher }) {
  const rotuloCls = grande ? '' : recolhida ? 'hidden' : 'hidden lg:inline'
  const alinha = grande ? 'px-3' : recolhida ? 'justify-center' : 'justify-center lg:justify-start lg:px-3'
  const link = (
    <Link
      href={item.href}
      prefetch={false}
      aria-current={ativo ? 'page' : undefined}
      onClick={onEscolher}
      className={
        'relative flex items-center gap-3 rounded-sm text-[14.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ' +
        (grande ? 'h-12 ' : 'h-9 ') +
        alinha +
        ' ' +
        (ativo
          ? 'bg-ink-soft text-white before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-signal'
          : 'text-white/70 hover:text-white')
      }
    >
      <Icone nome={item.icone} tamanho={18} className="shrink-0" />
      <span className={rotuloCls}>{item.rotulo}</span>
      <Contador n={n} recolhida={recolhida} grande={grande} />
    </Link>
  )
  if (grande) return link
  return (
    <Tooltip.Root delayDuration={150}>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className={
            'z-[60] rounded-sm bg-white px-2.5 py-1.5 text-[13px] font-semibold text-ink ' + (recolhida ? '' : 'lg:hidden')
          }
        >
          {item.rotulo}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

// A lista de grupos e itens. É a mesma na barra lateral e na gaveta do celular.
export function ListaMenu({ menu, ativo, avisos, recolhida = false, grande = false, onEscolher }) {
  return (
    <nav aria-label="Gestão" className="flex flex-col">
      {menu.map((g, gi) => (
        <div key={g.grupo} className={gi ? (grande ? 'mt-6' : 'mt-4') : ''}>
          {grande ? (
            <p className="px-3 pb-1.5 text-[12.5px] font-semibold text-ink-faint">{g.grupo}</p>
          ) : (
            <>
              <p className={'px-3 pb-1.5 text-[12.5px] font-semibold text-ink-faint ' + (recolhida ? 'hidden' : 'hidden lg:block')}>
                {g.grupo}
              </p>
              {gi > 0 && (
                <div
                  aria-hidden="true"
                  className={'-mt-2 mb-2 mx-3 h-px bg-white/10 ' + (recolhida ? '' : 'lg:hidden')}
                />
              )}
            </>
          )}
          <ul className="flex flex-col gap-0.5">
            {g.itens.map((i) => (
              <li key={i.href}>
                <Item
                  item={i}
                  ativo={ativo === i.href}
                  n={i.contador && avisos ? avisos[i.contador] : 0}
                  recolhida={recolhida}
                  grande={grande}
                  onEscolher={onEscolher}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

// Quem está logado, no pé da barra. `grande` é a versão da gaveta (alvos de 44 px).
export function Conta({ email, papel, recolhida = false, grande = false, onSair = sairDaConta }) {
  const link = 'flex items-center rounded-sm text-[14px] text-white/70 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 '
  const alvo = grande ? 'h-11 ' : 'h-8 '
  return (
    <div className="border-t border-white/10 p-3">
      <div className={'flex items-center gap-3 ' + (grande ? '' : recolhida ? 'justify-center' : 'justify-center lg:justify-start')} title={email}>
        <Avatar email={email} className="h-9 w-9 text-[13px]" />
        <div className={'min-w-0 ' + (grande ? '' : recolhida ? 'hidden' : 'hidden lg:block')}>
          <p className="truncate text-[13.5px] font-medium text-white">{email}</p>
          <p className="text-[12.5px] text-ink-faint">{PAPEL[papel] || papel}</p>
        </div>
      </div>
      <div className={(grande ? 'mt-1 ' : 'mt-1 ') + (grande ? 'flex gap-6' : recolhida ? 'hidden' : 'hidden gap-4 lg:flex')}>
        <a href="/acervo" className={link + alvo + 'px-0'}>
          Ir para o acervo
        </a>
        <button type="button" onClick={onSair} className={link + alvo + 'px-0 text-left'}>
          Sair
        </button>
      </div>
    </div>
  )
}

// A barra lateral do computador. Na faixa de 768 a 1023 px ela já nasce
// recolhida (64 px) só por CSS; de 1024 px em diante abre em 248 px, a menos
// que a pessoa tenha recolhido (`recolhida`, guardado no navegador pela Casca).
export default function BarraLateral({ menu, ativo, avisos, papel, email, recolhida = false, onSair, onEscolher }) {
  return (
    <aside
      className={
        'hidden shrink-0 bg-ink text-white transition-[width] duration-200 motion-reduce:transition-none md:block ' +
        (recolhida ? 'w-16' : 'w-16 lg:w-[248px]')
      }
    >
      <div className="sticky top-0 flex h-dvh flex-col">
        <div
          className={
            'flex h-[60px] shrink-0 items-center gap-3 border-b border-white/10 px-3 ' +
            (recolhida ? 'justify-center' : 'justify-center lg:justify-start lg:px-4')
          }
        >
          <LogoMark size={28} tone="light" />
          <div className={'min-w-0 leading-tight ' + (recolhida ? 'hidden' : 'hidden lg:block')}>
            <p className="text-[15px] font-bold tracking-[-0.01em]">Trilha Viva</p>
            <p className="text-[12.5px] text-ink-faint">Gestão</p>
          </div>
        </div>

        <Tooltip.Provider>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
            <ListaMenu menu={menu} ativo={ativo} avisos={avisos} recolhida={recolhida} onEscolher={onEscolher} />
          </div>
        </Tooltip.Provider>

        <Conta email={email} papel={papel} recolhida={recolhida} onSair={onSair} />
      </div>
    </aside>
  )
}
