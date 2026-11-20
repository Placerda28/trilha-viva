import Link from 'next/link'
import { cn } from '@/lib/cn'
import { Icone } from './Icone'

// Botões do DESIGN.md. Cantos de 4 px, alvo de toque de 44 px no mínimo.
//
//   compra     vermelho. É o ÚNICO botão vermelho do site: "Liberar as 2.000 VS".
//   primario   preto. Entrar, Criar senha, Abrir Minhas VS, Baixar, Ativar, Salvar.
//   contorno   branco com borda preta. Ação secundária.
//   noEscuro   transparente com borda cinza, para fundo preto.
//   perigo     branco com borda e texto em vermelho de texto. Cancelar, apagar.
//   link       texto sublinhado, sem caixa.
//
// Estados: mouse em cima, pressionado, foco (global, em globals.css), desativado
// (45% de opacidade) e carregando (gira um ícone, bloqueia o clique e mantém o
// texto para o botão não mudar de largura).
//
// Com `href` vira link (<Link> no site, <a> para http: e mailto:); sem `href`,
// <button type="button"> (passe type="submit" nos formulários).

const BASE =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border font-semibold leading-none transition-colors duration-150 motion-reduce:transition-none'

const VARIANTES = {
  compra: {
    base: 'border-red bg-red text-white',
    vivo: 'hover:border-red-hover hover:bg-red-hover active:border-red-pressed active:bg-red-pressed',
  },
  primario: {
    base: 'border-ink bg-ink text-white',
    vivo: 'hover:border-ink-hover hover:bg-ink-hover active:border-ink-pressed active:bg-ink-pressed',
  },
  contorno: {
    base: 'border-ink bg-white text-ink',
    vivo: 'hover:bg-surface active:bg-surface-pressed',
  },
  noEscuro: {
    base: 'border-field-border bg-transparent text-white',
    vivo: 'hover:border-white hover:bg-dark-hover active:bg-dark-pressed',
  },
  perigo: {
    base: 'border-red-text bg-white text-red-text',
    vivo: 'hover:bg-red-tint active:bg-red-tint-pressed',
  },
  link: {
    base: 'border-transparent bg-transparent px-0 text-current underline decoration-1 underline-offset-4',
    vivo: 'hover:decoration-2',
  },
}

const TAMANHOS = {
  sm: 'min-h-11 px-[18px] text-[15px]',
  md: 'min-h-12 px-5 text-[15px]',
  lg: 'min-h-[52px] px-6 text-[16px]',
  xl: 'min-h-14 px-8 text-[17px]',
}

const externo = (href) => /^(https?:|mailto:|tel:)/.test(href)

export function classesDoBotao({ variante = 'primario', tamanho, bloco = false, ativo = true, className } = {}) {
  const v = VARIANTES[variante] || VARIANTES.primario
  const t = tamanho || (variante === 'compra' ? 'lg' : 'md')
  return cn(
    BASE,
    v.base,
    ativo && v.vivo,
    variante === 'link' ? 'min-h-11 text-[15px]' : TAMANHOS[t],
    bloco && 'w-full',
    !ativo && 'cursor-not-allowed opacity-[.45]',
    className
  )
}

export function Botao({
  variante = 'primario',
  tamanho,
  bloco = false,
  href,
  carregando = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...resto
}) {
  const ativo = !disabled && !carregando
  const classes = classesDoBotao({ variante, tamanho, bloco, ativo, className })
  const conteudo = (
    <>
      {carregando && <Icone nome="carregando" tamanho={18} className="animate-spin motion-reduce:animate-none" />}
      {children}
    </>
  )

  if (href && ativo) {
    return externo(href) ? (
      <a href={href} className={classes} {...resto}>
        {conteudo}
      </a>
    ) : (
      <Link href={href} className={classes} {...resto}>
        {conteudo}
      </Link>
    )
  }
  if (href) {
    // Link desativado: não navega nem recebe foco.
    return (
      <span role="link" aria-disabled="true" className={classes} {...resto}>
        {conteudo}
      </span>
    )
  }
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={classes}
      {...resto}
    >
      {conteudo}
    </button>
  )
}

// O botão de compra do site, com o texto que o DESIGN.md manda. Use este em vez
// de escrever "Comprar", "Quero meu acesso" etc. `children` só para o caso de
// carregando ("Abrindo o pagamento…").
export function BotaoCompra({ href = '/assinar', tamanho = 'lg', children = 'Liberar as 2.000 VS', ...resto }) {
  return (
    <Botao variante="compra" href={href} tamanho={tamanho} {...resto}>
      {children}
    </Botao>
  )
}
