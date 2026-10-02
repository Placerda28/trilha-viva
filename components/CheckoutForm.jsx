'use client'

import { useEffect, useId, useState } from 'react'
import { priceBRL, site } from '@/lib/site'
import { rastrear } from '@/components/MetaPixel'

// Formulario que abre o pagamento: manda nome, e-mail e WhatsApp para /api/checkout e
// leva a pessoa para a URL que volta (o Mercado Pago). A logica do envio e a
// mesma em todo lugar; as opcoes so mudam a aparencia:
//   tom="escuro"   para dentro do card preto de /assinar (botao .btn-glow)
//   rotulo         texto do botao
// Nome e e-mail sao obrigatorios (a API recusa sem eles). O WhatsApp e
// opcional: em branco ou invalido, a compra segue igual (vai vazio) e so
// aparece um aviso discreto. Ele serve para o lembrete de compra. Quem chega pelo
// e-mail de lembrete traz ?r=<codigo do carrinho>: o formulario busca nome e
// e-mail em /api/carrinho e preenche sozinho. O e-mail nunca vai no endereco
// porque o Pixel da Meta manda o endereco da pagina para a Meta.
// Os ids dos campos vem do useId, porque /assinar tem dois cards de preco
// (topo e fim) e dois campos com o mesmo id quebram o rotulo dos leitores de
// tela.
// So os digitos, sem o 55 do Brasil se a pessoa digitou. Valido = DDD + numero
// (10 ou 11 digitos). O servidor confere de novo do mesmo jeito.
function digitosCelular(valor) {
  let d = String(valor || '').replace(/[^0-9]/g, '')
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  return d
}

// Mascara enquanto digita: (11) 98765-4321. So para ler melhor; o que vale e
// digitosCelular.
function celularValido(digitos) {
  return /^[1-9][0-9]{9,10}$/.test(digitos)
}

function mascaraCelular(valor) {
  const d = digitosCelular(valor).slice(0, 11)
  if (d.length <= 2) return d.length ? '(' + d : ''
  if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2)
  if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6)
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7)
}

export default function CheckoutForm({ tom = 'claro', rotulo }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [utm, setUtm] = useState(null)
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
    const busca = new URLSearchParams(window.location.search)
    const doEndereco = busca.get('cupom')
    if (doEndereco) {
      setAbrirCupom(true)
      setCupom(doEndereco)
      aplicarCupom(doEndereco)
    }

    // A origem da visita (ex.: o e-mail de lembrete) vai junto no checkout.
    const source = busca.get('utm_source')
    const medium = busca.get('utm_medium')
    const campaign = busca.get('utm_campaign')
    if (source || medium || campaign) setUtm({ source, medium, campaign })

    // Veio do lembrete: preenche o que a pessoa já tinha digitado. Só completa
    // campo vazio, para não apagar o que ela começou a escrever.
    const carrinho = busca.get('r')
    if (carrinho) {
      fetch('/api/carrinho?r=' + encodeURIComponent(carrinho))
        .then((res) => (res.ok ? res.json() : null))
        .then((dados) => {
          if (!dados?.ok) return
          if (dados.nome) setNome((atual) => atual || dados.nome)
          if (dados.email) setEmail((atual) => atual || dados.email)
          if (dados.telefone) setTelefone((atual) => atual || mascaraCelular(dados.telefone))
        })
        .catch(() => {})
    }
  }, [])

  const precoFinal = aplicado ? aplicado.preco : site.price

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!nome.trim()) {
      setError('Informe seu nome.')
      return
    }
    // WhatsApp invalido nao trava a compra: vai vazio.
    const digitos = digitosCelular(telefone)
    const celular = celularValido(digitos) ? digitos : ''
    setLoading(true)
    // Mesmo id no Pixel e no servidor: a Meta conta um evento só.
    const eventoId = crypto.randomUUID()
    rastrear('InitiateCheckout', { value: precoFinal, currency: site.currency }, eventoId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, telefone: celular, eventoId, cupom: aplicado ? aplicado.cupom : '', utm }),
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
  // Aviso discreto só quando a pessoa digitou algo que não fecha um número.
  const celularIncompleto = telefone.trim() !== '' && !celularValido(digitosCelular(telefone))

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

      <div>
        <label htmlFor={`${id}-nome`} className={rotuloCls}>
          Seu nome <span aria-hidden="true" className={textoFraco}>*</span>
        </label>
        <input
          id={`${id}-nome`}
          name="nome"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como devemos te chamar"
          className={campoCls}
        />
      </div>

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

      <div>
        <label htmlFor={`${id}-celular`} className={rotuloCls}>
          WhatsApp <span className={`font-normal ${textoFraco}`}>(opcional)</span>
        </label>
        <input
          id={`${id}-celular`}
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={16}
          value={telefone}
          onChange={(e) => setTelefone(mascaraCelular(e.target.value))}
          placeholder="(27) 99999-9999"
          aria-describedby={celularIncompleto ? `${id}-celular-aviso` : undefined}
          className={campoCls}
        />
        {celularIncompleto && (
          <p id={`${id}-celular-aviso`} className={`mt-1.5 text-[12.5px] ${textoFraco}`}>
            Confira o número com DDD. Se ficar assim, seguimos sem o WhatsApp.
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

      <p className={`text-center text-[12px] leading-relaxed ${textoFraco}`}>
        Usamos seu e-mail e WhatsApp para enviar o acesso e, se a compra não for concluída, um lembrete.
        Você pode cancelar a qualquer momento.
      </p>

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
