'use client'

import { useState } from 'react'
import { Dialog } from 'radix-ui'

// Janela de confirmação para ação que grava ou que entrega dado sensível.
// `aoConfirmar` devolve um texto de erro (a janela fica aberta e mostra) ou
// '' quando deu certo (a janela fecha). Botões com 44 px de altura; Esc e o
// clique fora cancelam, e nada acontece enquanto a ação está em andamento.
export default function Confirmar({ aberto, aoMudar, titulo, texto, rotulo, aoConfirmar }) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  const fechar = (v) => {
    if (ocupado) return
    if (!v) setErro('')
    aoMudar(v)
  }
  const confirmar = async () => {
    setOcupado(true)
    setErro('')
    const falha = await aoConfirmar()
    setOcupado(false)
    if (falha) setErro(falha)
    else aoMudar(false)
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={fechar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/60 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <Dialog.Content
          aria-describedby="confirmar-texto"
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-md border border-line bg-white p-5 duration-150 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          <Dialog.Title className="text-[17px] font-bold tracking-[-0.01em] text-ink">{titulo}</Dialog.Title>
          <Dialog.Description id="confirmar-texto" className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
            {texto}
          </Dialog.Description>
          <p role="alert" className="mt-3 min-h-[20px] text-[13.5px] text-signal-deep">
            {erro}
          </p>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Dialog.Close disabled={ocupado} className="btn-quiet h-11 !px-4 !py-0 !text-[14px] disabled:opacity-50">
              Cancelar
            </Dialog.Close>
            <button type="button" onClick={confirmar} disabled={ocupado} className="btn-ink h-11 !px-5 !py-0 !text-[14px] disabled:opacity-60">
              {ocupado ? 'Aguarde…' : rotulo}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
