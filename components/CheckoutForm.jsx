'use client'

import { useState } from 'react'
import { priceBRL, site } from '@/lib/site'

export default function CheckoutForm() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || 'Não foi possível abrir o pagamento. Tente novamente.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Falha de conexão. Verifique sua internet e tente de novo.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="nome" className="block text-[13px] font-semibold text-ink">
          Seu nome
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          autoComplete="name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como devemos te chamar"
          className="mt-2 w-full rounded border border-line bg-white px-4 py-3.5 text-[15.5px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-[13px] font-semibold text-ink">
          E-mail para receber o acesso <span aria-hidden="true" className="text-ink-muted">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          aria-describedby="email-help"
          className="mt-2 w-full rounded border border-line bg-white px-4 py-3.5 text-[15.5px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        />
        <p id="email-help" className="mt-2 text-[12.5px] text-ink-muted">
          É para esse endereço que enviamos o link do acervo. Confira antes de continuar.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded border-l-4 border-signal bg-signal-wash px-4 py-3 text-[14px] font-medium text-ink">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-signal w-full disabled:opacity-60">
        {loading ? 'Abrindo pagamento seguro…' : `Pagar ${priceBRL(site.price)} e liberar acesso`}
      </button>

      <p className="text-center text-[12.5px] leading-relaxed text-ink-muted">
        Você será levado ao ambiente seguro da Stripe para pagar com{' '}
        <strong className="font-semibold text-ink-muted">Pix</strong> ou{' '}
        <strong className="font-semibold text-ink-muted">cartão</strong>. Não guardamos dados de
        pagamento.
      </p>
    </form>
  )
}
