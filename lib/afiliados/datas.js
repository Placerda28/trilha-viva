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

// 'AAAA-MM-DD' do dia de Brasília (Date ou texto UTC).
export function diaDe(valor) {
  const data = valor instanceof Date ? valor : dataDeTexto(valor)
  return new Date(data.getTime() - BRASILIA_MS).toISOString().slice(0, 10)
}

// Marcador de "só depois do fechamento do mês": disponivel_em dos lançamentos de venda enquanto o
// mês do afiliado não fecha. fecharMes troca por fechado_em, no mesmo batch do fechamento. Fica no
// futuro distante de propósito (e não na data prevista do fechamento): fechamento atrasado ou dia de
// fechamento alterado nunca liberam dinheiro de mês aberto.
export const ATE_FECHAR = '9999-12-31 23:59:59'

// 'AAAA-MM-DD' (Brasília) do dia em que o mês `mes` fecha: o `dia` do mês seguinte.
export function diaDoFechamento(mes, dia) {
  return `${mesSeguinte(mes)}-${String(dia).padStart(2, '0')}`
}

// Primeiro instante do mês `mes` de Brasília, em texto UTC.
export function inicioDoMesBr(mes) {
  return `${mes}-01 03:00:00`
}

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const nomeDoMesCurto = (mes) => NOMES_MES[Number(mes.slice(5, 7)) - 1]

// 'AAAA-MM-DD' -> 'DD/MM'.
export const diaMesDe = (dia) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

// Ciclo de saque: vai do `dia` (dia_fechamento) de um mês até o dia anterior do mês seguinte, em Brasília.
// Devolve { inicio, proximo } em 'AAAA-MM-DD' (início do ciclo em que `valor` está e início do seguinte).
export function cicloDe(valor, dia) {
  const local = new Date((valor instanceof Date ? valor : dataDeTexto(valor)).getTime() - BRASILIA_MS)
  const mes = local.toISOString().slice(0, 7)
  const inicioMes = local.getUTCDate() >= dia ? mes : mesAnterior(mes)
  return { inicio: diaDoFechamento(mesAnterior(inicioMes), dia), proximo: diaDoFechamento(inicioMes, dia) }
}
