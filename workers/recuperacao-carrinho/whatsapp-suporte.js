import { escapeHtml } from '../../lib/safe.js'

// Base do whatsapp-estado.js: e-mail ao suporte, o que quer dizer cada erro
// da Meta e os links assinados do e-mail de LIGAR. whatsapp-estado.js
// reexporta o que já exportava.

export const CAMINHO_LINK = '/whatsapp/ligar'

export function mudou(resultado) {
  return Number(resultado?.meta?.changes ?? resultado?.changes ?? 0) === 1
}

export function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

export function hojeBrasilia(agora = new Date()) {
  return new Date(new Date(agora).getTime() - 3 * 3600000).toISOString().slice(0, 10)
}

// ------------------------------------------------------------ e-mail ----

// chave: o Resend ignora um 2º envio com a mesma chave em 24 h.
export async function emailAoSuporte(env, { assunto, texto, html, chave }, fetchImpl) {
  const para = String(env.WA_ENCAMINHAR_PARA || env.LEMBRETE_BCC || '').trim()
  if (!para || !env.RESEND_API_KEY) return
  const headers = { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }
  if (chave) headers['Idempotency-Key'] = chave
  const resposta = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [para], subject: assunto.slice(0, 150), text: texto, html }),
  })
  // 409 com chave: um e-mail com essa chave já saiu (ou está saindo).
  if (chave && resposta.status === 409) return
  if (!resposta.ok) throw new Error(`Resend respondeu com HTTP ${resposta.status}`)
}

export function paragrafos(texto) {
  return texto
    .split('\n\n')
    .map((p) => `<p style="white-space:pre-wrap">${escapeHtml(p)}</p>`)
    .join('')
}

// O que cada erro comum da Meta quer dizer, e o que o Paulo faz.
const ERROS_META = {
  131042: 'Problema de pagamento na conta do WhatsApp. Cadastre ou atualize o cartão no Gerenciador de Negócios da Meta (Configurações de pagamento do WhatsApp).',
  130497: 'A Meta está impedindo esta conta de mandar mensagens para o Brasil. Normalmente se resolve com a verificação da empresa na Meta.',
  132001: 'A Meta não encontrou o modelo "carrinho_lembrete" em português (pt_BR) nesta conta.',
  132000: 'O modelo aprovado não bate com o que o robô manda (nome ou botão). Avise o Claude Code.',
  132012: 'O modelo aprovado não bate com o que o robô manda (nome ou botão). Avise o Claude Code.',
  131026: 'A mensagem não pôde ser entregue nesse celular (sem WhatsApp, versão antiga ou bloqueio).',
  190: 'O token do robô expirou ou foi revogado. Gere um novo token do usuário do sistema e cadastre na Cloudflare.',
  10: 'O usuário do sistema não tem permissão na conta do WhatsApp. Confira os ativos atribuídos ao Trilhavivarobo.',
  200: 'O usuário do sistema não tem permissão na conta do WhatsApp. Confira os ativos atribuídos ao Trilhavivarobo.',
}

// Token ou acesso recusado (190 token, 102 sessão, 3 e 10 permissão, 200 a
// 299 permissões): é da conta, nunca da pessoa.
export function erroDeAcesso(codigo) {
  const n = Number(codigo)
  return n === 3 || n === 10 || n === 102 || n === 190 || (n >= 200 && n <= 299)
}

export function explicarErro(codigo, detalhe = '') {
  const conhecido = ERROS_META[Number(codigo)]
  return conhecido
    ? `${conhecido} (código ${codigo})`
    : `Erro ${codigo || 'desconhecido'} da Meta${detalhe ? `: ${detalhe}` : ''}. Encaminhe este e-mail ao Claude Code.`
}

// -------------------------------------------------------------- links ----

function paraHex(bytes) {
  let hex = ''
  for (const byte of new Uint8Array(bytes)) hex += byte.toString(16).padStart(2, '0')
  return hex
}

export async function assinarLink(acao, nonce, segredo) {
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(segredo)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return paraHex(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(`whatsapp:${acao}:${nonce}`)))
}

export function novoNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return paraHex(bytes)
}

export async function montarLink(env, acao, nonce) {
  const base = String(env.WA_LINK_BASE || '').replace(/\/+$/, '')
  const t = await assinarLink(acao, nonce, env.WA_LINK_SEGREDO)
  return `${base}${CAMINHO_LINK}?acao=${acao}&n=${nonce}&t=${t}`
}
