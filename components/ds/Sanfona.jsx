import { cn } from '@/lib/cn'
import { Icone } from './Icone'

// Sanfona com <details>: funciona sem JavaScript, abre e fecha pelo teclado e
// o Google lê o conteúdo mesmo fechado. Linha de 56 px no mínimo (alvo de toque).
//
//   <Sanfona titulo="Posso usar no celular?">Pode, …</Sanfona>
//   <ListaSanfona itens={[{ id: 'garantia', titulo: '…', conteudo: '…' }]} />
//
// `id` vira âncora (/faq#garantia) e abre a sanfona sozinho quando o endereço
// aponta para ela (o navegador abre <details> alvo de âncora).
export function Sanfona({ titulo, children, aberto = false, id, className }) {
  return (
    <details id={id} open={aberto || undefined} className={cn('group border-b border-line', className)}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-[650] leading-snug text-ink marker:hidden hover:bg-surface [&::-webkit-details-marker]:hidden">
        <span>{titulo}</span>
        <Icone nome="seta-baixo" tamanho={20} traco={1.5} className="transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="max-w-[68ch] pb-5 text-[16px] leading-[1.6] text-text-2">{children}</div>
    </details>
  )
}

export function ListaSanfona({ itens, className }) {
  return (
    <div className={cn('border-t border-line', className)}>
      {itens.map((item) => (
        <Sanfona key={item.id || item.titulo} id={item.id} titulo={item.titulo} aberto={item.aberto}>
          {item.conteudo}
        </Sanfona>
      ))}
    </div>
  )
}
