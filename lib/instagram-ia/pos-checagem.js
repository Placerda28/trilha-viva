// Conferencia da resposta da IA feita pelo CODIGO (a IA pode errar ou ser enganada).
import { normalizar } from './acervo-busca.js'

export const PRECO_BASE = '89,90'
export const MAX_BYTES = 1000 // limite do Instagram: bytes UTF-8, nao caracteres
const DOMINIOS_OK = new Set(['trilhaviva.org', 'www.trilhaviva.org'])
const ACENTOS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g')
const plano = (s) => String(s).normalize('NFD').replace(ACENTOS, '').toLowerCase()

// Palavras que, na mensagem do CLIENTE, mandam a conversa para o Paulo (texto ja sem acento e sem pontuacao).
const RE_ESTORNO = new RegExp([
  'estorn', 'reembols', 'devolu', 'devolv', 'cancel', 'procon', '\\bprocess(?:o|ar)\\b', 'golpe', 'fraude',
  'dinheiro de volta', 'meu dinheiro', 'cobranca indevida', 'cobraram duas vezes', 'cobrado duas vezes',
  'chargeback', 'contest', 'advogado', 'reclame aqui', 'desisti', 'arrependi', 'me enganaram', 'enganacao',
  'refund',
].join('|'))

// Qualquer coisa com cara de endereco: com esquema, www., ou nome.tld (ate com espacos em volta do ponto).
const RE_LINK = /(?:[a-z][a-z0-9+.-]*:\/\/|www\.)\S+|\b[a-z0-9-]+(?:(?:\s+\.\s+|\.)[a-z0-9-]+)*(?:\s+\.\s+|\.)[a-z]{2,}\b(?:\/\S*)?/gi
const RE_PRECO = /R\$\s*([\d.]+(?:,\d{1,2})?)|([\d.]+(?:,\d{1,2})?)\s*reais/gi
const RE_CENTAVOS = /\d{1,3}(?:\.\d{3})*,\d{2}\b/g
const NUM = 'um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|mil'
const RE_EXTENSO = new RegExp(`\\b(?:${NUM})(?:\\s+(?:e\\s+)?(?:${NUM}))*\\s+reais\\b`)
const RE_NEGA_CUPOM = /\b(?:nao|nenhum|sem)\b[^.!?\n]{0,40}\bcupom/
const RE_NEGA_DESCONTO = /\b(?:nao|nenhum|sem)\b[^.!?\n]{0,40}\bdesconto/
const encoder = new TextEncoder()

export const pedeEstorno = (textos) => RE_ESTORNO.test(normalizar(textos.join(' ')))

function linkPermitido(bruto) {
  const limpo = bruto.replace(/\s+/g, '')
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(limpo) ? limpo : 'https://' + limpo)
    return DOMINIOS_OK.has(url.hostname) && url.protocol === 'https:'
  } catch {
    return false
  }
}

// Lista de permissao: so trilhaviva.org (e subcaminhos) fica; o resto some.
export function removerLinksExternos(texto) {
  let removeu = false
  const limpo = texto.replace(RE_LINK, (m) => {
    const pontuacao = (m.match(/[.,;:!?]+$/) || [''])[0]
    const link = pontuacao ? m.slice(0, -pontuacao.length) : m
    if (linkPermitido(link)) return m
    removeu = true
    return pontuacao
  })
  return { texto: limpo.replace(/[ \t]{2,}/g, ' ').trim(), removeu }
}

function centavos(bruto) {
  let s = String(bruto)
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '')
  return Math.round(Number(s) * 100)
}

export function temPrecoDiferente(texto, precosOk) {
  const aceitos = precosOk.map(centavos)
  for (const m of texto.matchAll(RE_PRECO)) {
    if (!aceitos.includes(centavos(m[1] || m[2]))) return true
  }
  for (const m of texto.matchAll(RE_CENTAVOS)) {
    if (!aceitos.includes(centavos(m[0]))) return true
  }
  return false
}

// Oferta que a IA nao pode fazer: desconto, %, gratis (fora da VS gratis), cupom que nao existe, valor por extenso.
export function ofertaSuspeita(resposta, campanha) {
  const t = plano(resposta)
  const falaDaDemo = /vs[ -]gratis/.test(t)
  const cupomOk = campanha && !/confirmar/i.test(campanha.cupom) && t.includes(plano(campanha.cupom))
  if (/%|por cento/.test(t)) return 'porcentagem'
  if (/desconto/.test(t) && !RE_NEGA_DESCONTO.test(t)) return 'desconto'
  if (/gratis|gratuit|de graca/.test(t) && !falaDaDemo) return 'grátis fora da VS grátis'
  if (/cupom/.test(t) && !RE_NEGA_CUPOM.test(t) && !cupomOk) return 'cupom'
  if (/metade do preco|meio preco|pela metade|preco especial|preco promocional/.test(t)) return 'preço especial'
  if (RE_EXTENSO.test(t)) return 'valor por extenso'
  return null
}

export function cortarEmBytes(texto, maximo = MAX_BYTES) {
  if (encoder.encode(texto).length <= maximo) return { texto, cortou: false }
  let fim = Math.min(texto.length, maximo)
  while (fim > 0 && encoder.encode(texto.slice(0, fim)).length > maximo - 3) fim -= 1
  for (const m of texto.matchAll(RE_LINK)) {
    if (m.index < fim && fim < m.index + m[0].length) fim = m.index // nao deixa link cortado ao meio
  }
  const ultimo = texto.charCodeAt(fim - 1)
  if (ultimo >= 0xd800 && ultimo <= 0xdbff) fim -= 1 // nem emoji pela metade
  return { texto: texto.slice(0, fim).trimEnd() + '...', cortou: true }
}

// Devolve { texto, precisaHumano, motivo } ja com todas as regras do codigo aplicadas.
export function conferirResposta({ json, textosDoCliente, campanha }) {
  const motivos = []
  let precisa = json.precisa_humano === true || json.precisa_humano === 1 || json.precisa_humano === 'true'
  if (precisa) motivos.push(String(json.motivo || '').trim() || 'a IA pediu revisão humana')
  const links = removerLinksExternos(String(json.resposta).trim())
  if (links.removeu) motivos.push('link externo removido')
  const precosOk = campanha ? [PRECO_BASE, campanha.preco] : [PRECO_BASE]
  if (temPrecoDiferente(links.texto, precosOk)) motivos.push('valor em reais diferente do preço oficial')
  const oferta = ofertaSuspeita(links.texto, campanha)
  if (oferta) motivos.push(`oferta que o roteiro não permite (${oferta})`)
  if (pedeEstorno(textosDoCliente)) motivos.push('cliente falou em estorno, reembolso, cancelamento ou reclamação (regra do código)')
  const corte = cortarEmBytes(links.texto)
  if (corte.cortou) motivos.push('texto cortado em 1.000 bytes')
  precisa = precisa || motivos.length > 0
  return { texto: corte.texto, precisaHumano: precisa, motivo: motivos.join('; ').slice(0, 500) || null }
}
