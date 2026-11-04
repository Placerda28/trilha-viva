// Auxiliares das telas de afiliados da Gestão (só leitura): meses, variação e dinheiro.
// Sem `@/`. Datas no D1 são UTC; o mês do negócio ('AAAA-MM') é o de Brasília.
import { mesAnterior } from './datas.js'

export const linhas = (r) => (Array.isArray(r?.results) ? r.results : [])
export const num = (v) => Number(v || 0)
export const sqlMesBr = (col) => `substr(datetime(${col}, '-3 hours'), 1, 7)`
export const inicioDoMesUtc = (mes) => `${mes}-01 03:00:00`

// 'AAAA-MM-DD HH:MM:SS' (UTC) -> ISO com Z.
export function isoUtc(valor) {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(String(valor || ''))
  return m ? `${m[1]}T${m[2]}Z` : null
}

// Lista de `quantidade` meses terminando em `ateMes`, do mais antigo ao mais novo.
export function mesesAte(ateMes, quantidade) {
  const lista = []
  let m = ateMes
  for (let i = 0; i < quantidade; i++) {
    lista.unshift(m)
    m = mesAnterior(m)
  }
  return lista
}

// Meses tocados pelo período (de..ate), no máximo `maximo`.
export function mesesDoPeriodo(periodo, { minimo = 1, maximo = 36 } = {}) {
  const [a1, m1] = periodo.de.slice(0, 7).split('-').map(Number)
  const [a2, m2] = periodo.ate.slice(0, 7).split('-').map(Number)
  const tocados = (a2 - a1) * 12 + (m2 - m1) + 1
  return mesesAte(periodo.ate.slice(0, 7), Math.min(maximo, Math.max(minimo, tocados)))
}

// Variação contra o período anterior. pct = null quando não há base de comparação.
export function variacao(atual, anterior) {
  if (atual == null || anterior == null) return { atual: atual ?? null, anterior: anterior ?? null, pct: null }
  let pct = null
  if (anterior !== 0) pct = Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10
  else if (atual === 0) pct = 0
  return { atual, anterior, pct }
}

export function reais(centavos) {
  const n = Math.round(Number(centavos) || 0)
  const abs = Math.abs(n)
  const inteiro = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${n < 0 ? '-' : ''}R$ ${inteiro},${String(abs % 100).padStart(2, '0')}`
}

export const diaMes = (dia) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
