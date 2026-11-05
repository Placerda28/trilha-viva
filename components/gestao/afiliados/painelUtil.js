// Regras puras das telas Dashboard, Financeiro e Alertas de Afiliados (sem
// React, testadas em tests/gestao/painel-afiliados-util.test.mjs). O servidor
// manda tudo calculado: dinheiro em centavos, porcentagem com 1 casa, datas em
// UTC. Aqui só se escolhe o texto e a cor; a conta não é refeita.

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const PERCENTUAL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Cores dos selos de nível: a única cor fora do preto, branco e vermelho (as
// três passaram na conferência de separação de cor; a prata é cinza por
// natureza e por isso o gráfico sempre vem com legenda e tabela).
export const COR_NIVEL = { bronze: '#A0521D', prata: '#9AA1AA', ouro: '#B58900' }
const COR_OUTROS_NIVEIS = ['#0D0D0D', '#5C5C5C', '#8A8A8A', '#C4C6CB']

// Nível por nome (o Paulo pode renomear os níveis); nome desconhecido recebe um cinza fixo pela posição.
export function corDoNivel(nome, posicao = 0) {
  const chave = String(nome || '').trim().toLowerCase()
  return COR_NIVEL[chave] || COR_OUTROS_NIVEIS[posicao % COR_OUTROS_NIVEIS.length]
}

// Bronze, Prata e Ouro primeiro, na ordem da tabela; níveis antigos depois.
export function ordenarNiveis(nomes) {
  const ordem = ['bronze', 'prata', 'ouro']
  const rank = (n) => {
    const i = ordem.indexOf(String(n).toLowerCase())
    return i < 0 ? 99 : i
  }
  return [...nomes].sort((a, b) => rank(a) - rank(b))
}

// 'AAAA-MM' -> 'out/26'
export function mesCurto(mes) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(mes || ''))
  return m ? MESES[Number(m[2]) - 1] + '/' + m[1].slice(2) : String(mes || '')
}

// 'AAAA-MM' -> 'outubro de 2026'
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export function mesLongo(mes) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(mes || ''))
  return m ? MESES_LONGOS[Number(m[2]) - 1] + ' de ' + m[1] : String(mes || '')
}

// 95.3 -> '95,3%'; null -> '—'
export function pctTexto(pct) {
  return pct === null || pct === undefined || Number.isNaN(Number(pct)) ? '—' : PERCENTUAL.format(Number(pct)) + '%'
}

// A variação do servidor vem em % (12.4); o cartão (Kpi) quer fração (0,124). null fica null.
export function fracao(comparacao) {
  return comparacao?.pct === null || comparacao?.pct === undefined ? null : comparacao.pct / 100
}

// A frase do servidor traz o aviso de vendas sem taxa ("Atenção: ...") no fim;
// separado, ele aparece em destaque embaixo da frase.
export function separarAviso(frase) {
  const texto = String(frase || '')
  const i = texto.indexOf(' Atenção:')
  return i < 0 ? { principal: texto, aviso: '' } : { principal: texto.slice(0, i), aviso: texto.slice(i + 1) }
}

// Período longo demais para uma coluna por dia: semanas (mais de 92 dias) e
// depois blocos de 30 dias (mais de 400). Soma `campos` de cada bloco.
export function agruparDias(serie, campos) {
  const passo = serie.length > 400 ? 30 : serie.length > 92 ? 7 : 1
  if (passo === 1) return serie.map((d) => ({ ...d, chave: d.dia, tituloTabela: d.rotulo }))
  const blocos = []
  for (let i = 0; i < serie.length; i += passo) {
    const grupo = serie.slice(i, i + passo)
    const bloco = { chave: grupo[0].dia, rotulo: grupo[0].rotulo }
    for (const c of campos) bloco[c] = grupo.reduce((t, d) => t + (Number(d[c]) || 0), 0)
    bloco.tituloTabela = grupo[0].rotulo + (grupo.length > 1 ? ' a ' + grupo[grupo.length - 1].rotulo : '')
    blocos.push(bloco)
  }
  return blocos
}

export const ROTULO_TIPO = { venda: 'Venda', bonus_nivel: 'Bônus de nível', ajuste: 'Ajuste', estorno: 'Estorno' }
export const ROTULO_STATUS = { pendente: 'Pendente', em_saque: 'Em saque', paga: 'Paga', cancelada: 'Cancelada' }
export const TIPOS_FILTRO = [{ id: '', rotulo: 'Todos os tipos' }, ...Object.entries(ROTULO_TIPO).map(([id, rotulo]) => ({ id, rotulo }))]

// O link do alerta vem do servidor como caminho do painel; só vale o que começa por /gestao/afiliados.
export function linkSeguro(link) {
  return typeof link === 'string' && /^\/gestao\/afiliados(\/|\?|$)/.test(link) ? link : '/gestao/afiliados/alertas'
}

// Texto do botão do link, pelo destino.
export function rotuloDoLink(link) {
  if (/\/saques/.test(link)) return 'Abrir saques'
  if (/\/metas/.test(link)) return 'Abrir fechamentos'
  if (/\/lista/.test(link)) return 'Abrir afiliado'
  return 'Abrir'
}

export const GRAVIDADES = [
  { id: 'alta', rotulo: 'Alta', titulo: 'Gravidade alta' },
  { id: 'media', rotulo: 'Média', titulo: 'Gravidade média' },
  { id: 'baixa', rotulo: 'Baixa', titulo: 'Gravidade baixa' },
]

// A chave do alerta vai no caminho da rota, com os dois-pontos codificados.
export const urlResolver = (chave) => '/api/gestao/afiliados/alertas/' + encodeURIComponent(chave) + '/resolver'

export function resumoGravidades(por) {
  return GRAVIDADES.map((g) => ({ ...g, n: Number(por?.[g.id]) || 0 })).filter((g) => g.n > 0)
}
