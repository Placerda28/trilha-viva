import { createContext, useContext, useEffect, useState } from 'react'

// A conversa das telas Afiliados, Metas e Configurações com /api/gestao/afiliados.
// Mesmo desenho de apiSaques: as funções ficam num objeto trocável (contexto),
// o protótipo põe um falso no lugar e a tela de verdade usa `apiReal`.
// Toda chamada devolve { ok, status, dados }; 404 quer dizer sessão caída.

const BASE = '/api/gestao/afiliados'

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
  lista: (consulta, sinal) => chamar(`${BASE}/lista?${consulta}`, { signal: sinal }),
  ficha: (id, sinal) => chamar(`${BASE}/ficha?id=${encodeURIComponent(id)}`, { signal: sinal }),
  revelar: (id, campo) => postar(`${BASE}/ficha/revelar`, { id, campo }),
  acao: (id, acao, campos = {}) => postar(`${BASE}/acao`, { id, acao, ...campos }),
  metas: (sinal) => chamar(`${BASE}/metas`, { signal: sinal }),
  salvarMetas: (niveis) => postar(`${BASE}/metas`, { niveis }),
  fechar: (mes) => postar(`${BASE}/fechamento`, { mes }),
  config: (sinal) => chamar(`${BASE}/config`, { signal: sinal }),
  salvarConfig: (campos) => postar(`${BASE}/config`, campos),
}

export const ApiAfiliadosContexto = createContext(apiReal)
export const useApiAfiliados = () => useContext(ApiAfiliadosContexto)

// É um link comum: o navegador baixa o arquivo com o cookie da sessão.
export const urlCsvFechamento = (mes) => `${BASE}/fechamento/csv?mes=${encodeURIComponent(mes)}`

const FALHA = 'Não consegui carregar agora. Confira a internet e tente de novo.'

// Busca com `buscar(api, sinal)` sempre que `chaves` mudam. Guarda o último
// dado bom enquanto carrega o próximo (a lista não pisca ao trocar de página).
export function useBusca(buscar, chaves) {
  const api = useApiAfiliados()
  const [estado, setEstado] = useState({ dados: null, erro: '', carregando: true })

  useEffect(() => {
    const controle = new AbortController()
    setEstado((e) => ({ ...e, erro: '', carregando: true }))
    buscar(api, controle.signal).then((r) => {
      if (controle.signal.aborted) return
      if (r.status === 404) return setEstado((e) => ({ ...e, carregando: false, erro: 'sessao' }))
      if (!r.ok) return setEstado((e) => ({ ...e, carregando: false, erro: r.dados?.erro || FALHA }))
      setEstado({ dados: r.dados, erro: '', carregando: false })
    })
    return () => controle.abort()
    // `buscar` é recriado a cada render; quem decide quando buscar de novo são as chaves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, ...chaves])

  return estado
}

// Texto de erro de uma ação (POST), no jeito que toda gaveta mostra.
export function erroDaAcao(r) {
  if (r.status === 404) return 'Sua sessão acabou. Entre de novo para continuar.'
  if (r.status === 0) return 'Falha de conexão. Confira a internet e tente de novo.'
  if (r.status === 403) return r.dados?.erro || 'Só o Administrador Master pode fazer esta ação.'
  return r.dados?.erro || 'Não consegui concluir agora. Tente de novo.'
}
