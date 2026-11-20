'use client'

import { useCallback, useState } from 'react'

// Estado do cupom do formulário de compra. Fica escondido atrás de "Tenho um
// cupom" para não distrair quem não tem. Aplicar confere no servidor
// (/api/cupom) e mostra o preço novo; o /api/checkout confere de novo na hora de
// cobrar, então o valor mostrado aqui nunca é o que decide.
//
//   estado: 'fechado' | 'aberto' | 'aplicado'   (inválido = aberto com `erro`)
export function useCupom() {
  const [aberto, setAberto] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [aplicado, setAplicado] = useState(null) // { cupom, preco, de }
  const [checando, setChecando] = useState(false)
  const [erro, setErro] = useState('')

  const aplicar = useCallback(async (texto) => {
    const limpo = String(texto || '').trim()
    if (!limpo) return
    setErro('')
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
        setErro(dados.erro || 'Não consegui conferir o cupom agora.')
      } else {
        setAplicado(dados)
      }
    } catch {
      setErro('Falha de conexão ao conferir o cupom.')
    }
    setChecando(false)
  }, [])

  const remover = useCallback(() => {
    setAplicado(null)
    setCodigo('')
    setErro('')
    setAberto(false)
  }, [])

  // Quem chega por /assinar?cupom=CODIGO já vê o cupom aplicado.
  const abrirComCodigo = useCallback(
    (texto) => {
      setAberto(true)
      setCodigo(texto)
      aplicar(texto)
    },
    [aplicar]
  )

  return { aberto, setAberto, codigo, setCodigo, aplicado, checando, erro, aplicar, remover, abrirComCodigo }
}
