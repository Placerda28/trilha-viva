'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import {
  COOKIE_ORIGEM,
  DIAS_ORIGEM,
  fbcDoFbclid,
  juntarOrigem,
  lerCookie,
  lerCookieOrigem,
  origemDoEndereco,
} from '@/lib/rastreio'

// Guarda de onde a pessoa veio (UTM do anúncio, do e-mail, do WhatsApp e o
// fbclid da Meta) num cookie nosso, em qualquer página. Sem isso, quem chega
// pelo anúncio na página inicial e só depois vai para /assinar perde a origem
// no caminho. Roda só no navegador: as páginas continuam estáticas.
function gravar(nome, valor, dominio) {
  document.cookie =
    `${nome}=${valor}; Max-Age=${DIAS_ORIGEM * 86400}; Path=/; SameSite=Lax; Secure` +
    (dominio ? `; Domain=${dominio}` : '')
}

export default function Origem() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      const achada = origemDoEndereco(window.location.search)
      if (!achada) return
      // Mesmo domínio que o Pixel usa (.trilhaviva.org), para não existirem
      // dois cookies _fbc diferentes.
      const host = window.location.hostname
      const dominio = host.endsWith('trilhaviva.org') ? '.trilhaviva.org' : ''

      const anterior = lerCookieOrigem(lerCookie(document.cookie, COOKIE_ORIGEM))
      const juntos = juntarOrigem(anterior, achada.origem)
      gravar(COOKIE_ORIGEM, encodeURIComponent(JSON.stringify(juntos)), dominio)

      // Clique da Meta sem o cookie _fbc (Pixel bloqueado ou ainda não
      // carregado): monta no formato oficial para o servidor mandar à Meta.
      if (achada.fbclid && !lerCookie(document.cookie, '_fbc')) {
        gravar('_fbc', fbcDoFbclid(achada.fbclid), dominio)
      }
    } catch {
      /* cookie bloqueado: o site segue normal, só sem a origem */
    }
  }, [pathname])

  return null
}
