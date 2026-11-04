'use client'

import { useEffect, useState } from 'react'
import { validarFormatoCodigo } from '@/lib/afiliados/codigo'

// Confere se o código está livre, 400 ms depois de a pessoa parar de digitar.
// Estados: vazio | formato | conferindo | livre | ocupado | erro.
// "erro" é falha de rede ou limite de pedidos: a tela deixa enviar mesmo assim,
// porque quem decide de verdade é o servidor ao cadastrar.
export default function useDisponibilidade(codigo, ocupados) {
  const [resultado, setResultado] = useState({ codigo: '', estado: 'vazio', motivo: '' })

  useEffect(() => {
    if (!codigo) return undefined
    if (!validarFormatoCodigo(codigo) || ocupados.has(codigo)) return undefined
    const controle = new AbortController()
    const espera = setTimeout(async () => {
      setResultado({ codigo, estado: 'conferindo', motivo: '' })
      try {
        const res = await fetch('/api/afiliados/codigo?c=' + encodeURIComponent(codigo), {
          signal: controle.signal,
          cache: 'no-store',
        })
        const dados = await res.json().catch(() => ({}))
        if (!res.ok || !dados.ok) return setResultado({ codigo, estado: 'erro', motivo: '' })
        setResultado({ codigo, estado: dados.disponivel ? 'livre' : 'ocupado', motivo: dados.motivo || '' })
      } catch (e) {
        if (e?.name !== 'AbortError') setResultado({ codigo, estado: 'erro', motivo: '' })
      }
    }, 400)
    return () => {
      clearTimeout(espera)
      controle.abort()
    }
  }, [codigo, ocupados])

  // O que vale é derivado do código atual: um resultado velho nunca aparece
  // para um código novo.
  if (!codigo) return { estado: 'vazio', motivo: '' }
  if (!validarFormatoCodigo(codigo)) return { estado: 'formato', motivo: '' }
  if (ocupados.has(codigo)) return { estado: 'ocupado', motivo: '' }
  return resultado.codigo === codigo ? resultado : { estado: 'conferindo', motivo: '' }
}
