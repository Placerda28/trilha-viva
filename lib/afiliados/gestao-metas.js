// Aba Metas e fechamentos da Gestão: tabela de níveis (vigente, futuras, histórico), projeção do mês,
// status dos últimos fechamentos e CSV do fechamento. Sem `@/`.
import { calcularNivel, niveisDoMes } from './niveis.js'
import { SQL_VENDA_VALIDA } from './status.js'
import { relatoriosDosMeses } from './relatorio.js'
import { diaDe, mesAnterior, mesDe, mesSeguinte, textoUtc } from './datas.js'
import { reais } from '../emails-afiliado.js'
import { formatarDataBrasilia, formatarReais, gerarCsv } from '../gestao/csv.js'

const iso = (v) => (v ? `${String(v).replace(' ', 'T').slice(0, 19)}Z` : null)

// Valida o conjunto novo de níveis. { ok: true, niveis } com os campos limpos, ou { ok: false, erro, campo? }.
export function validarNiveis(lista) {
  if (!Array.isArray(lista) || lista.length < 1 || lista.length > 10) {
    return { ok: false, erro: 'Informe de 1 a 10 níveis.', campo: 'niveis' }
  }
  const limpos = []
  for (const [i, n] of lista.entries()) {
    const campo = `niveis[${i}]`
    const nome = typeof n?.nome === 'string' ? n.nome.trim() : ''
    if (nome.length < 1 || nome.length > 30) return { ok: false, erro: `Nível ${i + 1}: o nome tem de 1 a 30 letras.`, campo }
    if (!Number.isSafeInteger(n.vendas_minimas) || n.vendas_minimas < 1 || n.vendas_minimas > 100000) {
      return { ok: false, erro: `Nível ${i + 1}: as vendas mínimas são um número inteiro a partir de 1.`, campo }
    }
    if (!Number.isSafeInteger(n.valor_por_venda_centavos) || n.valor_por_venda_centavos < 1 || n.valor_por_venda_centavos > 1_000_000) {
      return { ok: false, erro: `Nível ${i + 1}: o valor por venda é positivo, em centavos (até R$ 10.000,00).`, campo }
    }
    const cor = n.cor == null || n.cor === '' ? null : String(n.cor)
    if (cor !== null && !/^#[0-9a-fA-F]{6}$/.test(cor)) return { ok: false, erro: `Nível ${i + 1}: a cor tem o formato #RRGGBB.`, campo }
    const anterior = limpos[i - 1]
    if (anterior && n.vendas_minimas <= anterior.vendas_minimas) {
      return { ok: false, erro: 'Os níveis precisam estar em ordem crescente de vendas, sem repetir.', campo }
    }
    if (anterior && n.valor_por_venda_centavos <= anterior.valor_por_venda_centavos) {
      return { ok: false, erro: 'O valor por venda precisa subir a cada nível.', campo }
    }
    if (limpos.some((x) => x.nome.toLowerCase() === nome.toLowerCase())) return { ok: false, erro: 'Dois níveis não podem ter o mesmo nome.', campo }
    limpos.push({ nome, vendas_minimas: n.vendas_minimas, valor_por_venda_centavos: n.valor_por_venda_centavos, cor })
  }
  return { ok: true, niveis: limpos }
}

// Grava o conjunto novo valendo a partir do mês SEGUINTE. O mês corrente e os fechados nunca mudam:
// só se apagam conjuntos de meses futuros (substituídos por este), que nenhum fechamento nem nível travado usa.
export async function salvarNiveis(db, niveis, quem, agora = new Date()) {
  const atual = mesDe(agora)
  const valido = mesSeguinte(atual)
  const t = textoUtc(agora)
  await db.batch([
    db.prepare('DELETE FROM afiliados_niveis WHERE valido_desde_mes > ?').bind(atual),
    ...niveis.map((n, i) =>
      db
        .prepare(
          `INSERT INTO afiliados_niveis (nome, vendas_minimas, valor_por_venda_centavos, cor, ordem, valido_desde_mes, criado_por, criado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(n.nome, n.vendas_minimas, n.valor_por_venda_centavos, n.cor, i + 1, valido, quem, t),
    ),
  ])
  return { valido_desde_mes: valido, niveis }
}

const nivelSaida = (n) => ({ id: n.id, nome: n.nome, vendas_minimas: n.vendas_minimas, valor_por_venda_centavos: n.valor_por_venda_centavos, cor: n.cor })

// Conjuntos da tabela de níveis, do mais novo ao mais antigo, com a situação de cada um.
export async function tabelaDeNiveis(db, agora = new Date()) {
  const mes = mesDe(agora)
  const { results } = await db
    .prepare(
      `SELECT id, nome, vendas_minimas, valor_por_venda_centavos, cor, valido_desde_mes, criado_por, criado_em
         FROM afiliados_niveis ORDER BY valido_desde_mes DESC, vendas_minimas LIMIT 300`,
    )
    .all()
  const conjuntos = []
  for (const r of results) {
    let c = conjuntos.find((x) => x.valido_desde_mes === r.valido_desde_mes)
    if (!c) {
      c = { valido_desde_mes: r.valido_desde_mes, criado_por: r.criado_por || null, criado_em: iso(r.criado_em), niveis: [] }
      conjuntos.push(c)
    }
    c.niveis.push(nivelSaida(r))
  }
  const vigente = conjuntos.find((c) => c.valido_desde_mes <= mes) || null // lista em ordem decrescente: o primeiro <= mês é o vigente
  for (const c of conjuntos) c.situacao = c.valido_desde_mes > mes ? 'futura' : c === vigente ? 'vigente' : 'anterior'
  return {
    vigente,
    proximas: conjuntos.filter((c) => c.situacao === 'futura').reverse(),
    historico: conjuntos,
  }
}

// Quanto o programa custa no mês em andamento se o ritmo de cada afiliado continuar.
export async function projecaoDoMes(db, agora = new Date()) {
  const mes = mesDe(agora)
  const dia = Number(diaDe(agora).slice(8, 10))
  const [ano, m] = mes.split('-').map(Number)
  const diasNoMes = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const [niveis, { results }] = await Promise.all([
    niveisDoMes(db, mes),
    db
      .prepare(
        `SELECT l.afiliado_id AS id, COUNT(*) AS vendas, n.id AS fixo_id, n.nome AS fixo_nome,
                n.vendas_minimas AS fixo_min, n.valor_por_venda_centavos AS fixo_valor
           FROM afiliados_lancamentos l JOIN afiliados a ON a.id = l.afiliado_id LEFT JOIN afiliados_niveis n ON n.id = a.nivel_fixo_id
          WHERE l.mes_referencia = ? AND ${SQL_VENDA_VALIDA} GROUP BY l.afiliado_id LIMIT 5000`,
      )
      .bind(mes)
      .all(),
  ])
  const fixoDe = (r) =>
    r.fixo_id ? { id: r.fixo_id, nome: r.fixo_nome, vendas_minimas: r.fixo_min, valor_por_venda_centavos: r.fixo_valor } : null
  let vendas = 0
  let vendasProj = 0
  let custoAgora = 0
  let baseProj = 0
  let bonusProj = 0
  for (const r of results) {
    const v = Number(r.vendas)
    const fixo = fixoDe(r)
    const p = Math.round((v * diasNoMes) / dia)
    vendas += v
    vendasProj += p
    custoAgora += calcularNivel(v, niveis, fixo).total
    const c = calcularNivel(p, niveis, fixo)
    baseProj += c.base
    bonusProj += c.bonus
  }
  const custoProj = baseProj + bonusProj
  const explicacao =
    results.length === 0
      ? `Hoje é o dia ${dia} de ${diasNoMes}. Ainda não há vendas válidas de afiliados neste mês, então o custo projetado é ${reais(0)}.`
      : `Hoje é o dia ${dia} de ${diasNoMes}. Até agora ${results.length} afiliado(s) fizeram ${vendas} venda(s) válida(s), o que custa ${reais(custoAgora)} ` +
        `em comissões (base mais bônus de nível). Mantendo o ritmo de cada afiliado (vendas até hoje dividido por ${dia}, vezes ${diasNoMes}), ` +
        `o mês fecha com ${vendasProj} vendas e custa ${reais(custoProj)} (base ${reais(baseProj)} e bônus de nível ${reais(bonusProj)}). ` +
        'A conta usa a tabela de níveis vigente e é só uma estimativa: no começo do mês o ritmo oscila muito, e o bônus só é pago no fechamento.'
  return {
    mes,
    dia,
    dias_no_mes: diasNoMes,
    afiliados_com_venda: results.length,
    vendas_ate_agora: vendas,
    custo_ate_agora_centavos: custoAgora,
    vendas_projetadas: vendasProj,
    custo_projetado_centavos: custoProj,
    base_projetada_centavos: baseProj,
    bonus_projetado_centavos: bonusProj,
    explicacao,
  }
}

export async function dadosDeMetas(db, agora = new Date()) {
  const atual = mesDe(agora)
  const meses = []
  for (let m = mesAnterior(atual), i = 0; i < 6; i += 1, m = mesAnterior(m)) meses.push(m)
  const [tabela, fechamentos, projecao] = await Promise.all([tabelaDeNiveis(db, agora), relatoriosDosMeses(db, meses, agora), projecaoDoMes(db, agora)])
  return { mes: atual, ...tabela, fechamentos, projecao }
}

export const CABECALHO_FECHAMENTO = [
  'Código', 'Nome', 'Vendas válidas', 'Vendas reembolsadas', 'Nível', 'Comissão base (R$)', 'Bônus de nível (R$)', 'Total do mês (R$)', 'Fechado em', 'Resumo enviado em',
]

// Uma linha por afiliado fechado no mês (até 5.000).
export async function csvDoFechamento(db, mes) {
  const { results } = await db
    .prepare(
      `SELECT a.codigo, a.nome, f.vendas_validas, f.vendas_reembolsadas, COALESCE(json_extract(f.niveis_snapshot, '$.nivel.nome'), 'Sem nível') AS nivel,
              f.base_centavos, f.bonus_centavos, f.total_centavos, f.fechado_em, f.resumo_enviado_em
         FROM afiliados_fechamentos f JOIN afiliados a ON a.id = f.afiliado_id
        WHERE f.mes_referencia = ? ORDER BY f.total_centavos DESC, a.nome, a.id LIMIT 5000`,
    )
    .bind(mes)
    .all()
  return gerarCsv(
    CABECALHO_FECHAMENTO,
    results.map((r) => [
      r.codigo, r.nome, r.vendas_validas, r.vendas_reembolsadas, r.nivel,
      formatarReais(r.base_centavos), formatarReais(r.bonus_centavos), formatarReais(r.total_centavos),
      formatarDataBrasilia(r.fechado_em), formatarDataBrasilia(r.resumo_enviado_em),
    ]),
  )
}
