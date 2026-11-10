import { COLLATOR, data } from './whatsappUtil'

// Funções puras da aba Instagram: nome, relógio da janela de 24 h, situação
// do roteiro e limite do texto (1.000 bytes em UTF-8).

export const LIMITE_BYTES = 1000
export const MSG_JANELA = 'O Instagram só deixa responder até 24 h depois da última mensagem do cliente'

export function bytesDe(texto) {
  return new TextEncoder().encode(String(texto || '')).length
}

export function nomeDe(c) {
  return c.nome || (c.usuario ? '@' + c.usuario : 'Cliente do Instagram')
}

export function iniciais(c) {
  const base = String(c.nome || c.usuario || '').replace(/^@/, '').trim().split(' ').filter(Boolean)
  if (!base.length) return '#'
  const duas = base.length > 1 ? base[0][0] + base[base.length - 1][0] : base[0].slice(0, 2)
  return duas.toUpperCase()
}

// "faltam 5 h" / "faltam 40 min" / "janela fechada". Conta do horário da última mensagem do cliente.
export function relogio(ultimaEntradaEm, agora = Date.now()) {
  const entrada = data(ultimaEntradaEm)
  if (!entrada) return 'janela fechada'
  const minutos = Math.floor((entrada.getTime() + 86400000 - agora) / 60000)
  if (minutos <= 0) return 'janela fechada'
  return minutos >= 60 ? 'faltam ' + Math.floor(minutos / 60) + ' h' : 'faltam ' + minutos + ' min'
}

export function janelaAberta(ultimaEntradaEm, agora = Date.now()) {
  return relogio(ultimaEntradaEm, agora) !== 'janela fechada'
}

// "S02_novidades" -> "novidades".
export function nomeDaSituacao(codigo) {
  if (!codigo) return ''
  return String(codigo).replace(/^S\d+_/, '').replace(/_/g, ' ')
}

export const ROTULO_MIDIA = {
  image: 'Foto',
  video: 'Vídeo',
  audio: 'Áudio',
  share: 'Publicação compartilhada',
  story_reply: 'Resposta a um story',
  story_mention: 'Menção em story',
  reel: 'Reel',
}

export function textoDaMensagem(m) {
  if (m.texto) return m.texto
  return m.midia_tipo ? '[' + (ROTULO_MIDIA[m.midia_tipo] || 'Anexo') + ']' : ''
}

export function combina(c, termo) {
  const alvo = String(c.nome || '') + ' ' + String(c.usuario || '')
  const pedaco = (t) => COLLATOR.compare(t.slice(0, termo.length), termo) === 0
  return alvo.split(' ').some(pedaco)
}
