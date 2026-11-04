'use client'

import { useEffect } from 'react'
import { cookieDoRef, refDoEndereco } from '@/lib/afiliados-ref'

// Quando o endereço traz ?ref=CODIGO, guarda o código por 30 dias e avisa o
// servidor do clique. Roda só no navegador, depois de a página aparecer, e não
// mexe em nada que o visitante veja. Sem ?ref= não faz nada.
export default function RefCaptura() {
  useEffect(() => {
    try {
      const achado = refDoEndereco(window.location.search)
      if (!achado) return
      document.cookie = cookieDoRef(achado.codigo, window.location.protocol === 'https:')
      const corpo = JSON.stringify({ ...achado, caminho: window.location.pathname })
      // sendBeacon não atrasa a página nem quebra se a rede cair; o servidor
      // responde 204 sempre. Sem ele, fetch com keepalive faz o mesmo papel.
      const mandou = navigator.sendBeacon?.('/api/afiliados/clique', new Blob([corpo], { type: 'application/json' }))
      if (!mandou) {
        fetch('/api/afiliados/clique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: corpo,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {
      /* cookie ou rede bloqueados: o site segue normal, só sem o registro */
    }
  }, [])

  return null
}
