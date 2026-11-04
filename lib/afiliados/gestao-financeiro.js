// Financeiro de afiliados na Gestão (Fase 8A): extrato, resumo mensal e dados dos CSVs.
// Só leitura, sem `@/`. Dinheiro em centavos; períodos vêm de validarPeriodo (UTC, dia de Brasília).
import { formatarDataBrasilia, formatarReais as reaisTexto, numeroCsv } from '../gestao/csv.js'
import { mesSeguinte } from './datas.js'
import { inicioDoMesUtc, isoUtc, linhas, mesesDoPeriodo, num, sqlMesBr } from './gestao-periodo.js'

// Valor em reais para planilha: número de verdade (negativo não vira texto com aspas).
const formatarReais = (c) => numeroCsv(reaisTexto(c))

export const TIPOS = ['venda', 'bonus_nivel', 'ajuste', 'estorno']
export const TIPOS_CSV = ['comissoes', 'saques_pagos', 'resumo_mensal']
export const POR_PAGINA = 50
export const LIMITE_CSV = 5000

const ROTULO_TIPO = { venda: 'Venda', bonus_nivel: 'Bônus de nível', ajuste: 'Ajuste', estorno: 'Estorno' }
const ROTULO_STATUS = { pendente: 'Pendente', em_saque: 'Em saque', paga: 'Paga', cancelada: 'Cancelada' }

// Os dois statements do resumo mensal (compras por mês e lançamentos por mês), para um db.batch().
// Mês das compras = mês de Brasília da venda. Bônus = mês de referência; o resto = mês de Brasília do lançamento.
export function prepararResumoMensal(db, iniUtc, fimUtc) {
  return [
    db
      .prepare(
        `SELECT ${sqlMesBr('c.criado_em')} AS mes, COUNT(*) AS vendas,
                COALESCE(SUM(COALESCE(c.bruto_centavos, c.valor_centavos, 0)), 0) AS bruto,
                COALESCE(SUM(COALESCE(c.taxa_mp_centavos, 0)), 0) AS taxas,
                COALESCE(SUM(COALESCE(c.liquido_centavos, c.valor_centavos, 0)), 0) AS liquido,
                COALESCE(SUM(CASE WHEN c.liquido_centavos IS NULL THEN 1 END), 0) AS estimadas
           FROM compras_reais c
          WHERE c.status = 'pago' AND c.afiliado_id IS NOT NULL AND c.criado_em >= ?1 AND c.criado_em < ?2
          GROUP BY mes ORDER BY mes LIMIT 60`,
      )
      .bind(iniUtc, fimUtc),
    db
      .prepare(
        `SELECT CASE WHEN tipo = 'bonus_nivel' THEN mes_referencia ELSE ${sqlMesBr('criado_em')} END AS mes, tipo,
                COALESCE(SUM(CASE WHEN tipo = 'venda' AND status = 'cancelada' THEN 0 ELSE valor_centavos END), 0) AS v
           FROM afiliados_lancamentos WHERE criado_em >= ?1 GROUP BY mes, tipo LIMIT 300`,
      )
      .bind(iniUtc),
  ]
}

const CAMPO_TIPO = { venda: 'comissoes_base', bonus_nivel: 'bonus', ajuste: 'ajustes', estorno: 'estornos' }
const SOMAVEIS = ['vendas', 'bruto', 'taxas', 'liquido', 'estimadas', 'comissoes_base', 'bonus', 'ajustes', 'estornos', 'custo', 'lucro']

// Junta compras e lançamentos por mês. custo = base + bônus + ajustes + estornos (estorno é negativo).
export function montarResumoMensal(meses, comprasRows, lancRows) {
  const mapa = new Map(
    meses.map((mes) => [mes, { mes, vendas: 0, bruto: 0, taxas: 0, liquido: 0, estimadas: 0, comissoes_base: 0, bonus: 0, ajustes: 0, estornos: 0 }]),
  )
  for (const r of comprasRows) {
    const m = mapa.get(r.mes)
    if (m) for (const k of ['vendas', 'bruto', 'taxas', 'liquido', 'estimadas']) m[k] = num(r[k])
  }
  for (const r of lancRows) {
    const m = mapa.get(r.mes)
    if (m && CAMPO_TIPO[r.tipo]) m[CAMPO_TIPO[r.tipo]] = num(r.v)
  }
  const itens = [...mapa.values()].map((m) => {
    const custo = m.comissoes_base + m.bonus + m.ajustes + m.estornos
    return { ...m, custo, lucro: m.liquido - custo }
  })
  const totais = Object.fromEntries(SOMAVEIS.map((k) => [k, itens.reduce((s, i) => s + i[k], 0)]))
  return { meses: itens, totais }
}

// Meses tocados pelo período (inteiros, não só os dias escolhidos).
export async function resumoMensal(db, periodo) {
  const meses = mesesDoPeriodo(periodo)
  const ini = inicioDoMesUtc(meses[0])
  const fim = inicioDoMesUtc(mesSeguinte(meses[meses.length - 1]))
  const [compras, lanc] = await db.batch(prepararResumoMensal(db, ini, fim))
  return montarResumoMensal(meses, linhas(compras), linhas(lanc))
}

export function validarFiltrosExtrato({ tipo, afiliado }) {
  const t = String(tipo || '').trim()
  if (t && !TIPOS.includes(t)) return { ok: false, erro: 'Tipo inválido. Use venda, bonus_nivel, ajuste ou estorno.', campo: 'tipo' }
  const bruto = String(afiliado || '').trim()
  if (bruto && !/^[1-9]\d{0,9}$/.test(bruto)) return { ok: false, erro: 'Afiliado inválido.', campo: 'afiliado' }
  return { ok: true, tipo: t, afiliadoId: bruto ? Number(bruto) : null }
}

export async function extrato(db, { tipo = '', afiliadoId = null, periodo, pagina = 1 }) {
  const n = Number(pagina)
  const pag = Number.isSafeInteger(n) && n >= 1 ? n : 1
  const onde = ['l.criado_em >= ? AND l.criado_em < ?']
  const valores = [periodo.inicioUtc, periodo.fimUtc]
  if (tipo) {
    onde.push('l.tipo = ?')
    valores.push(tipo)
  }
  if (afiliadoId) {
    onde.push('l.afiliado_id = ?')
    valores.push(afiliadoId)
  }
  const filtro = onde.join(' AND ')
  const [lista, tot] = await db.batch([
    db
      .prepare(
        `SELECT l.id, l.criado_em, l.tipo, l.mes_referencia, l.valor_centavos, l.status, l.compra_id, l.saque_id, l.descricao,
                l.afiliado_id, a.nome, a.codigo
           FROM afiliados_lancamentos l JOIN afiliados a ON a.id = l.afiliado_id
          WHERE ${filtro} ORDER BY l.criado_em DESC, l.id DESC LIMIT ? OFFSET ?`,
      )
      .bind(...valores, POR_PAGINA, (pag - 1) * POR_PAGINA),
    db
      .prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(l.valor_centavos), 0) AS soma FROM afiliados_lancamentos l WHERE ${filtro}`)
      .bind(...valores),
  ])
  return {
    pagina: pag,
    por_pagina: POR_PAGINA,
    total_itens: num(linhas(tot)[0]?.n),
    soma_centavos: num(linhas(tot)[0]?.soma),
    itens: linhas(lista).map((r) => ({
      id: Number(r.id),
      quando: isoUtc(r.criado_em),
      afiliado: { id: Number(r.afiliado_id), nome: r.nome, codigo: r.codigo },
      tipo: r.tipo,
      mes_referencia: r.mes_referencia,
      valor_centavos: Number(r.valor_centavos),
      status: r.status,
      compra_id: r.compra_id == null ? null : Number(r.compra_id),
      saque_id: r.saque_id == null ? null : Number(r.saque_id),
      descricao: r.descricao || null,
    })),
  }
}

const cpfComMascara = (d) =>
  /^\d{11}$/.test(String(d || '')) ? String(d).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : String(d || '')

function snapshotPix(texto) {
  try {
    return JSON.parse(texto) || {}
  } catch {
    return {}
  }
}

// Dados de um CSV. `excedeu` = mais de LIMITE_CSV linhas (a rota recusa em vez de cortar sem avisar).
export async function dadosCsv(db, tipo, periodo) {
  if (tipo === 'resumo_mensal') {
    const { meses, totais } = await resumoMensal(db, periodo)
    const linha = (m, nome) => [
      nome, m.vendas, formatarReais(m.bruto), formatarReais(m.taxas), formatarReais(m.liquido), formatarReais(m.comissoes_base),
      formatarReais(m.bonus), formatarReais(m.ajustes), formatarReais(m.estornos), formatarReais(m.lucro), m.estimadas,
    ]
    return {
      cabecalho: ['Mês', 'Vendas via afiliado', 'Receita bruta', 'Taxas Mercado Pago', 'Receita líquida', 'Comissões base',
        'Bônus de nível', 'Ajustes', 'Estornos', 'Lucro', 'Vendas sem taxa informada'],
      linhas: [...meses.map((m) => linha(m, `${m.mes.slice(5)}/${m.mes.slice(0, 4)}`)), linha(totais, 'Total')],
      excedeu: false,
    }
  }
  if (tipo === 'saques_pagos') {
    const { results } = await db
      .prepare(
        `SELECT s.valor_centavos, s.pedido_em, s.pago_em, s.pago_por, s.pix_snapshot, a.nome, a.cpf
           FROM afiliados_saques s JOIN afiliados a ON a.id = s.afiliado_id
          WHERE s.status = 'pago' AND s.pago_em >= ? AND s.pago_em < ?
          ORDER BY s.pago_em, s.id LIMIT ?`,
      )
      .bind(periodo.inicioUtc, periodo.fimUtc, LIMITE_CSV + 1)
      .all()
    return {
      cabecalho: ['Pago em', 'Afiliado', 'CPF do afiliado', 'Titular da chave Pix', 'CPF do titular', 'Tipo da chave', 'Chave Pix', 'Valor', 'Pedido em', 'Pago por'],
      linhas: results.slice(0, LIMITE_CSV).map((r) => {
        const pix = snapshotPix(r.pix_snapshot)
        return [formatarDataBrasilia(r.pago_em), r.nome, cpfComMascara(r.cpf), pix.titular_nome || '', cpfComMascara(pix.titular_cpf),
          pix.tipo_chave || '', pix.chave || '', formatarReais(r.valor_centavos), formatarDataBrasilia(r.pedido_em), r.pago_por || '']
      }),
      excedeu: results.length > LIMITE_CSV,
    }
  }
  const { results } = await db
    .prepare(
      `SELECT l.criado_em, l.tipo, l.mes_referencia, l.valor_centavos, l.status, l.compra_id, l.descricao, a.nome, a.codigo
         FROM afiliados_lancamentos l JOIN afiliados a ON a.id = l.afiliado_id
        WHERE l.criado_em >= ? AND l.criado_em < ? ORDER BY l.criado_em, l.id LIMIT ?`,
    )
    .bind(periodo.inicioUtc, periodo.fimUtc, LIMITE_CSV + 1)
    .all()
  return {
    cabecalho: ['Data', 'Afiliado', 'Código', 'Tipo', 'Mês de referência', 'Valor', 'Status', 'Compra', 'Descrição'],
    linhas: results.slice(0, LIMITE_CSV).map((r) => [
      formatarDataBrasilia(r.criado_em), r.nome, r.codigo, ROTULO_TIPO[r.tipo] || r.tipo, r.mes_referencia,
      formatarReais(r.valor_centavos), ROTULO_STATUS[r.status] || r.status, r.compra_id ?? '', r.descricao || '',
    ]),
    excedeu: results.length > LIMITE_CSV,
  }
}
