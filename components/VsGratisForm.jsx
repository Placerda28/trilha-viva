'use client'

import Script from 'next/script'
import { useEffect, useId, useRef, useState } from 'react'
import { celularValido, digitosCelular, mascaraCelular } from '@/lib/checkout-campos'
import { COOKIE_ORIGEM, lerCookie, lerCookieOrigem, origemDoEndereco } from '@/lib/rastreio'

// A UTM do próprio endereço; sem ela, a última visita guardada no cookie (Origem.jsx).
function origemDaVisita() {
  return (
    origemDoEndereco(window.location.search)?.origem ||
    lerCookieOrigem(lerCookie(document.cookie, COOKIE_ORIGEM))?.ultimo ||
    {}
  )
}

// Formulário da VS grátis: nome, e-mail e WhatsApp (os três obrigatórios, decisão
// do Paulo em 21/10) e o consentimento. O servidor (/api/vs-gratis) confere tudo
// de novo, grava o lead e devolve o link do download, que aparece na hora.
// Anti-robô: Cloudflare Turnstile. Sem a chave pública no build, só o next dev
// usa a chave de teste oficial (sempre passa); em produção o servidor recusa.
const CHAVE_TESTE = '1x00000000000000000000AA'
const CHAVE =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (process.env.NODE_ENV === 'production' ? '' : CHAVE_TESTE)

export default function VsGratisForm() {
  const id = useId()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [aceite, setAceite] = useState(false)
  const [token, setToken] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [pronto, setPronto] = useState(null) // { nome, link, email }
  const caixa = useRef(null)
  const widget = useRef(null)

  function desenharTurnstile() {
    if (!CHAVE || !window.turnstile || !caixa.current || widget.current !== null) return
    widget.current = window.turnstile.render(caixa.current, {
      sitekey: CHAVE,
      appearance: 'interaction-only',
      callback: setToken,
      'expired-callback': () => setToken(''),
    })
  }
  // Se o script já estava carregado (navegação interna), desenha na montagem.
  useEffect(desenharTurnstile, [])

  // Quem volta de /vs-gratis/baixar com o link vencido ou usado 3 vezes.
  const [aviso, setAviso] = useState('')
  useEffect(() => {
    const motivo = new URLSearchParams(window.location.search).get('link')
    if (motivo === 'vencido') setAviso('Esse link venceu (ele vale por 7 dias). Preencha de novo para receber um link novo.')
    if (motivo === 'esgotado') setAviso('Esse link já foi usado 3 vezes. Preencha de novo para receber um link novo.')
  }, [])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    const celular = digitosCelular(telefone)
    if (!nome.trim()) return setErro('Informe seu nome.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro('Confira o e-mail.')
    if (!celularValido(celular)) return setErro('Informe o WhatsApp com DDD.')
    if (!aceite) return setErro('Marque a caixa de consentimento para receber a VS.')
    if (CHAVE && !token) return setErro('Aguarde a verificação anti-robô terminar e tente de novo.')
    setEnviando(true)
    try {
      const origem = origemDaVisita()
      const res = await fetch('/api/vs-gratis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          whatsapp: celular,
          consentimento: true,
          turnstile: token,
          utm_source: origem.source || '',
          utm_medium: origem.medium || '',
          utm_campaign: origem.campaign || '',
          pagina_entrada: document.referrer ? new URL(document.referrer).pathname : '',
        }),
      })
      const dados = await res.json().catch(() => ({}))
      if (!res.ok || !dados.ok) {
        setErro(dados.erro || 'Não foi possível liberar agora. Tente de novo em instantes.')
        window.turnstile?.reset(widget.current)
        setToken('')
      } else {
        setPronto({ nome: dados.nome || nome.trim(), link: dados.link, email: email.trim() })
      }
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando(false)
  }

  if (pronto) {
    return (
      <div role="status" className="bg-white p-7 text-ink sm:p-9">
        <p className="text-[22px] font-bold tracking-[-0.015em]">Pronto, {pronto.nome}!</p>
        <p className="mt-3 text-[15.5px] leading-[1.65] text-ink-muted">
          O download está liberado. Também mandamos o link para <strong className="text-ink">{pronto.email}</strong>: ele
          vale por 7 dias e baixa até 3 vezes.
        </p>
        <a href={pronto.link} className="btn-signal mt-6">
          Baixar a VS agora
        </a>
        <p className="mt-4 text-[13.5px] text-ink-muted">
          Não achou o e-mail depois? Confira a caixa de spam e a de promoções.
        </p>
      </div>
    )
  }

  const rotulo = 'block text-[14px] font-semibold text-ink'
  const campo =
    'mt-2 w-full rounded border border-line bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none'

  return (
    <form onSubmit={enviar} noValidate className="space-y-4 bg-white p-7 sm:p-9">
      {aviso && (
        <p role="status" className="border border-ink bg-mist px-4 py-3 text-[14.5px] font-semibold text-ink">
          {aviso}
        </p>
      )}
      {CHAVE && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={desenharTurnstile} />
      )}
      <div>
        <label htmlFor={`${id}-nome`} className={rotulo}>
          Seu nome
        </label>
        <input id={`${id}-nome`} name="name" type="text" autoComplete="name" autoCapitalize="words" required maxLength={80}
          value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor={`${id}-email`} className={rotulo}>
          E-mail
        </label>
        <input id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="off"
          spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com" className={campo} />
      </div>
      <div>
        <label htmlFor={`${id}-tel`} className={rotulo}>
          WhatsApp
        </label>
        <input id={`${id}-tel`} name="tel" type="tel" inputMode="tel" autoComplete="tel" required
          value={telefone} onChange={(e) => setTelefone(mascaraCelular(e.target.value))}
          placeholder="(27) 99999-8888" aria-describedby={`${id}-tel-ajuda`} className={campo} />
        <p id={`${id}-tel-ajuda`} className="mt-2 text-[12.5px] text-ink-muted">
          Para receber novidades e lançamentos.
        </p>
      </div>
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-[14px] leading-[1.55] text-ink-muted">
        <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)}
          className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-[#E5152D]" />
        <span>
          Quero receber a VS e conteúdos da Trilha Viva por e-mail. Posso cancelar quando quiser. Veja a{' '}
          <a href="/privacidade" className="link-quiet font-semibold">
            política de privacidade
          </a>
          .
        </span>
      </label>
      <div ref={caixa} />
      {erro && (
        <p role="alert" className="text-[14px] font-semibold text-signal-deep">
          {erro}
        </p>
      )}
      <button type="submit" disabled={enviando} className="btn-signal w-full disabled:opacity-60">
        {enviando ? 'Liberando…' : 'Quero minha VS grátis'}
      </button>
    </form>
  )
}
