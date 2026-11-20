import { cn } from '@/lib/cn'

// Etiqueta "EM BREVE": borda de 1 px, canto de 2 px, 11 px em caixa alta.
// `tema` diz em que fundo ela está: 'claro', 'escuro' ou 'atual' (herda a cor do
// texto em volta, como no cabeçalho que troca de tema).
const TEMAS_ETIQUETA = {
  claro: 'border-field-border text-text-2',
  escuro: 'border-dark-border text-dark-text-2',
  atual:
    'border-[color-mix(in_srgb,currentColor_40%,transparent)] text-[color-mix(in_srgb,currentColor_85%,transparent)]',
}

export function EmBreve({ tema = 'claro', className, children = 'Em breve' }) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-tag border px-1.5 py-[3px] text-[11px] font-semibold uppercase leading-[1.2] tracking-[0.06em]',
        TEMAS_ETIQUETA[tema] || TEMAS_ETIQUETA.claro,
        className
      )}
    >
      {children}
    </span>
  )
}

// Contador de pendência: quadrado vermelho de 18 px com canto de 2 px.
// Se o número for 0, não aparece. `rotulo` vira texto para leitor de tela.
export function Contador({ n, rotulo, className }) {
  if (!n) return null
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-tag bg-red px-1 text-[11px] font-bold leading-none text-white tabular-nums',
        className
      )}
    >
      {n}
      {rotulo && <span className="sr-only"> {rotulo}</span>}
    </span>
  )
}

// Quadradinho de 10 px dos cartões de status:
// cheio = ativo, contorno = inativo, vermelho = problema.
// Sempre acompanhado de texto: a cor sozinha não diz o estado.
const ESTADOS_QUADRADO = {
  ativo: 'bg-ink',
  inativo: 'border border-ink',
  problema: 'bg-red',
}

export function Quadrado({ estado = 'ativo', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-2.5 w-2.5 shrink-0', ESTADOS_QUADRADO[estado] || ESTADOS_QUADRADO.ativo, className)}
    />
  )
}
