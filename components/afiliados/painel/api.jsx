'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Fala com /api/afiliados/*. O que a tela recebe é sempre { ok, status, corpo }:
// quem chama decide o que mostrar, nunca estoura exceção. O protótipo troca esta
// função por uma de mentira (ApiProvider) para tirar print sem backend.
export async function http(caminho, opcoes = {}) {
  try {
    const r = await fetch(caminho, {
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      ...opcoes,
    })
    let corpo = null
    try {
      corpo = await r.json()
    } catch {
      corpo = null
    }
    return { ok: r.ok, status: r.status, corpo }
  } catch {
    return { ok: false, status: 0, corpo: null }
  }
}

export function enviar(chamar, caminho, dados) {
  return chamar(caminho, { method: 'POST', body: JSON.stringify(dados) })
}

const Contexto = createContext(http)
export const ApiProvider = Contexto.Provider
export const useHttp = () => useContext(Contexto)

// Busca uma vez ao montar (e de novo quando `caminho` muda ou `recarregar` é chamado).
export function useDados(caminho) {
  const chamar = useHttp()
  const [estado, setEstado] = useState({ dados: null, erro: false, carregando: true })
  const [volta, setVolta] = useState(0)

  useEffect(() => {
    let vivo = true
    setEstado((e) => ({ ...e, carregando: true, erro: false }))
    chamar(caminho).then((r) => {
      if (!vivo) return
      if (r.ok && r.corpo) setEstado({ dados: r.corpo, erro: false, carregando: false })
      else setEstado({ dados: null, erro: true, carregando: false })
    })
    return () => {
      vivo = false
    }
  }, [caminho, chamar, volta])

  const recarregar = useCallback(() => setVolta((v) => v + 1), [])
  return { ...estado, recarregar }
}
