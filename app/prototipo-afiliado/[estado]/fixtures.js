// PROTÓTIPO TEMPORÁRIO (Fase 5): dados falsos do painel, no formato do contrato
// do backend. Apagar junto com a pasta do protótipo. Aqui o dinheiro é calculado
// de propósito (é mentira de teste); o painel de verdade só formata o que recebe.
const NIVEIS = [
  { id: 1, nome: 'Bronze', cor: '#b45309', vendas_minimas: 1, valor_por_venda_centavos: 1500 },
  { id: 2, nome: 'Prata', cor: '#94a3b8', vendas_minimas: 20, valor_por_venda_centavos: 2000 },
  { id: 3, nome: 'Ouro', cor: '#eab308', vendas_minimas: 50, valor_por_venda_centavos: 3000 },
]
const pad = (n) => String(n).padStart(2, '0')
const bonus = (valor) => ({ total: valor, partes: valor > 0 ? [{ mes: '2026-11', valor, em: '2026-12-08' }] : [] })
const COMPRADORES = ['jo***@gmail.com', 'ma***@hotmail.com', 'pe***@outlook.com', 'lu***@gmail.com', 'an***@yahoo.com.br', 'ca***@gmail.com']

export const CONFIG = { carenciaDias: 7, diaFechamento: 8, intervaloSaqueDias: 15 }

const PADRAO = [2, 1, 3, 2, 4, 1, 2, 3, 2, 2, 5, 1, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2]

export function painel(variante) {
  const v = variante
  const hoje = v === 'bronze' || v === 'semvalor' ? 4 : 20
  const dias = Array.from({ length: hoje }, (_, i) => PADRAO[i])
  if (v === 'bronze' || v === 'semvalor') dias.splice(0, 4, 1, 0, 2, 0)
  if (v === 'vazio') dias.fill(0)
  if (v === 'ouro') for (let i = 0; i < dias.length; i += 1) dias[i] = Math.round(dias[i] * 1.2)
  let alvo = { bronze: 3, semvalor: 3, vazio: 0, prata: 47, ouro: 56 }[v] ?? 47
  const soma = dias.reduce((s, x) => s + x, 0)
  if (soma !== alvo) dias[dias.length - 1] = Math.max(0, dias[dias.length - 1] + (alvo - soma))
  alvo = dias.reduce((s, x) => s + x, 0)

  const nivel = [...NIVEIS].reverse().find((n) => alvo >= n.vendas_minimas) || null
  const proximo = nivel ? NIVEIS.find((n) => n.vendas_minimas > nivel.vendas_minimas) || null : NIVEIS[0]
  const faltam = proximo ? proximo.vendas_minimas - alvo : 0
  const diasRestantes = 30 - hoje + 1
  const garantido = alvo * 1500
  const total = nivel ? alvo * nivel.valor_por_venda_centavos : 0

  const base = {
    mes: '2026-11',
    diasRestantes,
    ultimoDiaDoMes: '2026-11-30',
    nivel,
    proximo,
    faltam,
    vendasValidas: alvo,
    niveis: NIVEIS,
    ganhos: { garantido, bonusPrevisto: total - garantido, totalPrevisto: total, bonusCaiEm: '2026-12-08' },
    seBaterProximo: proximo ? { total: proximo.vendas_minimas * proximo.valor_por_venda_centavos } : null,
    ritmoNecessario: proximo ? Math.round((faltam / diasRestantes) * 10) / 10 : null,
    cartoes: { disponivel: 24000, liberando: 16500, proximaLiberacao: { valor: 3000, em: '2026-11-21' }, bonusAReceber: bonus(total - garantido), jaRecebido: 90000 },
    saque: { pode: true, valor: 24000, motivo: null },
    vendasPorDia: dias.map((vendas, i) => ({ dia: `2026-11-${pad(i + 1)}`, vendas })),
    mesPassado: { mes: '2026-10', vendas: 18, nivel: NIVEIS[0], total: 27000 },
    variacaoPct: Math.round(((alvo - 18) / 18) * 100),
    ultimasVendas: vendasDe(5, '2026-11-20'),
    avisos: [],
  }
  if (v === 'bronze') {
    Object.assign(base.cartoes, { disponivel: 3000, liberando: 4500, proximaLiberacao: { valor: 1500, em: '2026-11-08' }, jaRecebido: 27000 })
    base.saque = { pode: true, valor: 3000, motivo: null }
    base.ultimasVendas = vendasDe(3, '2026-11-04')
  }
  if (v === 'semvalor') {
    Object.assign(base.cartoes, { disponivel: 0, liberando: 4500, proximaLiberacao: { valor: 1500, em: '2026-11-06' }, jaRecebido: 0 })
    base.mesPassado = null
    base.variacaoPct = null
    base.saque = { pode: false, valor: 0, motivo: 'Ainda não há valor disponível. Sua primeira liberação é em 06/11.' }
  }
  if (v === 'ouro') {
    Object.assign(base.cartoes, { disponivel: 51000, liberando: 33000, bonusAReceber: bonus(total - garantido) })
    base.saque = { pode: true, valor: 51000, motivo: null }
  }
  if (v === 'vazio') {
    Object.assign(base.cartoes, { disponivel: 0, liberando: 0, proximaLiberacao: null, bonusAReceber: bonus(0), jaRecebido: 0 })
    Object.assign(base, { mesPassado: null, variacaoPct: null, ultimasVendas: [] })
    base.saque = { pode: false, valor: 0, motivo: 'Ainda não há valor disponível. Sua primeira liberação é logo depois da primeira venda.' }
  }
  if (v === 'sem15dias') base.saque = { pode: false, valor: 24000, motivo: 'Próximo saque liberado em 6 dias (10/11).' }
  if (v === 'sempix') base.saque = { pode: false, valor: 24000, motivo: 'Cadastre sua chave Pix para sacar.' }
  if (v === 'analise') base.saque = { pode: false, valor: 24000, motivo: 'Você já tem um saque em análise (pedido em 02/11).' }
  if (v === 'avisos') {
    base.avisos = [
      { id: 11, tipo: 'nivel', titulo: 'Você subiu para PRATA!', texto: 'Todas as vendas deste mês agora valem R$ 20.', link: null, criado_em: '2026-11-17 14:00:00' },
      { id: 12, tipo: 'saque_pago', titulo: 'Seu saque de R$ 150 foi pago', texto: 'O Pix já deve estar na sua conta.', link: '/minha-conta/afiliado#saques', criado_em: '2026-11-12 10:00:00' },
      { id: 13, tipo: 'fechamento', titulo: 'Fechamento de outubro: você ganhou R$ 270', texto: null, link: '/minha-conta/afiliado#ganhos', criado_em: '2026-11-08 09:00:00' },
    ]
  }
  return base
}

function vendasDe(n, ate) {
  const sit = [['liberando', '2026-11-27'], ['liberando', '2026-11-26'], ['liberando', '2026-11-24'], ['disponivel', '2026-11-18'], ['cancelada', '2026-11-19']]
  return Array.from({ length: n }, (_, i) => ({
    compraId: 900 - i,
    data: `${ate.slice(0, 8)}${pad(Math.max(1, Number(ate.slice(8)) - i))} 15:${pad(10 + i * 7)}:00`,
    comprador: COMPRADORES[i % COMPRADORES.length],
    valorPagoCentavos: 8990,
    comissaoCentavos: 1500,
    situacao: sit[i % sit.length][0],
    situacaoEm: sit[i % sit.length][1],
  }))
}

export function vendas(variante, mes) {
  if (variante === 'vazio') return { resumo: { total: 0, canceladas: 0, validas: 0 }, itens: [] }
  if (mes !== '2026-11') {
    const itens = [
      { compraId: 701, data: '2026-10-28 12:00:00', comprador: 'jo***@gmail.com', valorPagoCentavos: 8990, comissaoCentavos: 1500, situacao: 'paga', situacaoEm: '2026-11-10' },
      { compraId: 702, data: '2026-10-20 12:00:00', comprador: 'ma***@hotmail.com', valorPagoCentavos: 8990, comissaoCentavos: 1500, situacao: 'paga', situacaoEm: '2026-11-10' },
      { compraId: 703, data: '2026-10-09 12:00:00', comprador: 'pe***@outlook.com', valorPagoCentavos: 8990, comissaoCentavos: 1500, situacao: 'cancelada', situacaoEm: '2026-10-12' },
    ]
    return { resumo: { total: 3, canceladas: 1, validas: 2 }, itens }
  }
  const s = [['liberando', '2026-11-27'], ['liberando', '2026-11-26'], ['disponivel', '2026-11-22'], ['disponivel', '2026-11-20'], ['em_saque', '2026-11-18'], ['paga', '2026-11-12'], ['cancelada', '2026-11-11'], ['paga', '2026-11-09']]
  const itens = s.map(([situacao, situacaoEm], i) => ({
    compraId: 800 - i, data: `2026-11-${pad(20 - i)} 15:${pad(12 + i * 5)}:00`, comprador: COMPRADORES[i % COMPRADORES.length],
    valorPagoCentavos: 8990, comissaoCentavos: 1500, situacao, situacaoEm,
  }))
  return { resumo: { total: 8, canceladas: 1, validas: 7 }, itens }
}

export function ganhos(variante) {
  if (variante === 'vazio') return { historico: [], extrato: [] }
  const p = painel(variante)
  return {
    historico: [
      { mes: '2026-11', vendasValidas: p.vendasValidas, nivel: p.nivel, garantido: p.ganhos.garantido, bonus: p.ganhos.bonusPrevisto, total: p.ganhos.totalPrevisto, situacao: 'em_andamento', fechadoEm: null },
      { mes: '2026-10', vendasValidas: 18, nivel: NIVEIS[0], garantido: 27000, bonus: 0, total: 27000, situacao: 'fechado', fechadoEm: '2026-11-08' },
      { mes: '2026-09', vendasValidas: 22, nivel: NIVEIS[1], garantido: 33000, bonus: 11000, total: 44000, situacao: 'fechado', fechadoEm: '2026-10-08' },
    ],
    extrato: [
      { id: 9, compra_id: 123, tipo: 'venda', mes_referencia: '2026-11', valor_centavos: 1500, status: 'pendente', disponivel_em: '2026-11-27', descricao: 'Venda #123', criado_em: '2026-11-20 15:10:00' },
      { id: 8, compra_id: 98, tipo: 'estorno', mes_referencia: '2026-10', valor_centavos: -1550, status: 'pendente', disponivel_em: null, descricao: 'Ajuste: reembolso do pedido #98', criado_em: '2026-11-11 09:00:00' },
      { id: 7, compra_id: null, tipo: 'bonus_nivel', mes_referencia: '2026-09', valor_centavos: 11000, status: 'paga', disponivel_em: '2026-10-08', descricao: 'Bônus Prata: setembro', criado_em: '2026-10-08 06:00:00' },
      { id: 6, compra_id: 77, tipo: 'venda', mes_referencia: '2026-09', valor_centavos: 1500, status: 'paga', disponivel_em: '2026-10-02', descricao: 'Venda #77', criado_em: '2026-09-25 18:00:00' },
    ],
  }
}

export function saques(variante) {
  const itens = [
    { id: 3, valor_centavos: 15000, status: 'pago', pedido_em: '2026-10-12 12:00:00', pago_em: '2026-10-13 18:30:00', nota: null, temComprovante: false },
    { id: 2, valor_centavos: 4500, status: 'recusado', pedido_em: '2026-09-28 12:00:00', pago_em: null, nota: 'A chave Pix informada não pertence ao CPF cadastrado. Corrija em Dados Pix e peça de novo.', temComprovante: false },
  ]
  if (variante === 'analise') itens.unshift({ id: 4, valor_centavos: 24000, status: 'solicitado', pedido_em: '2026-11-02 12:00:00', pago_em: null, nota: null, temComprovante: false })
  if (variante === 'vazio') return { itens: [], proximoSaqueEm: null }
  return { itens, proximoSaqueEm: variante === 'sem15dias' ? '2026-11-10' : null }
}

export function pix(variante) {
  if (variante === 'sempix' || variante === 'vazio') return { pix: null, bloqueado: false, motivo: null }
  return {
    pix: { tipo_chave: 'email', chave_mascarada: 'jo***@gmail.com', titular_nome: 'João da Silva', titular_cpf_mascarado: '***.982.247-**' },
    bloqueado: variante === 'analise',
    motivo: variante === 'analise' ? 'Você tem um saque em análise. Os dados voltam a poder ser alterados depois do pagamento.' : null,
  }
}
