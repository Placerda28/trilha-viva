// Regras da sequência de WhatsApp da recuperação (plano A, 04/10/2026), sem
// banco e sem rede: o robô decide com elas e a gestão mostra com as mesmas.
// Sem imports com "@/": o robô importa este arquivo por caminho relativo.
//
// 1ª mensagem 3 h depois do carrinho; depois 1 por semana, contadas da 1ª,
// até 9 no total. Só das 9h às 19h59 de Brasília e, da 2ª em diante, nunca no
// mesmo dia de um e-mail da sequência para a mesma pessoa.

export const TOTAL_MENSAGENS = 9
export const PRIMEIRO_MODELO = 'carrinho_lembrete'
// Da 2ª em diante, em rodízio: preço → acervo → lembrete → preço...
export const RODIZIO = ['carrinho_preco', 'carrinho_acervo', 'carrinho_lembrete']
export const MODELOS = [PRIMEIRO_MODELO, 'carrinho_preco', 'carrinho_acervo']

// Por que a sequência parou. 'respondeu' é pausa: a gestão pode retomar.
export const MOTIVOS = {
  comprou: 'comprou',
  descadastro: 'pediu para sair',
  nao_entregue: 'não entregue',
  nao_le: 'não lê',
  respondeu: 'respondeu',
  fim: 'recebeu as 9',
  gestao: 'parado pela gestão',
}

const HORA = 3600000
const DIA = 24 * HORA
const FUSO = 3 * HORA // Brasília = UTC-3
const SEMANA_DIAS = 7
const INTERVALO_MINIMO_DIAS = 6 // entre duas mensagens, mesmo com atraso
const CARENCIA_STATUS = DIA // status ainda pode chegar no primeiro dia
const INICIO = 9
const FIM = 20

// O D1 guarda 'AAAA-MM-DD HH:MM:SS' em UTC.
export function deSql(texto) {
  if (!texto) return null
  const d = new Date(String(texto).replace(' ', 'T') + 'Z')
  return Number.isNaN(d.getTime()) ? null : d
}

export function paraSql(data) {
  return new Date(data).toISOString().slice(0, 19).replace('T', ' ')
}

export function diaBrasilia(data) {
  return new Date(new Date(data).getTime() - FUSO).toISOString().slice(0, 10)
}

export function dentroDoHorario(agora = new Date()) {
  const hora = new Date(new Date(agora).getTime() - FUSO).getUTCHours()
  return hora >= INICIO && hora < FIM
}

// 9h de Brasília do dia local de `local` mais `dias`.
function noveHoras(local, dias) {
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dias, INICIO + 3))
}

// Primeiro horário a partir de `base` que cai das 9h às 19h59 de Brasília e
// num dia sem e-mail para a pessoa (diasComEmail: 'AAAA-MM-DD' de Brasília).
// Antes das 9h espera as 9h; depois das 20h ou em dia de e-mail, 9h do dia
// seguinte.
export function ajustarHorario(base, diasComEmail = []) {
  const dias = new Set(diasComEmail)
  let t = new Date(base)
  for (let i = 0; i < 60; i += 1) {
    const local = new Date(t.getTime() - FUSO)
    const hora = local.getUTCHours()
    if (hora < INICIO) t = noveHoras(local, 0)
    else if (hora >= FIM || dias.has(local.toISOString().slice(0, 10))) t = noveHoras(local, 1)
    else return t
  }
  return t
}

// Base da mensagem seguinte (sem o ajuste de horário): semanas contadas da 1ª
// e pelo menos 6 dias depois da última, para um atraso não juntar duas.
export function baseDaSeguinte(inicio, enviadas, ultimaEm) {
  const pelaSemana = new Date(inicio).getTime() + SEMANA_DIAS * enviadas * DIA
  const pelaUltima = ultimaEm ? new Date(ultimaEm).getTime() + INTERVALO_MINIMO_DIAS * DIA : 0
  return new Date(Math.max(pelaSemana, pelaUltima))
}

// Dias de Brasília com e-mail para a pessoa: os já enviados e o próximo
// previsto. Aceita datas do D1, ISO ou Date; ignora vazios.
export function diasDeEmail(datas) {
  const dias = []
  for (const valor of datas || []) {
    const d = valor instanceof Date ? valor : deSql(valor) || (valor ? new Date(valor) : null)
    if (d && !Number.isNaN(d.getTime())) dias.push(diaBrasilia(d))
  }
  return dias
}

function naoEntregue(m, agora) {
  if (m.status === 'failed') return true
  if (m.status === 'delivered' || m.status === 'read') return false
  return agora - new Date(m.enviado_em).getTime() >= CARENCIA_STATUS
}

function entregueSemLer(m, agora) {
  return m.status === 'delivered' && agora - new Date(m.enviado_em).getTime() >= CARENCIA_STATUS
}

// Parada pela entrega: as 2 últimas não entregues → 'nao_entregue'; as 3
// últimas entregues e não lidas → 'nao_le'. Mensagem com menos de 24 h ainda
// pode receber o aviso da Meta e não conta. mensagens: [{ numero, status,
// enviado_em }].
export function paradaPelaEntrega(mensagens, agora = new Date()) {
  const ordem = [...(mensagens || [])].sort((a, b) => a.numero - b.numero)
  const t = new Date(agora).getTime()
  const ultimas = (n) => ordem.slice(-n)
  if (ordem.length >= 2 && ultimas(2).every((m) => naoEntregue(m, t))) return 'nao_entregue'
  if (ordem.length >= 3 && ultimas(3).every((m) => entregueSemLer(m, t))) return 'nao_le'
  return null
}

// Modelo da mensagem `numero`. A 1ª é sempre o lembrete. Da 2ª em diante,
// o da vez no rodízio; se não estiver aprovado, o próximo aprovado; sem
// nenhum aprovado, o lembrete (o que a Meta aprovou para ligar).
export function escolherModelo(numero, aprovados = new Set()) {
  if (numero <= 1) return PRIMEIRO_MODELO
  const inicio = (numero - 2) % RODIZIO.length
  for (let i = 0; i < RODIZIO.length; i += 1) {
    const nome = RODIZIO[(inicio + i) % RODIZIO.length]
    if (aprovados.has(nome)) return nome
  }
  return PRIMEIRO_MODELO
}

// "semanaN" no link do botão: 0 na 1ª (3 h), 1 na 2ª (uma semana)...
export function conteudoDoLink(numero) {
  return `semana${Math.max(0, Number(numero) - 1)}`
}

// Lê a lista de mensagens que a consulta junta numa coluna só:
// "numero|enviado_em|status|status_em|erro" separados por ";".
export function lerMensagens(texto) {
  if (!texto) return []
  return String(texto)
    .split(';')
    .map((parte) => {
      const [numero, enviado, status, statusEm, erro] = parte.split('|')
      return {
        numero: Number(numero),
        enviado_em: deSql(enviado),
        status: status || 'sent',
        status_em: deSql(statusEm),
        erro: erro || null,
      }
    })
    .filter((m) => m.numero >= 1 && m.numero <= TOTAL_MENSAGENS && m.enviado_em)
    .sort((a, b) => a.numero - b.numero)
}

// Trecho de SQL que monta essa coluna a partir de lembretes_enviados.
export const SQL_MENSAGENS = `group_concat(
  l.etapa || '|' || l.enviado_em || '|' || COALESCE(l.wa_status, '') || '|' ||
  COALESCE(l.wa_status_em, '') || '|' || COALESCE(l.wa_erro, ''), ';')`

// Em que ponto está a sequência de uma pessoa, para a gestão: quantas saíram,
// qual é a próxima e quando (já com o horário e o dia de e-mail), ou por que
// parou. Compra e descadastro valem mesmo antes de a rodada encerrar; a
// parada pela entrega também (a rodada só confirma na vez da próxima).
export function resumoDaSequencia(
  { etapa = 0, proximoEm = null, motivo = null, mensagens = [], comprou = false, descadastrado = false, diasComEmail = [] },
  agora = new Date()
) {
  const enviadas = Math.max(Number(etapa) || 0, mensagens.length)
  let parou = motivo || null
  if (!parou && comprou) parou = 'comprou'
  if (!parou && descadastrado) parou = 'descadastro'
  if (!parou && enviadas > 0) parou = paradaPelaEntrega(mensagens, agora)
  if (!parou && enviadas >= TOTAL_MENSAGENS) parou = 'fim'
  if (parou || !proximoEm) return { enviadas, proximo_numero: null, proximo_em: null, motivo: parou }
  const vez = new Date(Math.max(new Date(proximoEm).getTime(), new Date(agora).getTime()))
  return { enviadas, proximo_numero: enviadas + 1, proximo_em: ajustarHorario(vez, diasComEmail), motivo: null }
}
