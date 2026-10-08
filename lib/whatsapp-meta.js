// Peças da API oficial do WhatsApp (Meta Cloud API) usadas pelo robô de
// recuperação e pelo site (resposta pela gestão). Sem imports com "@/": o
// robô importa este arquivo por caminho relativo, como lembrete-assinatura.js.

// Custo estimado de uma mensagem de marketing entregue no Brasil, para a
// conta da gestão. Não decide nada: é só a estimativa mostrada ao Paulo.
export const CUSTO_MENSAGEM_CENTAVOS = 32

const VERSAO_PADRAO = 'v26.0'
const TEMPO_LIMITE_MS = 15000

function somenteDigitos(valor) {
  return Array.from(String(valor || ''))
    .filter((caractere) => caractere >= '0' && caractere <= '9')
    .join('')
}

// A Meta manda e recebe o número com o 55 na frente. O banco guarda DDD +
// número, sem o 55 (como o checkout grava). O DDD 55 existe (Santa Maria, RS),
// então o 55 só sai quando sobra um número de 10 ou 11 dígitos.
export function telefoneSemPais(valor) {
  const digitos = somenteDigitos(valor)
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
    return digitos.slice(2)
  }
  return digitos
}

export function telefoneComPais(telefone) {
  return `55${telefoneSemPais(telefone)}`
}

// Primeiro nome, até 30 caracteres, sem caracteres de controle. A variável do
// modelo não aceita quebra de linha nem tabulação.
export function primeiroNome(valor) {
  const limpo = Array.from(String(valor || ''), (caractere) => {
    const codigo = caractere.charCodeAt(0)
    return codigo <= 31 || codigo === 127 ? ' ' : caractere
  })
    .join('')
    .trim()
  const fim = limpo.indexOf(' ')
  return (fim === -1 ? limpo : limpo.slice(0, fim)).slice(0, 30)
}

export function configuracaoMeta(env = {}) {
  const versao = String(env.WA_GRAPH_VERSION || VERSAO_PADRAO).trim()
  const numeroId = String(env.WA_PHONE_NUMBER_ID || '').trim()
  const token = String(env.WA_TOKEN || '').trim()
  return { ok: Boolean(numeroId && token), versao, numeroId, token }
}

// O sufixo do botão "Finalizar compra". Leva só o código do carrinho e a
// origem: e-mail, nome e telefone nunca vão no endereço (o Pixel da Meta
// manda o endereço da página para a Meta). conteudo ("semanaN") diz qual
// mensagem da sequência trouxe a pessoa de volta.
export function sufixoDoBotao(carrinhoId, conteudo = '') {
  const base = `r=${encodeURIComponent(String(carrinhoId || ''))}&utm_source=whatsapp&utm_medium=lembrete&utm_campaign=carrinho`
  return conteudo ? `${base}&utm_content=${encodeURIComponent(conteudo)}` : base
}

// sufixo: só o teste de aprovação troca o endereço do botão (utm de teste).
// modelo e botaoUrl: o modelo da vez na sequência e a posição do botão de
// link nele (os modelos têm o mesmo formato; a posição vem da Meta).
export function pedidoModelo({ telefone, nome, carrinhoId, sufixo, conteudo, modelo, botaoUrl = 0 }, env = {}) {
  return {
    messaging_product: 'whatsapp',
    to: telefoneComPais(telefone),
    type: 'template',
    template: {
      name: String(modelo || env.WA_TEMPLATE || 'carrinho_lembrete'),
      language: { code: 'pt_BR' },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: primeiroNome(nome) || 'tudo bem' }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: String(Number(botaoUrl) || 0),
          parameters: [{ type: 'text', text: sufixo || sufixoDoBotao(carrinhoId, conteudo) }],
        },
      ],
    },
  }
}

export function pedidoTexto(telefone, texto) {
  return {
    messaging_product: 'whatsapp',
    to: telefoneComPais(telefone),
    type: 'text',
    text: { preview_url: false, body: String(texto || '') },
  }
}

// Envia um pedido à Meta e devolve o id da mensagem (wamid). Qualquer resposta
// sem id vira erro com o código da Meta, para o log dizer o motivo.
export async function chamarMeta(env, corpo, fetchImpl = globalThis.fetch) {
  const config = configuracaoMeta(env)
  if (!config.ok) throw new Error('WhatsApp não configurado (WA_PHONE_NUMBER_ID ou WA_TOKEN).')

  const controle = new AbortController()
  const prazo = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS)
  try {
    const resposta = await fetchImpl(
      `https://graph.facebook.com/${config.versao}/${config.numeroId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(corpo),
        signal: controle.signal,
      }
    )
    const dados = await resposta.json().catch(() => null)
    const id = dados?.messages?.[0]?.id
    if (!resposta.ok || !id) {
      const codigo = dados?.error?.code ?? resposta.status
      const motivo = String(dados?.error?.message || 'sem detalhe').slice(0, 200)
      throw Object.assign(new Error(`Meta respondeu HTTP ${resposta.status} (código ${codigo}): ${motivo}`), {
        codigo,
      })
    }
    return id
  } finally {
    clearTimeout(prazo)
  }
}

function semAcentos(valor) {
  return Array.from(String(valor || '').normalize('NFD'))
    .filter((caractere) => {
      const codigo = caractere.charCodeAt(0)
      return codigo < 768 || codigo > 879
    })
    .join('')
}

const PEDIDOS_DE_SAIDA = new Set([
  'sair',
  'parar',
  'pare',
  'stop',
  'cancelar',
  'descadastrar',
  'nao quero receber',
])

// "SAIR", "Sair!", "não quero receber" contam; "quero sair da dúvida" não.
export function pedidoDeSaida(texto) {
  const normalizado = semAcentos(texto).toLowerCase()
  let inicio = 0
  let fim = normalizado.length
  const letra = (c) => (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
  while (inicio < fim && !letra(normalizado[inicio])) inicio += 1
  while (fim > inicio && !letra(normalizado[fim - 1])) fim -= 1
  return PEDIDOS_DE_SAIDA.has(normalizado.slice(inicio, fim))
}

function paraHex(bytes) {
  let hex = ''
  for (const byte of new Uint8Array(bytes)) hex += byte.toString(16).padStart(2, '0')
  return hex
}

// Confere o cabeçalho X-Hub-Signature-256 ("sha256=<hex>") que a Meta manda:
// HMAC-SHA256 do corpo CRU com a chave secreta do app. Comparação em tempo
// constante, para não vazar quantos caracteres bateram.
export async function assinaturaValida(corpoCru, cabecalho, segredo) {
  const recebido = String(cabecalho || '').trim().toLowerCase()
  if (!segredo || !recebido.startsWith('sha256=')) return false
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(segredo)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const esperado = 'sha256=' + paraHex(
    await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(String(corpoCru)))
  )
  if (recebido.length !== esperado.length) return false
  let diferenca = 0
  for (let i = 0; i < esperado.length; i += 1) {
    diferenca |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i)
  }
  return diferenca === 0
}

// Igualdade em tempo constante para o token de verificação do webhook.
export function textoIgual(a, b) {
  const x = String(a || '')
  const y = String(b || '')
  if (!x || !y || x.length !== y.length) return false
  let diferenca = 0
  for (let i = 0; i < x.length; i += 1) diferenca |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diferenca === 0
}

// ------------------------------------------------ anexos e modelos ----
// Arquivos que a Meta aceita no WhatsApp, por tipo, com o tamanho máximo.
// Documento vai até 10 MB (a Meta aceita 100 MB, mas o site roda no plano
// grátis da Cloudflare e não deve carregar arquivos tão grandes).
const MB = 1024 * 1024
const MIDIAS = {
  'image/jpeg': { tipo: 'image', limite: 5 * MB },
  'image/png': { tipo: 'image', limite: 5 * MB },
  'audio/aac': { tipo: 'audio', limite: 16 * MB },
  'audio/mp4': { tipo: 'audio', limite: 16 * MB },
  'audio/mpeg': { tipo: 'audio', limite: 16 * MB },
  'audio/amr': { tipo: 'audio', limite: 16 * MB },
  'audio/ogg': { tipo: 'audio', limite: 16 * MB },
  'video/mp4': { tipo: 'video', limite: 16 * MB },
  'video/3gpp': { tipo: 'video', limite: 16 * MB },
  'application/pdf': { tipo: 'document', limite: 10 * MB },
  'text/plain': { tipo: 'document', limite: 10 * MB },
  'application/msword': { tipo: 'document', limite: 10 * MB },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { tipo: 'document', limite: 10 * MB },
  'application/vnd.ms-excel': { tipo: 'document', limite: 10 * MB },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { tipo: 'document', limite: 10 * MB },
  'application/vnd.ms-powerpoint': { tipo: 'document', limite: 10 * MB },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { tipo: 'document', limite: 10 * MB },
}

export const TIPOS_DE_ARQUIVO = Object.keys(MIDIAS)

// { tipo, limite } do tipo de arquivo, ou null se a Meta não aceita.
export function tipoDaMidia(mime) {
  const limpo = String(mime || '').split(';')[0].trim().toLowerCase()
  return MIDIAS[limpo] ? { mime: limpo, ...MIDIAS[limpo] } : null
}

// Nome de arquivo seguro para mostrar e para a Meta: sem caminho, sem
// caracteres de controle, até 120 caracteres.
export function nomeDoArquivo(valor) {
  const semCaminho = String(valor || '').split('/').pop().split(String.fromCharCode(92)).pop()
  const limpo = Array.from(semCaminho, (c) => {
    const codigo = c.charCodeAt(0)
    return codigo <= 31 || codigo === 127 ? ' ' : c
  })
    .join('')
    .trim()
  return limpo.slice(0, 120) || 'arquivo'
}

// Mesma regra de tempo e de erro do chamarMeta, para os outros pedidos.
async function pedirMeta(env, caminho, init, fetchImpl) {
  const config = configuracaoMeta(env)
  if (!config.ok) throw new Error('WhatsApp não configurado (WA_PHONE_NUMBER_ID ou WA_TOKEN).')
  const controle = new AbortController()
  const prazo = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS)
  try {
    const resposta = await fetchImpl(`https://graph.facebook.com/${config.versao}/${caminho}`, {
      ...init,
      headers: { Authorization: `Bearer ${config.token}`, ...(init.headers || {}) },
      signal: controle.signal,
    })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      const codigo = dados?.error?.code ?? resposta.status
      const motivo = String(dados?.error?.message || 'sem detalhe').slice(0, 200)
      throw Object.assign(new Error(`Meta respondeu HTTP ${resposta.status} (código ${codigo}): ${motivo}`), {
        codigo,
      })
    }
    return dados || {}
  } finally {
    clearTimeout(prazo)
  }
}

// Sobe o arquivo para a Meta e devolve o id da mídia (vale 30 dias lá).
export async function subirMidia(env, { arquivo, mime, nome }, fetchImpl = globalThis.fetch) {
  const config = configuracaoMeta(env)
  const formulario = new FormData()
  formulario.append('messaging_product', 'whatsapp')
  formulario.append('type', mime)
  formulario.append('file', new Blob([arquivo], { type: mime }), nomeDoArquivo(nome))
  const dados = await pedirMeta(env, `${config.numeroId}/media`, { method: 'POST', body: formulario }, fetchImpl)
  if (!dados.id) throw new Error('Meta não devolveu o id da mídia.')
  return String(dados.id)
}

// Pedido de envio de um arquivo já subido. Áudio não aceita legenda.
export function pedidoMidia(telefone, { tipo, midiaId, legenda, nome }) {
  const conteudo = { id: String(midiaId) }
  const texto = String(legenda || '').trim()
  if (texto && tipo !== 'audio') conteudo.caption = texto
  if (tipo === 'document') conteudo.filename = nomeDoArquivo(nome)
  return {
    messaging_product: 'whatsapp',
    to: telefoneComPais(telefone),
    type: tipo,
    [tipo]: conteudo,
  }
}

// Baixa um arquivo da Meta (o que o cliente mandou ou o que enviamos). Devolve
// a resposta da Meta, para a gestão repassar sem guardar o arquivo.
export async function baixarMidia(env, midiaId, fetchImpl = globalThis.fetch) {
  const config = configuracaoMeta(env)
  const info = await pedirMeta(env, encodeURIComponent(String(midiaId)), { method: 'GET' }, fetchImpl)
  if (!info.url) throw new Error('Meta não devolveu o endereço da mídia.')
  const resposta = await fetchImpl(info.url, { headers: { Authorization: `Bearer ${config.token}` } })
  if (!resposta.ok) throw Object.assign(new Error(`Download da mídia falhou (HTTP ${resposta.status}).`), { codigo: resposta.status })
  return { resposta, mime: String(info.mime_type || resposta.headers.get('content-type') || 'application/octet-stream') }
}

// O arquivo de uma mensagem recebida pelo webhook, ou null se for só texto.
export function midiaDaMensagem(mensagem) {
  const tipo = String(mensagem?.type || '')
  if (!['image', 'document', 'audio', 'video', 'sticker'].includes(tipo)) return null
  const dados = mensagem[tipo] || {}
  if (!dados.id) return null
  return {
    tipo,
    id: String(dados.id),
    mime: dados.mime_type ? String(dados.mime_type).slice(0, 100) : null,
    nome: dados.filename ? nomeDoArquivo(dados.filename) : null,
    legenda: String(dados.caption || ''),
  }
}

// "Chamar de novo": o modelo pago que reabre a conversa fora da janela de
// 24 h. O texto aqui tem que ser IGUAL ao modelo aprovado na Meta.
export const MODELO_RETOMAR = 'retomar_conversa'

export function textoRetomar(nome) {
  return `Oi ${primeiroNome(nome) || 'tudo bem'}, aqui é da Trilha Viva. Vi sua mensagem e quero te ajudar. Pode me responder por aqui?`
}

export function pedidoRetomar(telefone, nome, env = {}) {
  return {
    messaging_product: 'whatsapp',
    to: telefoneComPais(telefone),
    type: 'template',
    template: {
      name: String(env.WA_TEMPLATE_RETOMAR || MODELO_RETOMAR),
      language: { code: 'pt_BR' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: primeiroNome(nome) || 'tudo bem' }] }],
    },
  }
}
