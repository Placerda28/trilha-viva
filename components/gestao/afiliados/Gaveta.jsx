'use client'

import { Dialog } from 'radix-ui'
import Icone from '../Icone'

// Painel de tarefa da gestão. No celular sobe do rodapé; no computador vira
// uma gaveta à direita (`lateral`) ou uma janela no centro. O Radix cuida do
// foco, do Esc e do aria-modal. `travada` impede fechar no meio de um envio.
export default function Gaveta({ aoFechar, titulo, descricao, lateral = false, travada = false, children }) {
  const caixa = lateral
    ? 'md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[520px] md:rounded-none md:border-l md:border-t-0 md:data-[state=open]:slide-in-from-right-full'
    : 'md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[85dvh] md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border'
  const segurar = (e) => travada && e.preventDefault()
  // Sem descrição, o Radix não deve esperar um elemento para o aria-describedby.
  const semDescricao = descricao ? {} : { 'aria-describedby': undefined }
  return (
    <Dialog.Root open onOpenChange={(a) => !a && !travada && aoFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <Dialog.Content
          {...semDescricao}
          onOpenAutoFocus={(e) => {
            // O foco começa no próprio painel, e não no botão de fechar (que ficaria com aro preto).
            e.preventDefault()
            e.currentTarget.focus()
          }}
          onEscapeKeyDown={segurar}
          onInteractOutside={segurar}
          className={
            'fixed inset-x-0 bottom-0 z-[81] flex outline-none max-h-[92dvh] flex-col rounded-t-lg border-t border-line bg-white duration-200 data-[state=open]:animate-in max-md:data-[state=open]:slide-in-from-bottom-full motion-reduce:animate-none ' +
            caixa
          }
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line py-3 pl-4 pr-2 sm:pl-6">
            <div className="min-w-0 pt-1.5">
              <Dialog.Title className="text-[19px] font-bold leading-tight tracking-[-0.01em] text-ink">{titulo}</Dialog.Title>
              {descricao && <Dialog.Description className="mt-1 text-[14.5px] text-ink-muted">{descricao}</Dialog.Description>}
            </div>
            <Dialog.Close
              disabled={travada}
              aria-label="Fechar"
              className="grid h-11 w-11 shrink-0 place-items-center rounded text-ink-muted transition-colors duration-150 hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:opacity-40"
            >
              <Icone nome="x" tamanho={20} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
