import { CUSTO_MENSAGEM_CENTAVOS } from '@/lib/whatsapp-meta'

// Funções puras da sub-aba WhatsApp (WhatsappConversas e partes): número
// formatado, datas no horário de Brasília, nome e busca das conversas.

export function celular(digitos) {
  const d = String(digitos || '')
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7)
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6)
  return d
}

export const HORA = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
export const DIA_CHAVE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
export const DIA_CURTO = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
export const DIA_LONGO = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' })
export const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base' })

export function data(iso) {
  const d = new Date(iso || '')
  return Number.isNaN(d.getTime()) ? null : d
}

export function diaChave(d) {
  return DIA_CHAVE.format(d)
}

export function ontemChave() {
  return diaChave(new Date(Date.now() - 86400000))
}

// "14:32" hoje, "Ontem", ou "03/10".
export function quandoCurto(d) {
  if (!d) return ''
  const dia = diaChave(d)
  if (dia === diaChave(new Date())) return HORA.format(d)
  if (dia === ontemChave()) return 'Ontem'
  return DIA_CURTO.format(d)
}

export function separadorDoDia(d) {
  const dia = diaChave(d)
  if (dia === diaChave(new Date())) return 'Hoje'
  if (dia === ontemChave()) return 'Ontem'
  return DIA_LONGO.format(d)
}

export function nomeDe(c) {
  return c.nome || c.nome_perfil || celular(c.telefone)
}

export function iniciais(c) {
  const partes = String(c.nome || c.nome_perfil || '').trim().split(' ').filter(Boolean)
  if (!partes.length) return '#'
  const primeira = partes[0][0] || ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] || '' : ''
  return (primeira + ultima).toUpperCase()
}

// Quem respondeu pela equipe: só a parte antes do @.
export function apelido(email) {
  return String(email || '').split('@')[0]
}

export function ultimaMensagem(c) {
  return c.mensagens.length ? c.mensagens[c.mensagens.length - 1] : null
}

// A última mensagem é do cliente e ainda dá para responder (janela de 24 h).
export function aguardandoVoce(c) {
  return c.janela_aberta && ultimaMensagem(c)?.direcao === 'entrada'
}

export function fimDaJanela(c) {
  const d = data(c.ultima_entrada_em)
  return d ? new Date(d.getTime() + 86400000) : null
}

// Busca pelo começo de qualquer parte do nome (sem ligar para acento) ou por
// 3+ dígitos do número.
export function combina(c, termo) {
  const nome = String(c.nome || c.nome_perfil || '')
  const pedaco = (texto) => COLLATOR.compare(texto.slice(0, termo.length), termo) === 0
  if (nome.split(' ').some(pedaco) || pedaco(nome)) return true
  const digitos = termo.split('').filter((x) => x >= '0' && x <= '9').join('')
  return digitos.length >= 3 && String(c.telefone).includes(digitos)
}

export function tamanhoLegivel(bytes) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB'
}

export const PRECO = 'R$ ' + (CUSTO_MENSAGEM_CENTAVOS / 100).toFixed(2).replace('.', ',')
