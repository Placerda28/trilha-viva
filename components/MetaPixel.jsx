'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { site } from '@/lib/site'

// Pixel da Meta. O código-base oficial carrega o fbevents.js e registra o
// PageView. Como o Next troca de página sem recarregar, o PageView das páginas
// seguintes é disparado aqui, a cada mudança de endereço.
export default function MetaPixel() {
  const id = site.metaPixelId
  const pathname = usePathname()
  const primeira = useRef(true)

  useEffect(() => {
    if (!id) return
    if (primeira.current) {
      primeira.current = false
      return // o PageView da primeira página já vai no código-base
    }
    window.fbq?.('track', 'PageView')
  }, [pathname, id])

  if (!id) return null

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}

// Dispara um evento do Pixel. O eventID é o que casa com o evento do servidor.
// O código-base carrega depois que a página fica interativa; se o evento vier
// antes disso, espera o fbq aparecer (até 5 s) em vez de se perder.
export function rastrear(evento, dados, eventID) {
  if (typeof window === 'undefined' || !site.metaPixelId) return
  let tentativas = 0
  const vai = () => {
    if (!window.fbq) {
      if (tentativas++ < 50) setTimeout(vai, 100)
      return
    }
    if (eventID) window.fbq('track', evento, dados || {}, { eventID })
    else window.fbq('track', evento, dados || {})
  }
  vai()
}

// Para páginas de servidor que querem disparar um evento ao abrir.
export function EventoAoAbrir({ evento, dados }) {
  useEffect(() => {
    rastrear(evento, dados)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento])
  return null
}
