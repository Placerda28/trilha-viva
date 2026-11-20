import { cn } from '@/lib/cn'
import { Icone } from './Icone'

// Aviso do DESIGN.md: ícone + frase em negrito + o que fazer. Vermelho só no erro.
//
//   <Aviso variante="erro" titulo="Erro.">O pagamento não foi aprovado. Tente outro cartão ou Pix.</Aviso>
//   <Aviso variante="info" titulo="Atenção.">Você chegou aos 30 downloads de hoje.</Aviso>
//   <Aviso variante="ok">Pronto. Dados salvos.</Aviso>
//
// `acao` é um nó opcional (botão ou link) que fica embaixo do texto.
const VARIANTES = {
  erro: { caixa: 'border-red-text bg-red-tint', icone: 'alerta', corIcone: 'text-red-text', papel: 'alert' },
  info: { caixa: 'border-ink bg-surface', icone: 'relogio', corIcone: 'text-ink', papel: 'status' },
  ok: { caixa: 'border-ink bg-surface', icone: 'check', corIcone: 'text-ink', papel: 'status' },
}

export function Aviso({ variante = 'info', titulo, icone, acao, className, children }) {
  const v = VARIANTES[variante] || VARIANTES.info
  return (
    <div
      role={v.papel}
      className={cn('flex items-start gap-3 border px-4 py-3.5 text-[15px] leading-[1.45] text-ink', v.caixa, className)}
    >
      <Icone nome={icone || v.icone} tamanho={20} traco={variante === 'ok' ? 2 : 1.75} className={cn('mt-px', v.corIcone)} />
      <div className="min-w-0 flex-1">
        <p className={variante === 'ok' && !titulo ? 'font-semibold' : undefined}>
          {titulo && <strong className="font-[650]">{titulo} </strong>}
          {children}
        </p>
        {acao && <div className="mt-2.5">{acao}</div>}
      </div>
    </div>
  )
}
