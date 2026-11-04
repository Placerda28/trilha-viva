// Datas do programa de afiliados. No D1 tudo é UTC ('AAAA-MM-DD HH:MM:SS');
// o mês do negócio ('AAAA-MM') é o do calendário de Brasília (UTC-3, sem horário de verão).
const BRASILIA_MS = 3 * 3600000
const DIA_MS = 86400000

export function textoUtc(data) {
  return data.toISOString().slice(0, 19).replace('T', ' ')
}

export function dataDeTexto(texto) {
  const t = String(texto || '').trim().replace(' ', 'T')
  return new Date(t.endsWith('Z') ? t : `${t}Z`)
}

// Aceita Date ou texto UTC. Devolve o mês de Brasília, ex.: '2026-11'.
export function mesDe(valor) {
  const data = valor instanceof Date ? valor : dataDeTexto(valor)
  return new Date(data.getTime() - BRASILIA_MS).toISOString().slice(0, 7)
}

export function mesAnterior(mes) {
  const [ano, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(ano, m - 2, 1)).toISOString().slice(0, 7)
}

export function somarDias(valor, dias) {
  const data = valor instanceof Date ? valor : dataDeTexto(valor)
  return new Date(data.getTime() + dias * DIA_MS)
}

// Mês que já pode ser fechado em `agora`: o anterior, a partir do dia de fechamento (Brasília).
export function mesParaFechar(agora, diaFechamento) {
  const local = new Date(agora.getTime() - BRASILIA_MS)
  const dia = local.getUTCDate()
  const atual = local.toISOString().slice(0, 7)
  return dia >= diaFechamento ? mesAnterior(atual) : mesAnterior(mesAnterior(atual))
}

// 'AAAA-MM-DD HH:MM:SS' UTC -> 'DD/MM' em Brasília, para as mensagens.
export function diaMesBr(valor) {
  const data = valor instanceof Date ? valor : dataDeTexto(valor)
  const iso = new Date(data.getTime() - BRASILIA_MS).toISOString()
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

export function mesSeguinte(mes) {
  const [ano, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(ano, m, 1)).toISOString().slice(0, 7)
}
