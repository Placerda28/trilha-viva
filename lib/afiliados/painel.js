// Dados do painel do afiliado (aba Início, vendas, ganhos). Só leitura.
// Sem `@/`. Todo número vem de statusDoMes/saldosDoAfiliado (única fonte); toda leitura filtra por afiliadoId,
// que quem chama tira da sessão. Nunca devolve e-mail inteiro, nome nem telefone do comprador.
import { configuracao, niveisDoMes } from './niveis.js'
import { SQL_VENDA_VALIDA, SQL_DISPONIVEL_PREVISTO, statusDoMes } from './status.js'
import { conferir } from './saque.js'
import { diaDe, diaDoFechamento, mesAnterior, mesDe } from './datas.js'

const pad = (n) => String(n).padStart(2, '0')

const nivelResumo = (n) =>
  n
    ? { id: n.id, nome: n.nome, cor: n.cor, vendas_minimas: n.vendas_minimas, valor_por_venda_centavos: n.valor_por_venda_centavos }
    : null

// 'jo***@gmail.com'. Local de 1 a 2 letras mostra só a primeira.
export function mascararEmail(email) {
  const [local = '', dominio = ''] = String(email || '').split('@')
  return `${local.slice(0, local.length > 2 ? 2 : 1)}***@${dominio}`
}

// Painel do afiliado: só "conta para a meta", "cancelada" ou "paga em DD/MM". Sem comissão por venda.
function situacaoDaVenda(l) {
  if (l.status === 'cancelada' || l.estorno_em) return ['cancelada', l.estorno_em ? diaDe(l.estorno_em) : null]
  if (l.status === 'paga') return ['paga', l.pago_em ? diaDe(l.pago_em) : null]
  return ['conta', null]
}

// Só a Gestão (contabil: true) enxerga a comissão por venda e a situação de liberação.
function situacaoContabil(l) {
  if (l.status === 'cancelada' || l.estorno_em) return ['cancelada', l.estorno_em ? diaDe(l.estorno_em) : null]
  if (l.status === 'paga') return ['paga', l.pago_em ? diaDe(l.pago_em) : null]
  if (l.status === 'em_saque') return ['em_saque', l.pedido_em ? diaDe(l.pedido_em) : null]
  // Fechamento REAL (linha em afiliados_fechamentos), nunca a data prevista: antes do robô fechar é 'liberando'.
  return [Number(l.fechado) === 1 ? 'disponivel' : 'liberando', diaDe(l.disponivel_previsto)]
}

// mes = null: vendas de qualquer mês (últimas vendas do Início).
export async function buscarVendas(db, afiliadoId, mes, limite, agora, { contabil = false } = {}) {
  const filtroMes = mes ? 'AND l.mes_referencia = ?2' : ''
  const args = mes ? [afiliadoId, mes, limite] : [afiliadoId, limite]
  const lim = mes ? '?3' : '?2'
  const { results } = await db
    .prepare(
      `SELECT l.compra_id, l.criado_em, l.status, ${SQL_DISPONIVEL_PREVISTO('l', agora)} AS disponivel_previsto,
              EXISTS (SELECT 1 FROM afiliados_fechamentos zf WHERE zf.afiliado_id = l.afiliado_id AND zf.mes_referencia = l.mes_referencia) AS fechado, l.valor_centavos AS comissao,
              c.valor_centavos AS pago, cli.email,
              (SELECT e.criado_em FROM afiliados_lancamentos e WHERE e.compra_id = l.compra_id AND e.tipo = 'estorno') AS estorno_em,
              s.pedido_em, s.pago_em
         FROM afiliados_lancamentos l
         JOIN compras c ON c.id = l.compra_id
         JOIN clientes cli ON cli.id = c.cliente_id
         LEFT JOIN afiliados_saques s ON s.id = l.saque_id
        WHERE l.afiliado_id = ?1 AND l.tipo = 'venda' ${filtroMes}
        ORDER BY l.id DESC LIMIT ${lim}`,
    )
    .bind(...args)
    .all()
  return results.map((l) => {
    const [situacao, situacaoEm] = contabil ? situacaoContabil(l) : situacaoDaVenda(l)
    return {
      compraId: Number(l.compra_id),
      data: l.criado_em,
      comprador: mascararEmail(l.email),
      valorPagoCentavos: Number(l.pago || 0),
      ...(contabil ? { comissaoCentavos: Number(l.comissao) } : {}),
      situacao,
      situacaoEm,
    }
  })
}

export async function vendasDoMes(db, afiliadoId, mes, agora = new Date()) {
  const [resumo, itens] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN ${SQL_VENDA_VALIDA} THEN 1 ELSE 0 END), 0) AS validas
           FROM afiliados_lancamentos l WHERE l.afiliado_id = ? AND l.mes_referencia = ? AND l.tipo = 'venda'`,
      )
      .bind(afiliadoId, mes)
      .first(),
    buscarVendas(db, afiliadoId, mes, 200, agora),
  ])
  const total = Number(resumo.total)
  const validas = Number(resumo.validas)
  return { resumo: { total, canceladas: total - validas, validas }, itens }
}

// Data (AAAA-MM-DD, Brasília) em que o afiliado poderá pedir saque, ou null se não há data a esperar
// (já pode, ou o bloqueio é outro: sem Pix, sem saldo). Mesma conferência do botão Sacar.
export async function proximoSaqueEm(db, afiliadoId, agora = new Date()) {
  return (await conferir(db, afiliadoId, agora)).abreEm || null
}

// Histórico mês a mês. Afiliado: mês, vendas válidas, nível, total do mês e situação
// ('em_andamento' | 'disponivel' | 'pago'), com liberaEm (dia em que o mês fecha ou fechou, AAAA-MM-DD).
// contabil: true (Gestão) acrescenta garantido/bônus e usa a situação antiga 'fechado'.
export async function historicoMensal(db, afiliadoId, limite = 12, agora = new Date(), { contabil = false } = {}) {
  const mes = mesDe(agora)
  const [{ results }, cfg, pagos] = await Promise.all([
    db
      .prepare(
        `SELECT mes_referencia, vendas_validas, niveis_snapshot, base_centavos, bonus_centavos, total_centavos, fechado_em
           FROM afiliados_fechamentos WHERE afiliado_id = ? ORDER BY mes_referencia DESC LIMIT ?`,
      )
      .bind(afiliadoId, limite)
      .all(),
    configuracao(db),
    // Mês "pago" = nada de venda ou bônus dele ainda pendente ou em saque, e algo já pago.
    db
      .prepare(
        `SELECT mes_referencia AS mes, SUM(status IN ('pendente', 'em_saque')) AS abertos, SUM(status = 'paga') AS pagos
           FROM afiliados_lancamentos WHERE afiliado_id = ? AND tipo IN ('venda', 'bonus_nivel') GROUP BY mes_referencia LIMIT 60`,
      )
      .bind(afiliadoId)
      .all(),
  ])
  const quitado = new Set(pagos.results.filter((x) => Number(x.abertos) === 0 && Number(x.pagos) > 0).map((x) => x.mes))
  const fechados = results.map((f) => ({
    mes: f.mes_referencia,
    vendasValidas: f.vendas_validas,
    nivel: nivelResumo(JSON.parse(f.niveis_snapshot).nivel),
    total: f.total_centavos,
    situacao: quitado.has(f.mes_referencia) ? 'pago' : 'disponivel',
    liberaEm: diaDe(f.fechado_em),
    ...(contabil ? { garantido: f.base_centavos, bonus: f.bonus_centavos, fechadoEm: diaDe(f.fechado_em) } : {}),
  }))
  const abertos = []
  const anterior = mesAnterior(mes)
  for (const m of [mes, anterior]) {
    if (fechados.some((f) => f.mes === m)) continue
    const s = await statusDoMes(db, afiliadoId, m, agora)
    if (m === anterior && s.vendasValidas === 0) continue
    abertos.push({
      mes: m,
      vendasValidas: s.vendasValidas,
      nivel: nivelResumo(s.nivel),
      total: s.totalPrevisto,
      situacao: 'em_andamento',
      liberaEm: diaDoFechamento(m, cfg.dia_fechamento),
      ...(contabil ? { garantido: s.garantido, bonus: s.bonusPrevisto, fechadoEm: null } : {}),
    })
  }
  const todos = [...abertos, ...fechados].slice(0, limite)
  return contabil ? todos.map((x) => ({ ...x, situacao: x.situacao === 'em_andamento' ? 'em_andamento' : 'fechado' })) : todos
}

async function vendasPorDia(db, afiliadoId, mes, ate) {
  const { results } = await db
    .prepare(
      `SELECT date(l.criado_em, '-3 hours') AS dia, COUNT(*) AS vendas FROM afiliados_lancamentos l
        WHERE l.afiliado_id = ? AND l.mes_referencia = ? AND ${SQL_VENDA_VALIDA} GROUP BY dia LIMIT 40`,
    )
    .bind(afiliadoId, mes)
    .all()
  const porDia = new Map(results.map((r) => [r.dia, Number(r.vendas)]))
  // Dias sem venda entram com 0 (o gráfico não pula dia), do dia 1 até hoje.
  return Array.from({ length: Number(ate.slice(8, 10)) }, (_, i) => {
    const dia = `${mes}-${pad(i + 1)}`
    return { dia, vendas: porDia.get(dia) || 0 }
  })
}

export async function dadosDoPainel(db, afiliadoId, agora = new Date()) {
  const mes = mesDe(agora)
  const anterior = mesAnterior(mes)
  const hoje = diaDe(agora)
  const [ano, m] = mes.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const ultimoDiaDoMes = `${mes}-${pad(ultimoDia)}`
  const diasRestantes = ultimoDia - Number(hoje.slice(8, 10)) + 1 // conta hoje

  const [atual, passado, niveis, cfg, conferencia, dias, ultimasVendas, avisos] = await Promise.all([
    statusDoMes(db, afiliadoId, mes, agora),
    statusDoMes(db, afiliadoId, anterior, agora),
    niveisDoMes(db, mes),
    configuracao(db),
    conferir(db, afiliadoId, agora),
    vendasPorDia(db, afiliadoId, mes, hoje),
    buscarVendas(db, afiliadoId, null, 5, agora),
    db
      .prepare(
        `SELECT id, tipo, titulo, texto, link, criado_em FROM afiliados_avisos
          WHERE afiliado_id = ? AND lido_em IS NULL ORDER BY id DESC LIMIT 5`,
      )
      .bind(afiliadoId)
      .all(),
  ])
  const saldos = atual.saldos

  const proximo = atual.proximo
  const ritmo = proximo && atual.faltam > 0 && diasRestantes > 0 ? Math.round((atual.faltam / diasRestantes) * 10) / 10 : null
  const total = passado.totalPrevisto
  const temPassado = passado.vendasValidas > 0

  return {
    mes,
    diasRestantes,
    ultimoDiaDoMes,
    nivel: nivelResumo(atual.nivel),
    proximo: nivelResumo(proximo),
    faltam: atual.faltam,
    vendasValidas: atual.vendasValidas,
    niveis: niveis.map(nivelResumo),
    // Previsto pela meta atual (vendas válidas x valor do nível atingido). Nada disso é saque: só libera no fechamento.
    aReceber: { mes, valor: atual.totalPrevisto, liberaEm: diaDoFechamento(mes, cfg.dia_fechamento) },
    // Entre o dia 1 e o fechamento: o mês que acabou e ainda não fechou. Depois disso (ou sem vendas), null.
    aReceberMesAnterior:
      !passado.fechado && passado.vendasValidas > 0
        ? { mes: anterior, valor: passado.totalPrevisto, liberaEm: diaDoFechamento(anterior, cfg.dia_fechamento) }
        : null,
    disponivel: saldos.disponivel,
    emSaque: saldos.emSaque,
    jaRecebido: saldos.jaRecebido,
    saque: { pode: !conferencia.motivo, valor: saldos.disponivel, motivo: conferencia.motivo, abreEm: conferencia.abreEm || null },
    seBaterProximo: proximo ? { total: proximo.vendas_minimas * proximo.valor_por_venda_centavos } : null,
    ritmoNecessario: ritmo,
    vendasPorDia: dias,
    mesPassado: temPassado
      ? { mes: anterior, vendas: passado.vendasValidas, nivel: nivelResumo(passado.nivel), total }
      : null,
    // Variação das vendas válidas contra o mês passado (inteiro, em %). null sem mês passado.
    variacaoPct: temPassado ? Math.round(((atual.vendasValidas - passado.vendasValidas) / passado.vendasValidas) * 100) : null,
    ultimasVendas,
    avisos: avisos.results,
  }
}
