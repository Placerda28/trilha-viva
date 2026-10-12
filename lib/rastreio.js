// Peças do rastreamento das vendas que não dependem do Next: a origem da
// visita (UTM e fbclid), a preparação dos dados que a Meta usa para reconhecer
// quem comprou e o registro de cada envio na compra.
//
// A origem é só diagnóstico: nunca decide preço, acesso ou cupom.
//
// Este arquivo também roda no navegador (componente Origem): nada de banco
// aqui. A gravação na compra fica em rastreio-compra.js.

// Cookie próprio com a origem da visita. Guarda a primeira e a última vez que
// a pessoa chegou por um link marcado, por 90 dias.
export const COOKIE_ORIGEM = 'tv_origem'
export const DIAS_ORIGEM = 90

const CAMPOS_UTM = ['source', 'medium', 'campaign', 'content']

// Mesmo alfabeto da coluna origem dos carrinhos: curto, previsível e sem
// separadores que confundam a leitura depois.
function limparParte(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 40)
}

export function limparOrigem(valor) {
  const v = valor && typeof valor === 'object' ? valor : {}
  const limpo = {}
  for (const campo of CAMPOS_UTM) limpo[campo] = limparParte(v[campo])
  return limpo
}

export function temOrigem(origem) {
  return Boolean(origem && CAMPOS_UTM.some((campo) => origem[campo]))
}

// O fbclid é o código que a Meta põe em todo clique em anúncio ou link do
// Facebook e do Instagram. Só letras, números, _ e -.
export function limparFbclid(valor) {
  const v = String(valor || '').trim()
  return /^[A-Za-z0-9_-]{8,500}$/.test(v) ? v : ''
}

// Lê a origem do endereço da página. Quem chegou só com fbclid (link da Meta
// sem UTM) fica marcado como source "meta".
export function origemDoEndereco(busca) {
  const p = busca instanceof URLSearchParams ? busca : new URLSearchParams(String(busca || ''))
  const origem = limparOrigem({
    source: p.get('utm_source'),
    medium: p.get('utm_medium'),
    campaign: p.get('utm_campaign'),
    content: p.get('utm_content'),
  })
  const fbclid = limparFbclid(p.get('fbclid'))
  if (!temOrigem(origem) && !fbclid) return null
  if (!origem.source && fbclid) origem.source = 'meta'
  return { origem, fbclid }
}

// Formato do cookie _fbc que a Meta espera: fb.1.<milissegundos>.<fbclid>.
export function fbcDoFbclid(fbclid, agoraMs = Date.now()) {
  const limpo = limparFbclid(fbclid)
  return limpo ? `fb.1.${Math.floor(agoraMs)}.${limpo}` : ''
}

// Junta a visita nova ao que o cookie já tinha: a primeira origem nunca muda,
// a última é sempre a mais recente.
export function juntarOrigem(anterior, nova, agoraMs = Date.now()) {
  const atual = { ...limparOrigem(nova), em: Math.floor(agoraMs) }
  const primeiro = anterior?.primeiro && temOrigem(anterior.primeiro) ? anterior.primeiro : atual
  return { primeiro, ultimo: atual }
}

// Lê o valor cru do cookie tv_origem (JSON codificado para endereço). Valor
// estragado ou adulterado vira null, nunca erro.
export function lerCookieOrigem(valor) {
  if (!valor) return null
  try {
    const dados = JSON.parse(decodeURIComponent(valor))
    const primeiro = limparOrigem(dados?.primeiro)
    const ultimo = limparOrigem(dados?.ultimo)
    if (!temOrigem(ultimo)) return null
    return {
      primeiro: temOrigem(primeiro) ? primeiro : ultimo,
      ultimo,
    }
  } catch {
    return null
  }
}

export function lerCookie(cabecalho, nome) {
  for (const parte of String(cabecalho || '').split(';')) {
    const i = parte.indexOf('=')
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim()
  }
  return ''
}

// ---- Dados que a Meta usa para reconhecer quem comprou ----

export async function sha256(texto) {
  const dados = new TextEncoder().encode(texto)
  const hash = await crypto.subtle.digest('SHA-256', dados)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function normalizarEmailMeta(email) {
  return String(email || '').trim().toLowerCase()
}

// Só dígitos, com o 55 do Brasil na frente (a Meta quer o código do país).
export function normalizarTelefoneMeta(telefone) {
  let digitos = String(telefone || '').replace(/[^0-9]/g, '')
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) return digitos
  if (digitos.length === 10 || digitos.length === 11) digitos = '55' + digitos
  return digitos.length === 12 || digitos.length === 13 ? digitos : ''
}

// Marcas de acento (faixa U+0300 a U+036F) montadas sem escrever a barra
// invertida no código, que já se corrompeu no caminho até o repositório.
const ACENTOS = new RegExp(
  '[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']',
  'g'
)

function limparNome(parte) {
  return String(parte || '')
    .normalize('NFD')
    .replace(ACENTOS, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

// Primeiro e último nome, minúsculos e sem acento. Nome de uma palavra só
// manda apenas o primeiro.
export function partesDoNome(nome) {
  const palavras = String(nome || '').trim().split(/[ ]+/).map(limparNome).filter(Boolean)
  if (!palavras.length) return { fn: '', ln: '' }
  return { fn: palavras[0], ln: palavras.length > 1 ? palavras[palavras.length - 1] : '' }
}

export async function montarUserData({ email, telefone, nome, ip, ua, fbp, fbc } = {}) {
  const user_data = {}
  const em = normalizarEmailMeta(email)
  if (em) {
    const hash = await sha256(em)
    user_data.em = [hash]
    // Identificação externa: o mesmo cliente sempre com o mesmo código.
    user_data.external_id = [hash]
  }
  const ph = normalizarTelefoneMeta(telefone)
  if (ph) user_data.ph = [await sha256(ph)]
  const { fn, ln } = partesDoNome(nome)
  if (fn) user_data.fn = [await sha256(fn)]
  if (ln) user_data.ln = [await sha256(ln)]
  user_data.country = [await sha256('br')]
  if (ip) user_data.client_ip_address = ip
  if (ua) user_data.client_user_agent = ua
  if (fbp) user_data.fbp = fbp
  if (fbc) user_data.fbc = fbc
  return user_data
}

export const PRODUTO_META = 'pacote-2000-vs'

export function montarCustomData({ valor, moeda = 'BRL', referencia } = {}) {
  if (valor == null) return null
  const custom = {
    value: valor,
    currency: moeda,
    content_ids: [PRODUTO_META],
    content_type: 'product',
    num_items: 1,
  }
  if (referencia) custom.order_id = String(referencia)
  return custom
}

// Origem para mostrar na gestão: o anúncio, senão a campanha, senão a fonte.
export function rotuloOrigem({ utm_content, utm_campaign, utm_source } = {}) {
  return utm_content || utm_campaign || utm_source || 'direto'
}
