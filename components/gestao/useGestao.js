'use client'

import { useEffect, useState } from 'react'

// Busca um endereço de /api/gestao e devolve { dados, erro, carregando }.
//
// Um 404 aqui quer dizer que a sessão caiu ou que o acesso à gestão foi
// cortado: as rotas respondem "não existe" para quem não é da equipe. A tela
// então pede para entrar de novo, em vez de mostrar um erro genérico.
export function useGestao(url, tentativa = 0) {
  const [estado, setEstado] = useState({ dados: null, erro: '', carregando: true })

  useEffect(() => {
    if (!url) return undefined
    const controle = new AbortController()
    setEstado((e) => ({ ...e, erro: '', carregando: true }))

    fetch(url, { signal: controle.signal, cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 404) throw Object.assign(new Error('sessao'), { tipo: 'sessao' })
        const dados = await res.json().catch(() => null)
        if (!res.ok || !dados?.ok) {
          throw Object.assign(new Error('falha'), { tipo: 'falha', msg: dados?.erro })
        }
        setEstado({ dados, erro: '', carregando: false })
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setEstado((e) => ({
          dados: e.dados,
          carregando: false,
          erro:
            err.tipo === 'sessao'
              ? 'sessao'
              : err.msg || 'Não consegui carregar os dados agora. Confira a internet e tente de novo.',
        }))
      })

    return () => controle.abort()
  }, [url, tentativa])

  return estado
}
