import { createContext, useContext, useEffect, useState } from 'react'

// A conversa da tela de Saques com /api/gestao/afiliados/saques. As funções
// ficam num objeto trocável (contexto): o protótipo põe um falso no lugar, e a
// tela de verdade usa `apiReal`. Toda chamada devolve { ok, status, dados }.

const BASE = '/api/gestao/afiliados/saques'

async function chamar(url, opcoes = {}) {
  try {
    const res = await fetch(url, { cache: 'no-store', ...opcoes })
    const dados = await res.json().catch(() => null)
    return { ok: res.ok && dados?.ok !== false, status: res.status, dados }
  } catch {
    return { ok: false, status: 0, dados: null }
  }
}

const postar = (url, corpo) =>
  chamar(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })

export const apiReal = {
  listar: (status, pagina, sinal) => chamar(`${BASE}?status=${status}&pagina=${pagina}`, { signal: sinal }),
  pagar: (id, caminho) => postar(`${BASE}/${id}/pagar`, { caminho }),
  recusar: (id, motivo) => postar(`${BASE}/${id}/recusar`, { motivo }),
  // XMLHttpRequest porque o fetch não informa o andamento do envio.
  enviar: (id, arquivo, aoProgresso) =>
    new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE}/${id}/comprovante`)
      xhr.responseType = 'json'
      xhr.upload.onprogress = (e) => e.lengthComputable && aoProgresso(e.loaded / e.total)
      xhr.onload = () =>
        resolve({ ok: xhr.status >= 200 && xhr.status < 300 && xhr.response?.ok !== false, status: xhr.status, dados: xhr.response })
      xhr.onerror = () => resolve({ ok: false, status: 0, dados: null })
      const corpo = new FormData()
      corpo.append('arquivo', arquivo)
      xhr.send(corpo)
    }),
}

export const ApiSaquesContexto = createContext(apiReal)
export const useApiSaques = () => useContext(ApiSaquesContexto)

export const urlComprovante = (id) => `${BASE}/${id}/comprovante`

const FALHA = 'Não consegui carregar os saques agora. Confira a internet e tente de novo.'

// Mesma ideia do useGestao: 404 quer dizer sessão caída. Guarda de qual aba
// vieram os dados (`status`), para a tela não mostrar a lista da aba anterior.
export function useListaSaques(status, pagina, tentativa) {
  const api = useApiSaques()
  const [estado, setEstado] = useState({ dados: null, status: '', erro: '', carregando: true })

  useEffect(() => {
    const controle = new AbortController()
    setEstado((e) => ({ ...e, erro: '', carregando: true }))
    api.listar(status, pagina, controle.signal).then((r) => {
      if (controle.signal.aborted) return
      if (r.status === 404) return setEstado((e) => ({ ...e, carregando: false, erro: 'sessao' }))
      if (!r.ok) return setEstado((e) => ({ ...e, carregando: false, erro: r.dados?.erro || FALHA }))
      setEstado({ dados: r.dados, status, erro: '', carregando: false })
    })
    return () => controle.abort()
  }, [api, status, pagina, tentativa])

  return estado
}
