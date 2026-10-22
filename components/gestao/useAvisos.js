'use client'

import { useEffect, useState } from 'react'

// Os avisos da casca (o número do WhatsApp na barra lateral). Lê
// /api/gestao/avisos quando a casca abre e a cada 60 s, só com a aba à vista.
// Tolerante de propósito: 404, erro ou resposta torta deixam `null`, e a barra
// simplesmente não mostra número. `undefined` = ainda não respondeu; `null` = falhou.
export function useAvisos(ligado = true, intervalo = 60000) {
  const [avisos, setAvisos] = useState(undefined)

  useEffect(() => {
    if (!ligado) return undefined
    let ativo = true
    let controle = null

    const buscar = async () => {
      if (document.visibilityState !== 'visible') return
      controle?.abort()
      controle = new AbortController()
      try {
        const res = await fetch('/api/gestao/avisos', { signal: controle.signal, cache: 'no-store' })
        const dados = res.ok ? await res.json().catch(() => null) : null
        if (ativo) setAvisos(dados?.ok ? dados : null)
      } catch {
        /* sem rede ou cancelado: mantém o que já estava na tela */
      }
    }

    buscar()
    const relogio = setInterval(buscar, intervalo)
    // Voltou para a aba depois de um tempo: atualiza na hora.
    document.addEventListener('visibilitychange', buscar)
    return () => {
      ativo = false
      controle?.abort()
      clearInterval(relogio)
      document.removeEventListener('visibilitychange', buscar)
    }
  }, [ligado, intervalo])

  return avisos
}
