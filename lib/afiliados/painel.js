// Dados do painel do afiliado (aba Início, vendas, ganhos). Só leitura.
// Sem `@/`. Todo número vem de statusDoMes/saldosDoAfiliado (única fonte); toda leitura filtra por afiliadoId,
// que quem chama tira da sessão. Nunca devolve e-mail inteiro, nome nem telefone do comprador.
import { configuracao, niveisDoMes } from './niveis.js'
import { SQL_VENDA_VALIDA, statusDoMes } from './status.js'
import { conferir } from './saque.js'
import { dataDeTexto, diaDe, mesAnterior, mesDe, mesSeguinte, somarDias } from './datas.js'

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

function situacaoDaVenda(l, agora) {
  if (l.status === 'cancelada' || l.estorno_em) return ['cancelada', l.estorno_em ? diaDe(l.estorno_em) : null]
  if (l.status === 'paga') return ['paga', l.pago_em ? diaDe(l.pago_em) : null]
  if (l.status === 'em_saque') return ['em_saque', l.pedido_em ? diaDe(l.pedido_em) : null]
  return [dataDeTexto(l.disponivel_em) <= agora ? 'disponivel' : 'liberando', diaDe(l.disponivel_em)]
}

// mes = null: vendas de qualquer mês (últimas vendas do Início).
async function buscarVendas(db, afiliadoId, mes, limite, agora) {
  const filtroMes = mes ? 'AND l.mes_referencia = ?2' : ''
  const args = mes ? [afiliadoId, mes, limite] : [afiliadoId, limite]
  const lim = mes ? '?3' : '?2'
  const { results } = await db
    .prepare(
      `SELECT l.compra_id, l.criado_em, l.status, l.disponivel_em, l.valor_centavos AS comissao,
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
    const [situacao, situacaoEm] = situacaoDaVenda(l, agora)
    return {
      compraId: Number(l.compra_id),
      data: l.criado_em,
      comprador: mascararEmail(l.email),
      valorPagoCentavos: Number(l.pago || 0),
      comissaoCentavos: Number(l.comissao),
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

// Data (AAAA-MM-DD, Brasília) em que o afiliado pode pedir o próximo saque, ou null se já pode.
export async function proximoSaqueEm(db, afiliadoId, agora = new Date()) {
  const [ultimo, cfg] = await Promise.all([
    db
      .prepare("SELECT MAX(pedido_em) AS em FROM afiliados_saques WHERE afiliado_id = ? AND status != 'recusado'")
      .bind(afiliadoId)
      .first(),
    configuracao(db),
  ])
  if (!ultimo?.em || !cfg) return null
  const libera = somarDias(ultimo.em, cfg.intervalo_saque_dias)
  return libera > agora ? diaDe(libera) : null
}

export async function historicoMensal(db, afiliadoId, limite = 12, agora = new Date()) {
  const mes = mesDe(agora)
  const { results } = await db
    .prepare(
      `SELECT mes_referencia, vendas_validas, niveis_snapshot, base_centavos, bonus_centavos, total_centavos, fechado_em
         FROM afiliados_fechamentos WHERE afiliado_id = ? ORDER BY mes_referencia DESC LIMIT ?`,
    )
    .bind(afiliadoId, limite)
    .all()
  const fechados = results.map((f) => ({
    mes: f.mes_referencia,
    vendasValidas: f.vendas_validas,
    nivel: nivelResumo(JSON.parse(f.niveis_snapshot).nivel),
    garantido: f.base_centavos,
    bonus: f.bonus_centavos,
    total: f.total_centavos,
    situacao: 'fechado',
    fechadoEm: diaDe(f.fechado_em),
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
      garantido: s.garantido,
      bonus: s.bonusPrevisto,
      total: s.totalPrevisto,
      situacao: 'em_andamento',
      fechadoEm: null,
    })
  }
  return [...abertos, ...fechados].slice(0, limite)
}

// Valor e dia (Brasília) da próxima liberação de comissão.
async function proximaLiberacao(db, afiliadoId, proxima) {
  if (!proxima) return null
  const dia = diaDe(proxima)
  const r = await db
    .prepare(
      `SELECT COALESCE(SUM(valor_centavos), 0) AS valor FROM afiliados_lancamentos
        WHERE afiliado_id = ? AND status = 'pendente' AND saque_id IS NULL
          AND date(disponivel_em, '-3 hours') = ?`,
    )
    .bind(afiliadoId, dia)
    .first()
  return { valor: Number(r.valor), em: dia }
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
  const bonusCaiEm = `${mesSeguinte(mes)}-${pad(cfg.dia_fechamento)}`

  // Bônus do mês passado ainda não fechado (dias 1 a 7) ainda vai cair: soma ao do mês atual.
  const bonusAnterior = !passado.fechado ? passado.bonusPrevisto : 0
  const bonusAReceber = atual.bonusPrevisto + bonusAnterior
  const bonusAReceberEm = bonusAnterior > 0 ? `${mes}-${pad(cfg.dia_fechamento)}` : bonusCaiEm

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
    ganhos: {
      garantido: atual.garantido,
      bonusPrevisto: atual.bonusPrevisto,
      totalPrevisto: atual.totalPrevisto,
      bonusCaiEm,
    },
    seBaterProximo: proximo ? { total: proximo.vendas_minimas * proximo.valor_por_venda_centavos } : null,
    ritmoNecessario: ritmo,
    cartoes: {
      disponivel: saldos.disponivel,
      liberando: saldos.liberando,
      proximaLiberacao: await proximaLiberacao(db, afiliadoId, saldos.proximaLiberacao),
      bonusAReceber,
      bonusAReceberEm,
      jaRecebido: saldos.jaRecebido,
    },
    saque: { pode: !conferencia.motivo, valor: saldos.disponivel, motivo: conferencia.motivo },
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
