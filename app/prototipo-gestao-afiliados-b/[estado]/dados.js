// PROTÓTIPO TEMPORÁRIO (Fase 8B de afiliados, frontend): afiliados falsos no
// formato do contrato do backend. Nomes, e-mails e números são inventados.
// Apagar junto com a pasta do protótipo.

export const NIVEIS = [
  { id: 1, nome: 'Bronze', vendas_minimas: 1, valor_por_venda_centavos: 1500, cor: '#b45309' },
  { id: 2, nome: 'Prata', vendas_minimas: 20, valor_por_venda_centavos: 2000, cor: '#94a3b8' },
  { id: 3, nome: 'Ouro', vendas_minimas: 50, valor_por_venda_centavos: 3000, cor: '#eab308' },
]

const NOMES = [
  ['Pedro Henrique Alves', 'PEDRO88', 'ativo', 23, 0], ['João da Silva Santos', 'JOAO27', 'ativo', 52, 1], ['Maria Oliveira Lima', 'MARIA10', 'ativo', 6, 0],
  ['Ana Paula Ferreira', 'ANAP21', 'ativo', 19, 1], ['Lucas Martins', 'LUCAS5', 'suspenso', 0, 0], ['Rafaela Costa', 'RAFA77', 'pendente', 0, 0],
  ['Gabriel Nogueira', 'GABN12', 'ativo', 31, 0], ['Beatriz Camargo', 'BEACAM', 'ativo', 0, 0], ['Tiago Mendes', 'TIAGO30', 'ativo', 11, 0],
  ['Camila Rocha', 'CAMI44', 'pendente', 0, 0], ['Daniel Pires', 'DANPIR', 'ativo', 2, 0], ['Larissa Duarte', 'LARIDU', 'ativo', 48, 1],
]
const SOBRENOMES = ['Teixeira', 'Barbosa', 'Moraes', 'Freitas', 'Cardoso', 'Ribeiro', 'Araújo', 'Batista']
const PRIMEIROS = ['Felipe', 'Mariana', 'Vitor', 'Júlia', 'Renato', 'Sofia', 'Caio', 'Elisa', 'Bruno', 'Priscila', 'Marcos', 'Letícia', 'Hugo', 'Débora', 'Igor', 'Natália']

export const nivelDe = (v) => (v >= 50 ? NIVEIS[2] : v >= 20 ? NIVEIS[1] : v >= 1 ? NIVEIS[0] : null)
const proximoDe = (v) => NIVEIS.find((n) => n.vendas_minimas > v) || null

function item(raw, i) {
  const [nome, codigo, status, v, saque] = raw
  const nivel = nivelDe(v)
  const prox = proximoDe(v)
  const cliques = status === 'pendente' ? 0 : 40 + ((i * 37) % 260)
  const vendas30 = status === 'pendente' ? 0 : Math.min(v + 2, cliques)
  const comissao = v * (nivel ? nivel.valor_por_venda_centavos : 0)
  return {
    id: i + 1,
    nome,
    codigo,
    email: nome.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(/ /g, '.') + '@exemplo.com',
    status,
    nivel: nivel && { id: nivel.id, nome: nivel.nome, cor: nivel.cor },
    nivel_travado: false,
    vendas_mes: v,
    faltam: prox ? prox.vendas_minimas - v : 0,
    proximo: prox ? prox.nome : null,
    cliques_30d: cliques,
    vendas_30d: vendas30,
    conversao_pct: cliques ? Math.round((vendas30 / cliques) * 1000) / 10 : null,
    receita_centavos: v * 8990,
    comissao_prevista_centavos: comissao,
    estornos: v > 20 ? 1 : 0,
    disponivel_centavos: status === 'ativo' ? 3000 + ((i * 1700) % 40000) : 0,
    total_pago_centavos: status === 'pendente' ? 0 : (i * 9500) % 90000,
    ultima_venda: v > 0 ? `2026-11-0${(i % 4) + 1}T15:20:00Z` : null,
    saque_pendente: Boolean(saque),
    criado_em: `2026-0${(i % 8) + 1}-1${i % 9}T12:00:00Z`,
  }
}

export function todosOsAfiliados() {
  const extras = Array.from({ length: 16 }, (_, k) => {
    const v = (k * 7) % 25
    return [`${PRIMEIROS[k]} ${SOBRENOMES[k % SOBRENOMES.length]}`, `AFIL${100 + k}`, k % 9 === 8 ? 'suspenso' : 'ativo', v, 0]
  })
  return [...NOMES, ...extras].map(item)
}

// A ficha no formato de GET /ficha. `dados` é o item da lista.
export function fichaDe(it, config = { carencia_dias: 15, dia_fechamento: 8 }) {
  const v = it.vendas_mes
  const nivel = nivelDe(v)
  const prox = proximoDe(v)
  const garantido = v * 1500
  const total = it.comissao_prevista_centavos
  const venda = (n, dia, situacao, em) => ({
    compraId: 900 + n, data: `2026-11-0${dia}T14:00:00Z`, comprador: ['jo***@gmail.com', 'ma***@hotmail.com', 'pa***@exemplo.com'][n % 3],
    valorPagoCentavos: 8990, comissaoCentavos: nivel ? nivel.valor_por_venda_centavos : 1500, situacao, situacaoEm: em,
  })
  return {
    ok: true,
    afiliado: {
      id: it.id, codigo: it.codigo, codigos_antigos: it.id === 2 ? [{ codigo: 'JOAOSILVA', trocado_em: '2026-09-12T18:00:00Z', trocado_por: 'paulo@trilhaviva.org' }] : [],
      status: it.status, nome: it.nome, email: it.email, cpf: '***.456.789-**', telefone: '(11) 98888-1234', canal: 'Instagram e igreja',
      avisar_cada_venda: true, termos_aceitos_em: it.criado_em, criado_em: it.criado_em, nivel_travado: null,
      pix: it.status === 'pendente' ? null : { tipo_chave: 'email', chave: 'ma***@exemplo.com', titular_nome: it.nome, titular_cpf: '***.456.789-**', atualizado_em: '2026-10-02T12:00:00Z' },
    },
    painel: {
      mes: '2026-11', diasRestantes: 26, ultimoDiaDoMes: '2026-11-30', nivel: nivel && { ...nivel }, proximo: prox && { ...prox }, faltam: it.faltam,
      vendasValidas: v, niveis: NIVEIS,
      ganhos: { garantido, bonusPrevisto: total - garantido, totalPrevisto: total, bonusCaiEm: `2026-12-${String(config.dia_fechamento).padStart(2, '0')}` },
      seBaterProximo: prox ? { total: prox.vendas_minimas * prox.valor_por_venda_centavos } : null,
      ritmoNecessario: prox ? Math.round((it.faltam / 26) * 10) / 10 : null,
      cartoes: {
        disponivel: it.disponivel_centavos, liberando: 24000, proximaLiberacao: { valor: 3000, em: '2026-11-09' },
        bonusAReceber: { total: total - garantido, partes: total - garantido > 0 ? [{ valor: total - garantido, em: '2026-12-08' }] : [] }, jaRecebido: it.total_pago_centavos,
      },
      saque: it.disponivel_centavos > 0 ? { pode: true, valor: it.disponivel_centavos, motivo: null } : { pode: false, valor: 0, motivo: 'Você ainda não tem saldo disponível.' },
      vendasPorDia: [], mesPassado: null, variacaoPct: null, ultimasVendas: [], avisos: [],
    },
    historico_mensal: [
      { mes: '2026-11', vendasValidas: v, nivel: nivel && { ...nivel }, garantido, bonus: total - garantido, total, situacao: 'em_andamento', fechadoEm: null },
      { mes: '2026-10', vendasValidas: 14, nivel: { ...NIVEIS[0] }, garantido: 21000, bonus: 0, total: 21000, situacao: 'fechado', fechadoEm: '2026-11-08' },
      { mes: '2026-09', vendasValidas: 22, nivel: { ...NIVEIS[1] }, garantido: 33000, bonus: 11000, total: 44000, situacao: 'fechado', fechadoEm: '2026-10-08' },
    ],
    vendas_recentes: [venda(1, 4, 'liberando', '2026-11-19'), venda(2, 3, 'liberando', '2026-11-18'), venda(3, 2, 'disponivel', null), venda(4, 1, 'paga', '2026-11-03'), { ...venda(5, 1, 'cancelada', null), situacaoEm: null }],
    saques: [
      { id: 7, valor_centavos: 24000, status: 'pago', pedido_em: '2026-10-21T13:00:00Z', pago_em: '2026-10-22T19:30:00Z', pago_por: 'paulo@trilhaviva.org', nota: null, pix: { tipo_chave: 'email', chave: 'ma***@exemplo.com' }, comprovante: true },
      { id: 3, valor_centavos: 6000, status: 'recusado', pedido_em: '2026-09-30T13:00:00Z', pago_em: '2026-10-01T12:00:00Z', pago_por: 'paulo@trilhaviva.org', nota: 'Chave Pix com outro titular.', pix: { tipo_chave: 'email', chave: 'ma***@exemplo.com' }, comprovante: false },
    ],
    extrato: [
      { id: 40, tipo: 'venda', mes: '2026-11', valor_centavos: 1500, status: 'pendente', disponivel_em: '2026-11-19T12:00:00Z', compra_id: 901, saque_id: null, descricao: null, criado_em: '2026-11-04T14:00:00Z' },
      { id: 39, tipo: 'ajuste', mes: '2026-10', valor_centavos: -2000, status: 'pendente', disponivel_em: '2026-10-29T12:00:00Z', compra_id: null, saque_id: null, descricao: 'Ajuste: pagamento duplicado em outubro', criado_em: '2026-10-29T12:00:00Z' },
      { id: 31, tipo: 'bonus_nivel', mes: '2026-09', valor_centavos: 11000, status: 'paga', disponivel_em: '2026-10-08T12:00:00Z', compra_id: null, saque_id: 7, descricao: null, criado_em: '2026-10-08T12:00:00Z' },
      { id: 30, tipo: 'estorno', mes: '2026-09', valor_centavos: -2000, status: 'paga', disponivel_em: '2026-10-02T12:00:00Z', compra_id: 880, saque_id: 7, descricao: null, criado_em: '2026-10-02T12:00:00Z' },
    ],
    anotacoes: [{ id: 2, texto: 'Pediu para trocar o código por causa da nova arte do Instagram.\nConfirmei por WhatsApp.', autor: 'paulo@trilhaviva.org', criado_em: '2026-10-25T15:00:00Z' }],
    historico_acoes: [
      { id: 12, quando: '2026-10-29T12:00:00Z', quem: 'paulo@trilhaviva.org', acao: 'afiliado_ajuste', alvo: it.codigo, detalhe: { valor_centavos: -2000, motivo: 'pagamento duplicado em outubro' } },
      { id: 9, quando: '2026-10-22T19:30:00Z', quem: 'paulo@trilhaviva.org', acao: 'afiliado_saque_pago', alvo: it.codigo, detalhe: null },
      { id: 4, quando: '2026-09-12T18:00:00Z', quem: 'paulo@trilhaviva.org', acao: 'afiliado_dado_revelado', alvo: it.codigo, detalhe: { campo: 'pix' } },
    ],
  }
}
