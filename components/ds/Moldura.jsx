import { cn } from '@/lib/cn'

// Moldura com traço vermelho (frame-accent do DESIGN.md): cartão principal com
// borda de 1 px preta e um traço vermelho de 56 × 3 px no canto superior
// esquerdo. É o "este é o principal" da tela: um por vista, no máximo.
//
//   <MolduraAccent className="p-6">...</MolduraAccent>
//   <MolduraAccent as="section" traco={48} tema="escuro">...</MolduraAccent>
//
// `tema="escuro"` troca a borda para o cinza da moldura escura e o fundo para
// o preto de painel.
export function MolduraAccent({ as: Tag = 'div', traco = 56, tema = 'claro', className, children, ...resto }) {
  return (
    <Tag
      className={cn(
        'relative border',
        tema === 'escuro' ? 'border-dark-frame bg-ink text-white' : 'border-ink bg-white text-ink',
        className
      )}
      {...resto}
    >
      <span aria-hidden="true" className="absolute -left-px -top-px h-[3px] bg-red" style={{ width: traco }} />
      {children}
    </Tag>
  )
}
