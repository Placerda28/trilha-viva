// Regras puras das telas Afiliados, Metas e Configurações da Gestão (sem React,
// testadas em tests/gestao/afiliados-gestao-util.test.mjs). Dinheiro só é
// formatado ou lido de campo aqui: o servidor manda e recebe centavos, e a
// conta de verdade (comissão, nível, projeção) nunca é feita no navegador.
// As validações repetem as do servidor só como ajuda: quem decide é ele.

import { reaisSinal } from '../../../lib/afiliados-painel.js'

export const POR_PAGINA = 25

export const STATUS = { pendente: 'Pendente', ativo: 'Ativo', suspenso: 'Suspenso' }

export const FILTROS_VAZIOS = { q: '', status: '', nivel: '', vendeu: '', saldo: false, saque: false, perto: false, ordem: '', dir: '', mes: '' }

export const ORDENS = [
  { id: 'vendas', rotulo: 'Vendas no mês' },
  { id: 'nome', rotulo: 'Nome' },
  { id: 'codigo', rotulo: 'Código' },
  { id: 'status', rotulo: 'Status' },
  { id: 'nivel', rotulo: 'Nível' },
  { id: 'faltam', rotulo: 'Faltam para subir' },
  { id: 'cliques', rotulo: 'Cliques (30 dias)' },
  { id: 'conversao', rotulo: 'Conversão' },
  { id: 'receita', rotulo: 'Receita gerada' },
  { id: 'comissao', rotulo: 'Comissão prevista' },
  { id: 'estornos', rotulo: 'Estornos' },
  { id: 'disponivel', rotulo: 'Disponível' },
  { id: 'pago', rotulo: 'Total pago' },
  { id: 'ultima_venda', rotulo: 'Última venda' },
  { id: 'criado_em', rotulo: 'Cadastro' },
]

// Só vai para o endereço o que foi escolhido; o servidor assume o padrão do resto.
export function consultaDaLista(f, pagina = 1) {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  for (const k of ['status', 'nivel', 'vendeu', 'ordem', 'dir', 'mes']) if (f[k]) p.set(k, f[k])
  for (const k of ['saldo', 'saque', 'perto']) if (f[k]) p.set(k, '1')
  if (pagina > 1) p.set('pagina', String(pagina))
  return p.toString()
}

// Quantos filtros do painel estão ligados (as abas de status e a busca ficam fora).
export function filtrosAtivos(f) {
  return ['nivel', 'vendeu'].filter((k) => f[k]).length + ['saldo', 'saque', 'perto'].filter((k) => f[k]).length
}

// Posição do nível na tabela (1 = o mais baixo): vira o número de chevrons da medalha.
export function grauDoNivel(nivel, niveis) {
  if (!nivel) return 0
  const ordem = [...(niveis || [])].sort((a, b) => a.vendas_minimas - b.vendas_minimas)
  const i = ordem.findIndex((n) => n.id === nivel.id)
  return i < 0 ? 1 : i + 1
}

// "faltam 2 vendas para o Prata" / "no nível máximo" / "sem nível".
export function textoFaltam(item) {
  if (!item.proximo) return item.nivel ? 'No nível máximo' : '—'
  const n = Number(item.faltam) || 0
  return `${n} ${n === 1 ? 'venda' : 'vendas'} para o ${item.proximo}`
}

// ---- dinheiro em campo de texto ---------------------------------------------
// "89,90" / "1.234,5" / "50" -> centavos inteiros; null se não for um valor.
// Lê o texto dígito a dígito, sem conta com decimais.
export function reaisParaCentavos(texto) {
  const t = String(texto ?? '').trim().replace(/^R\$\s*/, '')
  if (!/^\d{1,3}(\.\d{3})*(,\d{0,2})?$|^\d+(,\d{0,2})?$/.test(t)) return null
  const [inteiro, resto = ''] = t.split(',')
  return Number(inteiro.replace(/\./g, '')) * 100 + Number(resto.padEnd(2, '0'))
}

// 8990 -> "89,90"; 5000 -> "50" (para preencher o campo de edição).
export function centavosParaCampo(centavos) {
  const c = Math.max(0, Math.round(Number(centavos) || 0))
  const resto = c % 100
  return String(Math.floor(c / 100)) + (resto ? ',' + String(resto).padStart(2, '0') : '')
}

// ---- datas e meses ----------------------------------------------------------
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/

export function mesSeguinte(mes) {
  const [a, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 7)
}

// '2026-12' -> 'dezembro de 2026'
export function mesPorExtenso(mes) {
  const [a, m] = String(mes || '').split('-')
  return MESES[Number(m) - 1] ? `${MESES[Number(m) - 1]} de ${a}` : ''
}

// '2026-10' -> 'outubro' (só o nome, para frases como "Rodar fechamento de outubro").
export function nomeDoMesMinusculo(mes) {
  return MESES[Number(String(mes || '').split('-')[1]) - 1] || ''
}

const DIA_MES_BR = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })

// Instante ISO (UTC) -> 'DD/MM' em Brasília.
export function diaMesBrasilia(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : DIA_MES_BR.format(d)
}

// Texto do selo de status de um mês fechado.
export function textoFechamento(f) {
  if (f.status === 'rodado') return f.rodou_em ? `Rodado em ${diaMesBrasilia(f.rodou_em)}` : 'Sem vendas'
  if (f.status === 'parcial') return `Parcial: faltam ${f.faltam}`
  return f.liberado ? 'Pendente' : 'Ainda não liberado'
}

// ---- tabela de níveis (mesmas regras do servidor) ---------------------------
export const NIVEIS_MAX = 10
export const COR_VALIDA = /^#[0-9a-fA-F]{6}$/

// `linhas`: [{ nome, vendas, valor, cor }] com os textos dos campos.
// Devolve { erros: [{ nome?, vendas?, valor?, cor? }], niveis } e `niveis` só vem
// preenchido (centavos e inteiros) quando não há erro nenhum.
export function validarNiveis(linhas) {
  const erros = linhas.map(() => ({}))
  if (linhas.length < 1) return { erros, geral: 'Coloque pelo menos um nível.', niveis: null }
  if (linhas.length > NIVEIS_MAX) return { erros, geral: `No máximo ${NIVEIS_MAX} níveis.`, niveis: null }
  const lidas = linhas.map((l) => ({
    nome: String(l.nome || '').trim(),
    vendas: /^\d+$/.test(String(l.vendas).trim()) ? Number(l.vendas) : null,
    valor: reaisParaCentavos(l.valor),
    cor: String(l.cor || '').trim(),
  }))
  const vistos = new Set()
  lidas.forEach((l, i) => {
    const antes = lidas[i - 1]
    if (!l.nome || l.nome.length > 30) erros[i].nome = 'De 1 a 30 letras.'
    else if (vistos.has(l.nome.toLowerCase())) erros[i].nome = 'Nome repetido.'
    vistos.add(l.nome.toLowerCase())
    if (l.vendas === null || l.vendas < 1 || l.vendas > 100000) erros[i].vendas = 'De 1 a 100.000.'
    else if (antes?.vendas != null && l.vendas <= antes.vendas) erros[i].vendas = 'Maior que a do nível de cima.'
    if (l.valor === null || l.valor < 1 || l.valor > 1000000) erros[i].valor = 'De R$ 0,01 a R$ 10.000.'
    else if (antes?.valor != null && l.valor <= antes.valor) erros[i].valor = 'Maior que o do nível de cima.'
    if (l.cor && !COR_VALIDA.test(l.cor)) erros[i].cor = 'Use #RRGGBB.'
  })
  if (erros.some((e) => Object.keys(e).length)) return { erros, geral: '', niveis: null }
  const niveis = lidas.map((l) => ({ nome: l.nome, vendas_minimas: l.vendas, valor_por_venda_centavos: l.valor, ...(l.cor ? { cor: l.cor } : {}) }))
  return { erros, geral: '', niveis }
}

// ---- configurações ----------------------------------------------------------
export const LIMITES_CONFIG = {
  dia_fechamento: [1, 28],
}
export const SAQUE_MINIMO_MAX = 1000000

// `campos`: textos dos campos (saque mínimo em reais). Devolve { erros, valores }.
export function validarConfig(campos) {
  const erros = {}
  const valores = {}
  for (const [k, [min, max]] of Object.entries(LIMITES_CONFIG)) {
    const t = String(campos[k] ?? '').trim()
    if (!/^\d+$/.test(t) || Number(t) < min || Number(t) > max) erros[k] = `Um número de ${min} a ${max}.`
    else valores[k] = Number(t)
  }
  const saque = reaisParaCentavos(campos.saque_minimo)
  if (saque === null || saque > SAQUE_MINIMO_MAX) erros.saque_minimo_centavos = 'De R$ 0 a R$ 10.000.'
  else valores.saque_minimo_centavos = saque
  valores.aprovacao_automatica = Boolean(campos.aprovacao_automatica)
  valores.programa_aberto = Boolean(campos.programa_aberto)
  return { erros, valores: Object.keys(erros).length ? null : valores }
}

// ---- ações da ficha ---------------------------------------------------------
export const AJUSTE_MAX = 10000000
export const CODIGO_VALIDO = /^[A-Z0-9]{4,15}$/

export const limparCodigo = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15)

// Quais botões aparecem na ficha. `master` vem do papel de quem está na tela.
export function acoesDisponiveis(status, master) {
  const lista = []
  if (status === 'pendente') lista.push('aprovar')
  if (master) {
    if (status !== 'suspenso') lista.push('suspender')
    else lista.push('reativar')
    lista.push('travar_nivel', 'trocar_codigo', 'ajuste')
  }
  lista.push('anotar')
  return lista
}

// A mensagem do 403 para o membro que tentou mesmo assim.
export const MSG_SO_MASTER = 'Só o Administrador Master pode fazer esta ação.'

const PERCENTUAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
// 12.5 -> "12,5%"; sem valor (null) -> "—".
export const percentual = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? '—' : PERCENTUAL.format(Number(n)) + '%')

// Sentido padrão de cada coluna quando a pessoa ainda não escolheu.
export const dirPadrao = (ordem) => (ordem === 'nome' || ordem === 'codigo' ? 'asc' : 'desc')

// ---- extrato e saques na ficha ----------------------------------------------
export const TIPO_LANCAMENTO = { venda: 'Comissão de venda', bonus_nivel: 'Bônus de nível', ajuste: 'Ajuste manual', estorno: 'Estorno de venda' }

// Lançamento pendente já liberado é "Disponível"; antes disso, "Libera em DD/MM".
export function situacaoLancamento(l, agora = new Date()) {
  if (l.status === 'cancelada') return 'Cancelado'
  if (l.status === 'paga') return 'Pago'
  if (l.status === 'em_saque') return 'Em saque'
  return l.disponivel_em && new Date(l.disponivel_em) > agora ? `Libera em ${diaMesBrasilia(l.disponivel_em)}` : 'Disponível'
}

export const SITUACAO_SAQUE = { solicitado: 'Esperando pagamento', pago: 'Pago', recusado: 'Recusado' }

// O detalhe curto de uma ação do histórico (motivo, valor, nomes), sem inventar nada.
export function detalheDaAcao(acao, d) {
  if (!d || typeof d !== 'object') return ''
  if (acao === 'afiliado_ajuste' && typeof d.valor_centavos === 'number') return `${reaisSinal(d.valor_centavos)}. Motivo: ${d.motivo || '—'}`
  if (d.motivo) return `Motivo: ${d.motivo}`
  if (acao === 'afiliado_nivel_travado') return `De ${d.de || 'sem trava'} para ${d.para || 'sem trava'}`
  if (acao === 'afiliado_codigo_trocado') return `De ${d.de} para ${d.para}`
  if (acao === 'afiliado_dado_revelado') return d.campo === 'pix' ? 'Chave Pix' : 'CPF'
  return ''
}
