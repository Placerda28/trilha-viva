// Envio de texto pelo Direct do Instagram (Graph API da Meta). Só o site da
// gestão importa este arquivo, e só no clique de um admin: o robô e a IA
// nunca enviam (tests/instagram/sem-envio-automatico.test.mjs garante).
// Sem imports com "@/": os testes importam por caminho relativo.

const VERSAO_PADRAO = 'v26.0'
const TEMPO_LIMITE_MS = 15000
const JANELA_MS = 24 * 3600000

export const MSG_JANELA_VENCIDA =
  'O Instagram só deixa responder até 24 h depois da última mensagem do cliente'

export function configuracaoInstagram(env = {}) {
  const versao = String(env.IG_GRAPH_VERSION || VERSAO_PADRAO).trim()
  const paginaId = String(env.IG_PAGE_ID || '').trim()
  const token = String(env.IG_TOKEN || '').trim()
  return { ok: Boolean(paginaId && token), versao, paginaId, token }
}

// O endereço de envio fica só aqui: se a Meta mudar o caminho, ajusta-se esta linha.
export function urlEnvio({ versao, paginaId }) {
  return `https://graph.facebook.com/${versao}/${paginaId}/messages`
}

// "2026-11-10 14:00:00" (UTC, como o SQLite grava) ou ISO -> Date; inválido -> null.
export function dataUtc(valor) {
  const texto = String(valor || '').trim()
  if (!texto) return null
  const iso = /(Z|[+-]\d{2}:?\d{2})$/.test(texto) ? texto : texto.replace(' ', 'T') + 'Z'
  const data = new Date(iso)
  return Number.isNaN(data.getTime()) ? null : data
}

// Horas que ainda faltam da janela de 24 h (0 se vencida ou sem mensagem).
export function horasRestantes(ultimaEntradaEm, agora = new Date()) {
  const entrada = dataUtc(ultimaEntradaEm)
  if (!entrada) return 0
  return Math.max(0, (entrada.getTime() + JANELA_MS - agora.getTime()) / 3600000)
}

export function dentroDaJanela(ultimaEntradaEm, agora = new Date()) {
  return horasRestantes(ultimaEntradaEm, agora) > 0
}

// Envia o texto e devolve o message_id. Erro da Meta vira Error com codigo/subcodigo.
export async function enviarTexto(env, igsid, texto, fetchImpl = globalThis.fetch) {
  const config = configuracaoInstagram(env)
  if (!config.ok) throw new Error('Instagram não configurado (IG_PAGE_ID ou IG_TOKEN).')

  const controle = new AbortController()
  const prazo = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS)
  try {
    const resposta = await fetchImpl(urlEnvio(config), {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: String(igsid) }, messaging_type: 'RESPONSE', message: { text: String(texto) } }),
      signal: controle.signal,
    })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok || !dados?.message_id) throw erroDaMeta(resposta.status, dados)
    return String(dados.message_id)
  } finally {
    clearTimeout(prazo)
  }
}

function erroDaMeta(status, dados) {
  const codigo = dados?.error?.code ?? status
  const subcodigo = dados?.error?.error_subcode ?? null
  const motivo = String(dados?.error?.message || 'sem detalhe').slice(0, 200)
  return Object.assign(new Error(`Meta respondeu HTTP ${status} (código ${codigo}): ${motivo}`), { codigo, subcodigo })
}

// Subcódigos primeiro (são mais específicos), depois o código.
const POR_SUBCODIGO = [
  [[2534022, 2018278], 'passaram 24 h desde a última mensagem do cliente. Ele precisa escrever de novo.'],
  [[2018028], 'o app ainda não tem acesso avançado: só dá para responder a quem tem função no app. Confira as permissões na Meta.'],
  [[1545041, 2018108], 'essa pessoa não está disponível para receber mensagens agora.'],
  [[2534014], 'o identificador dessa conversa não é válido para a Meta.'],
  [[2534041], 'a conta do Instagram desligou o recebimento de mensagens por este app. Ligue de novo nas configurações da conta.'],
  [[2534077], 'a Página e a conta do Instagram não estão ligadas. Confira a ligação no Meta Business.'],
  [[2534040], 'limite de envio da Meta atingido. Espere alguns minutos e tente de novo.'],
]
const POR_CODIGO = [
  [[190, 102], 'o token do Instagram venceu ou foi trocado. Gere um token novo e grave no Cloudflare.'],
  [[10, 200, 3, 299], 'a Meta bloqueou por falta de permissão. Confira as permissões do app e do token (mensagens do Instagram).'],
  [[551], 'essa pessoa não está disponível para receber mensagens.'],
  [[100], 'a Meta não aceitou o pedido (dados inválidos).'],
  [[4, 17, 32, 613, 80002], 'limite de envio da Meta atingido. Espere alguns minutos e tente de novo.'],
]

export function explicarErroMeta(erro) {
  if (erro?.name === 'AbortError') return 'A Meta não respondeu a tempo. Tente de novo em instantes.'
  const codigo = Number(erro?.codigo)
  if (!Number.isFinite(codigo)) return 'A Meta não aceitou a mensagem agora. Tente de novo em instantes.'
  const sub = Number(erro?.subcodigo)
  const achado =
    POR_SUBCODIGO.find(([lista]) => lista.includes(sub)) || POR_CODIGO.find(([lista]) => lista.includes(codigo))
  const motivo = achado ? achado[1] : 'tente de novo em instantes.'
  return `A Meta recusou (código ${codigo}): ${motivo}`
}
