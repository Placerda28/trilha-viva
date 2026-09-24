// Formatação usada pelas telas de gestão. Os formatadores são criados uma vez
// só, aqui no topo: montar um Intl.* a cada linha da tabela é caro, e o
// custo aparece no celular.

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MOEDA_CURTA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const NUMERO = new Intl.NumberFormat('pt-BR')

// O banco guarda a hora em UTC; quem lê a tela está em Brasília.
const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const DATA_CURTA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function moeda(centavos) {
  return MOEDA.format((Number(centavos) || 0) / 100)
}

export function moedaCurta(centavos) {
  return MOEDA_CURTA.format((Number(centavos) || 0) / 100)
}

export function numero(n) {
  return NUMERO.format(Number(n) || 0)
}

export function dataHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return DATA_HORA.format(d).replace(',', '')
}

// 'AAAA-MM-DD' (um dia, sem hora) para 'DD/MM/AAAA'.
export function diaPorExtenso(dia) {
  const d = new Date(dia + 'T12:00:00Z')
  if (Number.isNaN(d.getTime())) return dia
  return DATA_CURTA.format(d)
}

export const FORMAS = { pix: 'Pix', cartao: 'Cartão', outro: 'Outro' }

// ---- dias de Brasília, como texto 'AAAA-MM-DD' ------------------------------
// Toda a conta é feita em UTC ao meio-dia: assim nenhuma virada de fuso muda
// o dia por engano.

export function hojeBrasilia() {
  return new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
}

export function somarDias(dia, n) {
  const d = new Date(dia + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function diasEntre(de, ate) {
  const a = new Date(de + 'T12:00:00Z').getTime()
  const b = new Date(ate + 'T12:00:00Z').getTime()
  return Math.round((b - a) / 86400000) + 1
}

export const ATALHOS = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: '7d', rotulo: '7 dias' },
  { id: '30d', rotulo: '30 dias' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes-passado', rotulo: 'Mês passado' },
]

export function intervaloDoAtalho(id, hoje = hojeBrasilia()) {
  if (id === 'hoje') return { de: hoje, ate: hoje }
  if (id === '7d') return { de: somarDias(hoje, -6), ate: hoje }
  if (id === '30d') return { de: somarDias(hoje, -29), ate: hoje }
  const inicioDoMes = hoje.slice(0, 8) + '01'
  if (id === 'mes') return { de: inicioDoMes, ate: hoje }
  // Mês passado: do dia 1 até a véspera do dia 1 deste mês.
  const fimPassado = somarDias(inicioDoMes, -1)
  return { de: fimPassado.slice(0, 8) + '01', ate: fimPassado }
}
