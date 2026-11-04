'use client'

import Script from 'next/script'
import { useEffect, useRef } from 'react'

// Anti-robô da Cloudflare, no mesmo padrão da /vs-gratis. Sem a chave pública no
// build, só o next dev usa a chave de teste oficial (sempre passa); em produção
// o servidor recusa sem token.
const CHAVE_TESTE = '1x00000000000000000000AA'
export const CHAVE_TURNSTILE =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (process.env.NODE_ENV === 'production' ? '' : CHAVE_TESTE)

// onToken recebe o token (ou '' quando vence). Mude `ciclo` para pedir outro.
export default function Turnstile({ onToken, ciclo = 0 }) {
  const caixa = useRef(null)
  const widget = useRef(null)

  function desenhar() {
    if (!CHAVE_TURNSTILE || !window.turnstile || !caixa.current || widget.current !== null) return
    widget.current = window.turnstile.render(caixa.current, {
      sitekey: CHAVE_TURNSTILE,
      appearance: 'interaction-only',
      callback: onToken,
      'expired-callback': () => onToken(''),
    })
  }
  // Navegação interna: o script já está na página, então desenha na montagem.
  useEffect(desenhar, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ciclo > 0 && widget.current !== null) window.turnstile?.reset(widget.current)
  }, [ciclo])

  if (!CHAVE_TURNSTILE) return null
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={desenhar} />
      <div ref={caixa} />
    </>
  )
}
