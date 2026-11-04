// Regras puras da tela de Saques dos afiliados (sem React, testadas em
// tests/gestao/saques-afiliados-util.test.mjs). Dinheiro e data só são
// formatados aqui, no navegador: o servidor manda centavos e instantes UTC.

// Pedido esperando há mais dias que isto fica em vermelho.
export const LIMITE_DIAS = 3
export const MOTIVO_MIN = 3
export const MOTIVO_MAX = 500
export const MAX_BYTES = 5 * 1024 * 1024
export const POR_PAGINA_PADRAO = 20

export const MSG_SEM_ARMAZENAMENTO =
  'O armazenamento de comprovantes ainda não está configurado no servidor. Enquanto isso, não dá para anexar o comprovante nem marcar como pago.'

const TIPOS = { 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' }
const EXTENSOES = { pdf: 'PDF', jpg: 'JPG', jpeg: 'JPG', png: 'PNG' }

export const urgente = (dias) => Number(dias) > LIMITE_DIAS

export function textoEspera(dias) {
  const n = Math.max(0, Math.floor(Number(dias) || 0))
  if (n === 0) return 'Pedido de hoje'
  return n === 1 ? 'Esperando há 1 dia' : 'Esperando há ' + n + ' dias'
}

const DECIMAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

// O servidor manda o tempo médio em horas. Até 48 h fica em horas; depois, em dias.
export function tempoMedio(horas) {
  if (horas === null || horas === undefined || Number.isNaN(Number(horas))) return '—'
  const h = Number(horas)
  if (h < 1) return 'menos de 1 hora'
  if (h < 2) return '1 hora'
  if (h < 48) return DECIMAL.format(h) + ' horas'
  return DECIMAL.format(h / 24) + ' dias'
}

export function tamanhoTexto(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB'
  return DECIMAL.format(n / (1024 * 1024)) + ' MB'
}

// 'PDF', 'JPG' ou 'PNG' pelo tipo do navegador, ou pela extensão quando o
// sistema não informa o tipo. '' = não aceito.
export function tipoDoArquivo(arq) {
  if (TIPOS[arq?.type]) return TIPOS[arq.type]
  const ext = String(arq?.name || '').split('.').pop().toLowerCase()
  return !arq?.type && EXTENSOES[ext] ? EXTENSOES[ext] : ''
}

// Conferência só para ajudar: quem decide é o servidor.
export function conferirArquivo(arq) {
  if (!arq) return 'Escolha um arquivo.'
  if (!tipoDoArquivo(arq)) return 'Esse tipo de arquivo não serve. Envie um PDF, JPG ou PNG.'
  if (!arq.size) return 'O arquivo está vazio.'
  if (arq.size > MAX_BYTES) return 'O arquivo tem ' + tamanhoTexto(arq.size) + ' e o limite é 5 MB.'
  return ''
}

// "240,00", para colar no campo de valor do app do banco.
export const valorParaCopiar = (centavos) =>
  ((Number(centavos) || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })

export const ABAS = [
  { id: 'pendentes', rotulo: 'Pendentes' },
  { id: 'pagos', rotulo: 'Pagos' },
  { id: 'recusados', rotulo: 'Recusados' },
  { id: 'todos', rotulo: 'Todos' },
]

export const VAZIO = {
  pendentes: ['Nenhum pedido de saque esperando', 'Quando um afiliado pedir saque, o pedido aparece aqui para você pagar.'],
  pagos: ['Nenhum saque pago ainda', 'Os pagamentos registrados aparecem aqui, com o comprovante.'],
  recusados: ['Nenhum pedido recusado', 'Os pedidos recusados aparecem aqui, com o motivo.'],
  todos: ['Nenhum pedido de saque ainda', 'Quando um afiliado pedir saque, o pedido aparece aqui.'],
}

export const quemPagou = (s) => (s.status === 'pago' ? 'pago' : s.status === 'recusado' ? 'recusado' : 'pendente')

export const ROTULO_ESTADO = { pago: 'Pago', recusado: 'Recusado', pendente: 'Esperando pagamento' }
