// Peças do painel do afiliado que não dependem do Next nem do banco (para testar
// sem navegador). Roda no navegador. Aqui só se FORMATA e se escolhe texto: todo
// valor em dinheiro, nível e ritmo vem pronto do servidor (dadosDoPainel).
import { reais } from './afiliados-campos.js'
import { mesAnterior } from './afiliados/datas.js'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const BRASILIA_MS = 3 * 3600000

// ---- datas ----------------------------------------------------------------
// 'AAAA-MM-DD' é dia do calendário e fica como está. 'AAAA-MM-DD HH:MM:SS' é UTC
// (como vem do D1) e passa para o dia de Brasília.
function partesDoDia(valor) {
  const t = String(valor || '').trim()
  if (!t) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return { a: t.slice(0, 4), m: t.slice(5, 7), d: t.slice(8, 10) }
  const data = new Date(t.replace(' ', 'T') + (/[zZ]|[+-]\d{2}:?\d{2}$/.test(t) ? '' : 'Z'))
  if (Number.isNaN(data.getTime())) return null
  const iso = new Date(data.getTime() - BRASILIA_MS).toISOString()
  return { a: iso.slice(0, 4), m: iso.slice(5, 7), d: iso.slice(8, 10) }
}

export function diaMes(valor) {
  const p = partesDoDia(valor)
  return p ? `${p.d}/${p.m}` : ''
}

export function dataBr(valor) {
  const p = partesDoDia(valor)
  return p ? `${p.d}/${p.m}/${p.a}` : ''
}

// '2026-11' -> 'Novembro/2026'
export function rotuloMes(mes) {
  const [a, m] = String(mes || '').split('-')
  const nome = MESES[Number(m) - 1]
  return nome ? `${nome}/${a}` : ''
}

// '2026-10' -> 'Out/26'
export function rotuloMesCurto(mes) {
  const [a, m] = String(mes || '').split('-')
  const nome = MESES[Number(m) - 1]
  return nome ? `${nome.slice(0, 3)}/${a.slice(2)}` : ''
}

export function nomeDoMes(mes) {
  return MESES[Number(String(mes || '').split('-')[1]) - 1] || ''
}

// Os `n` meses mais recentes até `mesAtual`, do mais novo para o mais velho.
export function mesesParaFiltro(mesAtual, n = 12) {
  const lista = []
  let m = mesAtual
  for (let i = 0; i < n; i += 1) {
    lista.push(m)
    m = mesAnterior(m)
  }
  return lista
}

// ---- dinheiro (só formato) --------------------------------------------------
export function reaisSinal(centavos) {
  const c = Math.round(Number(centavos) || 0)
  if (c === 0) return reais(0)
  return (c < 0 ? '−' : '+') + reais(Math.abs(c))
}

export function vendasTxt(n) {
  return `${n} ${n === 1 ? 'venda' : 'vendas'}`
}

// ---- cor de metal -----------------------------------------------------------
function rgb(hex) {
  const h = String(hex || '').replace('#', '')
  const c = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return [138, 138, 138]
  return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16))
}
const hex2 = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
function misturar(hex, alvo, t) {
  const a = rgb(hex)
  const b = rgb(alvo)
  return '#' + a.map((v, i) => hex2(v + (b[i] - v) * t)).join('')
}
export function luminancia(hex) {
  const f = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = rgb(hex).map(f)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// Degradê de metal a partir de `nivel.cor`: sombra, base, faixa de brilho. A cor
// do traço (os chevrons) é a de maior contraste sobre a base e o brilho.
export function corMetal(cor) {
  const base = /^#[0-9a-fA-F]{6}$/.test(cor || '') ? cor : '#8A8A8A'
  const claro = misturar(base, '#ffffff', 0.4)
  const brilho = misturar(base, '#ffffff', 0.72)
  const escuro = misturar(base, '#000000', 0.32)
  const pior = (c) => Math.min(contraste(c, base), contraste(c, brilho), contraste(c, claro))
  const texto = pior('#0D0D0D') >= pior('#ffffff') ? '#0D0D0D' : '#ffffff'
  return { base, claro, brilho, escuro, texto }
}

// ---- barra de progresso -----------------------------------------------------
// Escala de 0 até a meta mais alta. Não é dinheiro: só a posição de cada marco.
export function posicoesDaBarra(niveis, vendas) {
  const lista = [...(niveis || [])].sort((a, b) => a.vendas_minimas - b.vendas_minimas)
  const max = lista.length ? lista[lista.length - 1].vendas_minimas : 1
  const pct = (v) => Math.max(0, Math.min(100, (v / max) * 100))
  return {
    max,
    atual: pct(vendas),
    marcos: lista.map((n) => ({ nome: n.nome, vendas: n.vendas_minimas, pct: pct(n.vendas_minimas), cor: n.cor })),
  }
}

// Alinhamento do rótulo para não sair da barra nas pontas.
export function alinhamento(pct) {
  if (pct < 10) return 'inicio'
  if (pct > 90) return 'fim'
  return 'meio'
}

export function textoRitmo(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return ''
  if (v < 1) return `1 venda a cada ${Math.max(2, Math.round(1 / v))} dias`
  const t = Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toString().replace('.', ',')
  return `${t} ${v <= 1 ? 'venda' : 'vendas'} por dia`
}

export function textoDias(n) {
  const d = Number(n) || 0
  if (d <= 0) return 'Último dia do mês'
  return d === 1 ? 'Falta 1 dia' : `Faltam ${d} dias`
}

// ---- gráfico ----------------------------------------------------------------
// Um item por dia do mês (os dias sem venda entram com 0).
export function serieDoMes(mes, vendasPorDia) {
  const [a, m] = String(mes).split('-').map(Number)
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate()
  const por = new Map((vendasPorDia || []).map((x) => [Number(String(x.dia).slice(8, 10)), Number(x.vendas) || 0]))
  return Array.from({ length: dias }, (_, i) => ({ dia: i + 1, vendas: por.get(i + 1) || 0 }))
}

export function resumoGrafico(serie, nomeMes) {
  const total = serie.reduce((s, x) => s + x.vendas, 0)
  if (total === 0) return { total, melhor: null, texto: `Nenhuma venda registrada em ${nomeMes} até agora.` }
  const melhor = serie.reduce((m, x) => (x.vendas > m.vendas ? x : m), serie[0])
  return {
    total,
    melhor,
    texto: `${vendasTxt(total)} em ${nomeMes}. Melhor dia: ${melhor.dia}, com ${vendasTxt(melhor.vendas)}.`,
  }
}

// ---- situação das vendas e dos saques ---------------------------------------
export function situacaoVenda(item) {
  const em = item?.situacaoEm
  switch (item?.situacao) {
    case 'liberando':
      return { chave: 'liberando', texto: em ? `Liberando em ${diaMes(em)}` : 'Liberando' }
    case 'disponivel':
      return { chave: 'disponivel', texto: 'Disponível' }
    case 'em_saque':
      return { chave: 'em_saque', texto: 'Em saque' }
    case 'paga':
      return { chave: 'paga', texto: em ? `Paga em ${diaMes(em)}` : 'Paga' }
    case 'cancelada':
      return { chave: 'cancelada', texto: 'Cancelada (reembolso)' }
    default:
      return { chave: 'paga', texto: '' }
  }
}

export const TIPOS_PIX = [
  { valor: 'cpf', nome: 'CPF', exemplo: '000.000.000-00' },
  { valor: 'email', nome: 'E-mail', exemplo: 'voce@exemplo.com' },
  { valor: 'telefone', nome: 'Celular', exemplo: '(11) 90000-0000' },
  { valor: 'aleatoria', nome: 'Chave aleatória', exemplo: 'Cole a chave aqui' },
]

export function nomeTipoPix(valor) {
  return TIPOS_PIX.find((t) => t.valor === valor)?.nome || ''
}

// Só aceita caminho do próprio site (aviso vindo do servidor, mas o link é texto).
export function linkInterno(valor) {
  const v = String(valor || '').trim()
  return v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') ? v : ''
}

// Há alguma coisa para mostrar além das boas-vindas?
export function painelVazio(d) {
  return (
    !d?.vendasValidas &&
    !(d?.ultimasVendas || []).length &&
    !d?.cartoes?.jaRecebido &&
    !d?.cartoes?.liberando &&
    !d?.cartoes?.disponivel &&
    !d?.mesPassado
  )
}
