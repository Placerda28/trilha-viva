'use client'

import Script from 'next/script'
import { useEffect, useId, useRef, useState } from 'react'
import { Aviso, Botao, Campo, classesDoBotao } from '@/components/ds'
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
// Redesenho: só o visual mudou (campos e botão do design system); campos,
// validações, API e Turnstile são os de antes.
const CHAVE_TESTE = '1x00000000000000000000AA'
const CHAVE =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (process.env.NODE_ENV === 'production' ? '' : CHAVE_TESTE)

const CAIXA = 'flex-[1_1_360px] max-w-[480px] border border-ink p-6'

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
    if (CHAVE && !token) {
      return setErro('Falta a verificação anti-robô: se apareceu a caixa "Confirme que é humano", marque e envie de novo.')
    }
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
      <div role="status" className={`${CAIXA} flex flex-col gap-2.5`}>
        <strong className="font-semi-condensed text-[22px] font-[750] leading-[1.15]">
          Pronto, {pronto.nome}. A VS está liberada.
        </strong>
        <span className="text-[15px] leading-[1.55] text-text-2">
          Também mandamos o link para <strong className="font-[650] text-ink">{pronto.email}</strong>: ele vale por 7
          dias e baixa até 3 vezes. Não chegou em alguns minutos? Olhe a caixa de spam e a de promoções.
        </span>
        {/* <a> simples, não <Link>: o endereço é uma rota que redireciona para o arquivo e conta o download. */}
        <a href={pronto.link} className={classesDoBotao({ tamanho: 'lg', className: 'mt-1 self-start' })}>
          Baixar a VS agora
        </a>
        <a href="/como-usar" className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold underline underline-offset-[3px]">
          Ver como usar a VS
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} noValidate className={`${CAIXA} flex flex-col gap-4`}>
      {aviso && <Aviso variante="info">{aviso}</Aviso>}
      {CHAVE && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={desenharTurnstile} />
      )}
      <Campo rotulo="Seu nome" name="name" autoComplete="name" autoCapitalize="words" required maxLength={80}
        value={nome} onChange={(e) => setNome(e.target.value)} />
      <Campo rotulo="E-mail para receber a VS" name="email" tipo="email" inputMode="email" autoComplete="email"
        autoCapitalize="off" spellCheck={false} required placeholder="voce@email.com"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <Campo rotulo="WhatsApp" name="tel" tipo="tel" inputMode="tel" autoComplete="tel" required
        placeholder="(27) 99999-8888" ajuda="Para receber a VS e novidades da Trilha Viva pelo WhatsApp."
        value={telefone} onChange={(e) => setTelefone(mascaraCelular(e.target.value))} />
      <label htmlFor={`${id}-aceite`} className="flex min-h-11 cursor-pointer items-start gap-3 text-[14px] leading-[1.5] text-text-3">
        <input id={`${id}-aceite`} type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)}
          className="mt-0.5 h-[22px] w-[22px] shrink-0 accent-ink" />
        <span>
          Quero receber a VS e conteúdos da Trilha Viva por e-mail e WhatsApp. Posso cancelar quando quiser. Veja a{' '}
          <a href="/privacidade" className="font-semibold text-ink underline underline-offset-[3px]">
            política de privacidade
          </a>
          .
        </span>
      </label>
      <div ref={caixa} />
      {erro && <Aviso variante="erro">{erro}</Aviso>}
      <Botao type="submit" tamanho="lg" bloco carregando={enviando}>
        Quero a VS grátis
      </Botao>
    </form>
  )
}
