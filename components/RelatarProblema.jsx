'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const campo =
  'mt-2 w-full rounded border border-line bg-white px-4 py-3.5 text-[15.5px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none'

export default function RelatarProblema({ nomeInicial = '', emailInicial = '' }) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState(nomeInicial)
  const [email, setEmail] = useState(emailInicial)
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)

  function fechar(v) {
    setOpen(v)
    if (!v) {
      // Reabrir depois de um envio bem-sucedido deve mostrar um formulário
      // limpo, não o aviso de sucesso anterior.
      setTimeout(() => {
        setEnviado(false)
        setErro('')
        setDescricao('')
      }, 200)
    }
  }

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const res = await fetch('/api/conta/relatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, descricao }),
      })
      const dados = await res.json().catch(() => ({}))
      if (!res.ok || !dados.ok) {
        setErro(dados.erro || 'Não consegui enviar agora. Tente de novo em instantes.')
        setEnviando(false)
        return
      }
      setEnviado(true)
      setEnviando(false)
    } catch {
      setErro('Falha de conexão. Confira sua internet e tente de novo.')
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Relatar um problema"
        title="Relatar um problema"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-colors hover:border-signal-deep hover:text-signal-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="7.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 5.4v4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="12.3" r="0.95" fill="currentColor" />
        </svg>
      </button>

      <DialogContent>
        {enviado ? (
          <>
            <DialogHeader>
              <DialogTitle>Relato enviado</DialogTitle>
              <DialogDescription>
                Recebemos o que você descreveu e vamos responder no e-mail informado. Obrigado por
                avisar.
              </DialogDescription>
            </DialogHeader>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Relatar um problema</DialogTitle>
              <DialogDescription>
                Conte o que aconteceu. A mensagem vai direto para o suporte, e respondemos no e-mail
                que você informar aqui.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={enviar} className="space-y-4" noValidate>
              <div>
                <label htmlFor="relatar-nome" className="block text-[13px] font-semibold text-ink">
                  Seu nome
                </label>
                <input
                  id="relatar-nome"
                  name="nome"
                  type="text"
                  autoComplete="name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como devemos te chamar"
                  className={campo}
                />
              </div>

              <div>
                <label htmlFor="relatar-email" className="block text-[13px] font-semibold text-ink">
                  E-mail para resposta <span aria-hidden="true" className="text-ink-muted">*</span>
                </label>
                <input
                  id="relatar-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className={campo}
                />
              </div>

              <div>
                <label
                  htmlFor="relatar-descricao"
                  className="block text-[13px] font-semibold text-ink"
                >
                  Descrição do ocorrido <span aria-hidden="true" className="text-ink-muted">*</span>
                </label>
                <textarea
                  id="relatar-descricao"
                  name="descricao"
                  required
                  minLength={10}
                  rows={4}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="O que você esperava que acontecesse, e o que aconteceu de fato"
                  className={campo + ' resize-none'}
                />
              </div>

              {erro && (
                <p
                  role="alert"
                  className="rounded border border-signal/30 bg-signal-wash px-4 py-3 text-[14px] font-medium text-ink"
                >
                  {erro}
                </p>
              )}

              <button type="submit" disabled={enviando} className="btn-signal w-full disabled:opacity-60">
                {enviando ? 'Enviando…' : 'Enviar relato'}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
