// Chamada da IA: Workers AI (padrao, binding AI) ou Anthropic (fetch direto, sem SDK).
// Os dois devolvem { json, tokensEntrada, tokensSaida }. json e null se a IA devolveu algo que nao e JSON.
export const MODELO_PADRAO_WORKERS_AI = '@cf/qwen/qwen3-30b-a3b-fp8'
export const TEMPO_LIMITE_MS = 25000
const MAX_TOKENS = 600
// Modelos que "pensam" antes de responder gastam o limite pensando e devolvem resposta vazia com 600.
const MAX_TOKENS_RACIOCINIO = 2000
const RE_RACIOCINIO = /qwen3|gemma-4|gpt-oss|deepseek-r1|qwq/i
export const maxTokensDe = (modelo) => (RE_RACIOCINIO.test(modelo || '') ? MAX_TOKENS_RACIOCINIO : MAX_TOKENS)
const URL_ANTHROPIC = 'https://api.anthropic.com/v1/messages'
const RE_COTA = /4006|daily free allocation|neurons?\b.*(exceed|limit|used)|exceeded.*(quota|allocation)/i

export class ErroIA extends Error {
  constructor(mensagem, { cota = false } = {}) {
    super(mensagem)
    this.name = 'ErroIA'
    this.cota = cota
  }
}

export const provedorDe = (env) => (env.IG_IA_PROVEDOR || 'workers-ai').trim()

export function modeloDe(env) {
  const modelo = (env.IG_IA_MODELO || '').trim()
  return modelo || (provedorDe(env) === 'workers-ai' ? MODELO_PADRAO_WORKERS_AI : '')
}

// Aceita objeto ou texto (com ou sem cerca de codigo) e devolve objeto ou null.
export function lerJson(valor) {
  if (valor && typeof valor === 'object') return valor
  if (typeof valor !== 'string') return null
  const limpo = valor.replace(/```json|```/gi, '')
  const ini = limpo.indexOf('{')
  const fim = limpo.lastIndexOf('}')
  if (ini < 0 || fim <= ini) return null
  try {
    return JSON.parse(limpo.slice(ini, fim + 1))
  } catch {
    return null
  }
}

function comTempoLimite(promessa, ms, aoEstourar) {
  let timer
  const limite = new Promise((_, rejeitar) => {
    timer = setTimeout(() => {
      aoEstourar?.()
      rejeitar(new ErroIA('tempo-limite da IA estourou'))
    }, ms)
  })
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer))
}

const juntar = (sistema) => (typeof sistema === 'string' ? sistema : sistema.map((b) => b.texto).join('\n\n'))

async function chamarWorkersAi(env, { sistema, mensagens, esquema }, opcoes) {
  const ai = opcoes.ai || env.AI
  if (!ai) throw new ErroIA('binding AI ausente')
  const entrada = {
    messages: [{ role: 'system', content: juntar(sistema) }, ...mensagens],
    response_format: { type: 'json_schema', json_schema: esquema },
    max_tokens: opcoes.maxTokens || maxTokensDe(modeloDe(env)),
  }
  let r
  try {
    r = await comTempoLimite(ai.run(modeloDe(env), entrada), opcoes.tempoLimiteMs || TEMPO_LIMITE_MS)
  } catch (erro) {
    if (RE_COTA.test(String(erro?.message))) throw new ErroIA('cota diária da IA acabou', { cota: true })
    if (/JSON Mode couldn't be met/i.test(String(erro?.message))) return { json: null, tokensEntrada: 0, tokensSaida: 0 }
    throw erro
  }
  const bruto = r?.response ?? r?.choices?.[0]?.message?.content ?? r?.output_text
  return { json: lerJson(bruto), tokensEntrada: r?.usage?.prompt_tokens || 0, tokensSaida: r?.usage?.completion_tokens || 0 }
}

function blocosAnthropic(sistema) {
  if (typeof sistema === 'string') return [{ type: 'text', text: sistema }]
  return sistema.map((b) => (b.cache ? { type: 'text', text: b.texto, cache_control: { type: 'ephemeral' } } : { type: 'text', text: b.texto }))
}

async function chamarAnthropic(env, { sistema, mensagens }, opcoes) {
  if (!env.ANTHROPIC_API_KEY) throw new ErroIA('ANTHROPIC_API_KEY ausente')
  const modelo = modeloDe(env)
  if (!modelo) throw new ErroIA('IG_IA_MODELO ausente')
  const controle = new AbortController()
  const pedido = (opcoes.fetchImpl || fetch)(URL_ANTHROPIC, {
    method: 'POST',
    signal: controle.signal,
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: modelo, max_tokens: opcoes.maxTokens || MAX_TOKENS, system: blocosAnthropic(sistema), messages: mensagens }),
  })
  const resp = await comTempoLimite(pedido, opcoes.tempoLimiteMs || TEMPO_LIMITE_MS, () => controle.abort())
  if (!resp.ok) throw new ErroIA(`anthropic ${resp.status}`)
  const dados = await resp.json()
  const texto = (dados.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('')
  return { json: lerJson(texto), tokensEntrada: dados.usage?.input_tokens || 0, tokensSaida: dados.usage?.output_tokens || 0 }
}

// opcoes: { fetchImpl, ai, maxTokens, tempoLimiteMs }
export async function chamarIA(env, pedido, opcoes = {}) {
  const provedor = provedorDe(env)
  if (provedor === 'workers-ai') return chamarWorkersAi(env, pedido, opcoes)
  if (provedor === 'anthropic') return chamarAnthropic(env, pedido, opcoes)
  throw new ErroIA(`provedor desconhecido: ${provedor}`)
}
