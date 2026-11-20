import { useId } from 'react'
import { cn } from '@/lib/cn'
import { Icone } from './Icone'

// Campo de texto do DESIGN.md: rótulo sempre em cima e visível, altura de 48 px,
// texto de 16 px (o iPhone não dá zoom), borda cinza que fica preta no mouse e
// no foco. Erro: borda e mensagem em vermelho de texto, com ícone.
//
//   <Campo rotulo="E-mail" tipo="email" ajuda="O mesmo da compra." erro={erro}
//          value={v} onChange={...} autoComplete="email" />
//
// `multilinha` troca o <input> por <textarea>. Passa o resto das props para o
// campo (name, value, onChange, required, autoComplete, inputMode...).
export function Campo({
  rotulo,
  ajuda,
  erro,
  tipo = 'text',
  multilinha = false,
  id,
  className,
  campoClassName,
  ...resto
}) {
  const auto = useId()
  const campoId = id || auto
  const ajudaId = ajuda ? `${campoId}-ajuda` : undefined
  const erroId = erro ? `${campoId}-erro` : undefined
  const descreve = [erroId, ajudaId].filter(Boolean).join(' ') || undefined

  const classes = cn(
    'block w-full rounded-control border bg-white px-3.5 text-[16px] text-ink placeholder:text-text-4',
    'transition-colors duration-150 motion-reduce:transition-none',
    erro ? 'border-red-text' : 'border-field-border hover:border-ink',
    'disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-[.45] disabled:hover:border-field-border',
    multilinha ? 'min-h-28 py-3 leading-[1.5]' : 'h-12',
    campoClassName
  )
  const props = {
    id: campoId,
    className: classes,
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': descreve,
    ...resto,
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={campoId} className="text-[15px] font-semibold text-ink">
        {rotulo}
      </label>
      {multilinha ? <textarea {...props} /> : <input type={tipo} {...props} />}
      {ajuda && (
        <p id={ajudaId} className="text-[14px] leading-[1.45] text-text-3">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={erroId} role="alert" className="flex items-start gap-1.5 text-[14px] font-medium leading-[1.45] text-red-text">
          <Icone nome="alerta" tamanho={16} className="mt-[2px]" />
          <span>{erro}</span>
        </p>
      )}
    </div>
  )
}
