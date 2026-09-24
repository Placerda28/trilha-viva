'use client'

import { useId, useState } from 'react'
import { priceBRL, site } from '@/lib/site'
import { rastrear } from '@/components/MetaPixel'

// Formulario que abre o pagamento: manda nome e e-mail para /api/checkout e
// leva a pessoa para a URL que volta (o Mercado Pago). A logica do envio e a
// mesma em todo lugar; as opcoes so mudam a aparencia:
//   tom="escuro"   para dentro do card preto de /assinar (botao .btn-glow)
//   rotulo         texto do botao
//   pedirNome      o nome e opcional na API; o card do topo pede so o e-mail
// Os ids dos campos vem do useId, porque /assinar tem dois cards de preco
// (topo e fim) e dois campos com o mesmo id quebram o rotulo dos leitores de
// tela.
export default function CheckoutForm({ tom = 'claro', rotulo, pedirNome = true }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const id = useId()
  const escuro = tom === 'escuro'

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Mesmo id no Pixel e no servidor: a Meta conta um evento só.
    const eventoId = crypto.randomUUID()
    rastrear('InitiateCheckout', { value: site.price, currency: site.currency }, eventoId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // O cupom chega pelo endereço (/assinar?cupom=CODIGO). Não há campo
        // visível: por enquanto o único cupom é o de teste, de uso único.
        body: JSON.stringify({
          nome,
          email,
          eventoId,
          cupom: new URLSearchParams(window.location.search).get('cupom') || '',
        }),
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

  const rotuloCls = `block text-[13px] font-semibold ${escuro ? 'text-white' : 'text-ink'}`
  const campoCls = escuro
    ? 'relative mt-2 w-full rounded border border-white/25 bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-ink-muted focus:border-signal-lite focus:outline-none'
    : 'mt-2 w-full rounded border border-line bg-white px-4 py-3.5 text-[15.5px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none'
  const textoFraco = escuro ? 'text-white/70' : 'text-ink-muted'

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {pedirNome && (
        <div>
          <label htmlFor={`${id}-nome`} className={rotuloCls}>
            Seu nome
          </label>
          <input
            id={`${id}-nome`}
            name="nome"
            type="text"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como devemos te chamar"
            className={campoCls}
          />
        </div>
      )}

      <div>
        <label htmlFor={`${id}-email`} className={rotuloCls}>
          E-mail para receber o acesso <span aria-hidden="true" className={textoFraco}>*</span>
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          aria-describedby={`${id}-ajuda`}
          className={campoCls}
        />
        {!escuro && (
          <p id={`${id}-ajuda`} className="mt-2 text-[12.5px] text-ink-muted">
            É para esse endereço que enviamos o link do acervo. Confira antes de continuar.
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-signal/30 bg-signal-wash px-4 py-3 text-[14px] font-medium text-ink"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`${escuro ? 'btn-glow py-[18px] text-[16px]' : 'btn-signal'} w-full disabled:opacity-60`}
      >
        {loading ? 'Abrindo pagamento seguro…' : rotulo || `Pagar ${priceBRL(site.price)} e liberar acesso`}
      </button>

      {escuro ? (
        <p id={`${id}-ajuda`} className="text-center text-[12.5px] leading-relaxed text-white/70">
          O link do acervo vai para esse e-mail. O pagamento é feito no ambiente do Mercado Pago.
        </p>
      ) : (
        <p className="text-center text-[12.5px] leading-relaxed text-ink-muted">
          Você será levado ao ambiente seguro do Mercado Pago para pagar com{' '}
          <strong className="font-semibold text-ink-muted">Pix ou cartão, à vista ou parcelado</strong>.
          Não guardamos dados de pagamento.
        </p>
      )}
    </form>
  )
}
