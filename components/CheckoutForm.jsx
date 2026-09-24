'use client'

import { useEffect, useId, useState } from 'react'
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

  // Cupom: fica escondido atrás de "Tenho um cupom" para não distrair quem não
  // tem. Aplicar confere no servidor (/api/cupom) e mostra o preço novo; o
  // /api/checkout confere de novo na hora de cobrar, então o valor mostrado
  // aqui nunca é o que decide.
  const [abrirCupom, setAbrirCupom] = useState(false)
  const [cupom, setCupom] = useState('')
  const [aplicado, setAplicado] = useState(null) // { cupom, preco, de }
  const [checando, setChecando] = useState(false)
  const [erroCupom, setErroCupom] = useState('')

  async function aplicarCupom(codigo) {
    const limpo = String(codigo || '').trim()
    if (!limpo) return
    setErroCupom('')
    setChecando(true)
    try {
      const res = await fetch('/api/cupom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cupom: limpo }),
      })
      const dados = await res.json().catch(() => ({}))
      if (!res.ok || !dados.ok) {
        setAplicado(null)
        setErroCupom(dados.erro || 'Não consegui conferir o cupom agora.')
      } else {
        setAplicado(dados)
      }
    } catch {
      setErroCupom('Falha de conexão ao conferir o cupom.')
    }
    setChecando(false)
  }

  // Quem chega por /assinar?cupom=CODIGO já vê o cupom aplicado.
  useEffect(() => {
    const doEndereco = new URLSearchParams(window.location.search).get('cupom')
    if (doEndereco) {
      setAbrirCupom(true)
      setCupom(doEndereco)
      aplicarCupom(doEndereco)
    }
  }, [])

  const precoFinal = aplicado ? aplicado.preco : site.price

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Mesmo id no Pixel e no servidor: a Meta conta um evento só.
    const eventoId = crypto.randomUUID()
    rastrear('InitiateCheckout', { value: precoFinal, currency: site.currency }, eventoId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, eventoId, cupom: aplicado ? aplicado.cupom : '' }),
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
      <div>
        {!abrirCupom ? (
          <button
            type="button"
            onClick={() => setAbrirCupom(true)}
            className={`text-[13.5px] font-semibold underline underline-offset-4 ${escuro ? 'text-white/80 hover:text-white' : 'text-ink-muted hover:text-ink'}`}
          >
            Tenho um cupom
          </button>
        ) : aplicado ? (
          <div
            className={`flex items-center justify-between gap-3 rounded border px-4 py-3 text-[14px] ${escuro ? 'border-white/25 text-white' : 'border-line text-ink'}`}
          >
            <span>
              Cupom <strong className="font-semibold">{aplicado.cupom}</strong> aplicado:{' '}
              <span className="line-through opacity-60">{priceBRL(aplicado.de)}</span>{' '}
              <strong className="font-semibold">{priceBRL(aplicado.preco)}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setAplicado(null)
                setCupom('')
              }}
              className="shrink-0 text-[13px] font-semibold underline underline-offset-4 opacity-80 hover:opacity-100"
            >
              Remover
            </button>
          </div>
        ) : (
          <>
            <label htmlFor={`${id}-cupom`} className={rotuloCls}>
              Cupom de desconto
            </label>
            <div className="flex gap-2">
              <input
                id={`${id}-cupom`}
                name="cupom"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                value={cupom}
                onChange={(e) => setCupom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    aplicarCupom(cupom)
                  }
                }}
                placeholder="Digite o código"
                className={`${campoCls} uppercase`}
              />
              <button
                type="button"
                onClick={() => aplicarCupom(cupom)}
                disabled={checando || !cupom.trim()}
                className={`mt-2 shrink-0 rounded border px-4 py-3.5 text-[14px] font-semibold disabled:opacity-50 ${escuro ? 'border-white/40 text-white hover:bg-white/10' : 'border-ink text-ink hover:bg-mist'}`}
              >
                {checando ? 'Conferindo…' : 'Aplicar'}
              </button>
            </div>
            {erroCupom && (
              <p role="alert" className={`mt-2 text-[13px] font-medium ${escuro ? 'text-signal-lite' : 'text-signal-deep'}`}>
                {erroCupom}
              </p>
            )}
          </>
        )}
      </div>

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
        {loading ? 'Abrindo pagamento seguro…' : aplicado ? `Pagar ${priceBRL(precoFinal)} e liberar acesso` : rotulo || `Pagar ${priceBRL(site.price)} e liberar acesso`}
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
