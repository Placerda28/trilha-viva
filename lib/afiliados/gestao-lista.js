// Lista de afiliados da Gestão. Sem `@/`.
// CPU: poucas consultas agregadas (GROUP BY, LIMIT) num único db.batch; o nível do mês sai da contagem
// agregada e da tabela de níveis (calcularNivel), nunca de statusDoMes por afiliado. Os números batem com
// statusDoMes (teste em tests/afiliados/gestao-lista.test.mjs).
// shortcut: filtros, ordem e página rodam em JS sobre até TETO afiliados; passou disso, `truncado: true`.
// Quando o programa passar de ~3.000 afiliados, mover filtro e ordem para o SQL.
import { calcularNivel, niveisDoMes } from './niveis.js'
import { SQL_DISPONIVEL, SQL_VENDA_VALIDA } from './status.js'
import { MES_VALIDO } from './relatorio.js'
import { mesDe, somarDias, textoUtc } from './datas.js'

export const POR_PAGINA = 25
const TETO = 3000
const STATUS = ['pendente', 'ativo', 'suspenso']

const nivelLinha = (n) => (n ? { id: n.id, nome: n.nome, cor: n.cor ?? null } : null)

// Valor de cada coluna ordenável. Texto em minúsculas e comparação simples (sem localeCompare em laço).
const CHAVES = {
  nome: (i) => i.nome.toLowerCase(),
  codigo: (i) => i.codigo,
  status: (i) => i.status,
  nivel: (i) => i.nivel_vendas_minimas,
  vendas: (i) => i.vendas_mes,
  faltam: (i) => (i.proximo ? i.faltam : null),
  cliques: (i) => i.cliques_30d,
  conversao: (i) => i.conversao_pct,
  receita: (i) => i.receita_centavos,
  comissao: (i) => i.comissao_prevista_centavos,
  estornos: (i) => i.estornos,
  disponivel: (i) => i.disponivel_centavos,
  pago: (i) => i.total_pago_centavos,
  ultima_venda: (i) => i.ultima_venda,
  criado_em: (i) => i.criado_em,
}
export const ORDENS = Object.keys(CHAVES)

function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`)
}

function comparar(a, b, dir) {
  // vazio vai sempre para o fim, qualquer que seja a direção
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a < b ? -dir : a > b ? dir : 0
}

// opcoes: { q, status, nivel ('sem' | id), vendeu ('sim'|'nao'), saldo, saque, perto, ordem, dir, pagina, mes }
export async function listarAfiliados(db, opcoes = {}, agora = new Date()) {
  const mes = MES_VALIDO.test(String(opcoes.mes || '')) ? opcoes.mes : mesDe(agora)
  const q = String(opcoes.q || '').trim().slice(0, 80)
  const like = q ? `%${escaparLike(q)}%` : null
  const t = textoUtc(agora)
  const desde30 = textoUtc(somarDias(agora, -30))

  const [niveis, [base, doMes, geral, cliques, fechados, saques, fixos]] = await Promise.all([
    niveisDoMes(db, mes),
    db.batch([
      db
        .prepare(
          `SELECT a.id, a.nome, a.codigo, a.status, a.nivel_fixo_id, a.criado_em, c.email
             FROM afiliados a JOIN clientes c ON c.id = a.cliente_id
            WHERE (?1 IS NULL OR a.nome LIKE ?1 ESCAPE '\\' OR a.codigo LIKE ?1 ESCAPE '\\' OR c.email LIKE ?1 ESCAPE '\\')
            ORDER BY a.id LIMIT ${TETO + 1}`,
        )
        .bind(like),
      db
        .prepare(
          `SELECT l.afiliado_id AS id, COUNT(*) AS total,
                  COALESCE(SUM(CASE WHEN ${SQL_VENDA_VALIDA} THEN 1 ELSE 0 END), 0) AS validas,
                  COALESCE(SUM(CASE WHEN ${SQL_VENDA_VALIDA} THEN c.valor_centavos END), 0) AS receita
             FROM afiliados_lancamentos l JOIN compras c ON c.id = l.compra_id
            WHERE l.tipo = 'venda' AND l.mes_referencia = ?1 GROUP BY l.afiliado_id LIMIT ${TETO + 1}`,
        )
        .bind(mes),
      db
        .prepare(
          `SELECT l.afiliado_id AS id,
                  COALESCE(SUM(CASE WHEN ${SQL_DISPONIVEL('l', '?1')} THEN l.valor_centavos END), 0) AS disponivel,
                  COALESCE(SUM(CASE WHEN l.status = 'paga' THEN l.valor_centavos END), 0) AS pago,
                  MAX(CASE WHEN l.tipo = 'venda' THEN l.criado_em END) AS ultima,
                  COALESCE(SUM(CASE WHEN l.criado_em >= ?2 AND ${SQL_VENDA_VALIDA} THEN 1 ELSE 0 END), 0) AS vendas30
             FROM afiliados_lancamentos l GROUP BY l.afiliado_id LIMIT ${TETO + 1}`,
        )
        .bind(t, desde30),
      db
        .prepare(`SELECT afiliado_id AS id, COUNT(*) AS n FROM afiliados_cliques WHERE criado_em >= ?1 GROUP BY afiliado_id LIMIT ${TETO + 1}`)
        .bind(desde30),
      db
        .prepare(
          `SELECT afiliado_id AS id, vendas_validas, vendas_reembolsadas, total_centavos, json_extract(niveis_snapshot, '$.nivel') AS nivel
             FROM afiliados_fechamentos WHERE mes_referencia = ?1 LIMIT ${TETO + 1}`,
        )
        .bind(mes),
      db.prepare(`SELECT afiliado_id AS id FROM afiliados_saques WHERE status = 'solicitado' LIMIT ${TETO + 1}`),
      db.prepare(
        `SELECT id, nome, vendas_minimas, valor_por_venda_centavos, cor, ordem, valido_desde_mes FROM afiliados_niveis
          WHERE id IN (SELECT DISTINCT nivel_fixo_id FROM afiliados WHERE nivel_fixo_id IS NOT NULL) LIMIT 50`,
      ),
    ]),
  ])

  const porId = (r) => new Map(r.results.map((x) => [Number(x.id), x]))
  const mMes = porId(doMes)
  const mGeral = porId(geral)
  const mCliques = porId(cliques)
  const mFechados = porId(fechados)
  const mSaques = porId(saques)
  const mFixos = new Map(fixos.results.map((x) => [Number(x.id), x]))
  const truncado = base.results.length > TETO

  const todos = base.results.slice(0, TETO).map((a) => {
    const id = Number(a.id)
    const m = mMes.get(id)
    const g = mGeral.get(id)
    const f = mFechados.get(id)
    const cliques30 = Number(mCliques.get(id)?.n || 0)
    const vendas30 = Number(g?.vendas30 || 0)
    let nivel, vendas, faltam, proximo, comissao, estornos
    if (f) {
      // Mês fechado: vale o que foi gravado (igual a statusDoMes).
      nivel = f.nivel ? JSON.parse(f.nivel) : null
      vendas = Number(f.vendas_validas)
      faltam = 0
      proximo = null
      comissao = Number(f.total_centavos)
      estornos = Number(f.vendas_reembolsadas)
    } else {
      const validas = Number(m?.validas || 0)
      const c = calcularNivel(validas, niveis, a.nivel_fixo_id ? mFixos.get(Number(a.nivel_fixo_id)) || null : null)
      nivel = c.nivel
      vendas = validas
      faltam = c.faltam
      proximo = c.proximo
      comissao = c.total
      estornos = Number(m?.total || 0) - validas
    }
    return {
      id,
      nome: a.nome,
      codigo: a.codigo,
      email: a.email,
      status: a.status,
      nivel: nivelLinha(nivel),
      nivel_vendas_minimas: nivel ? nivel.vendas_minimas : 0,
      nivel_travado: Boolean(a.nivel_fixo_id),
      vendas_mes: vendas,
      faltam,
      proximo: proximo ? proximo.nome : null,
      cliques_30d: cliques30,
      vendas_30d: vendas30,
      conversao_pct: cliques30 > 0 ? Math.round((vendas30 / cliques30) * 10000) / 100 : null,
      receita_centavos: Number(m?.receita || 0),
      comissao_prevista_centavos: comissao,
      estornos,
      disponivel_centavos: Number(g?.disponivel || 0),
      total_pago_centavos: Number(g?.pago || 0),
      ultima_venda: g?.ultima || null,
      saque_pendente: mSaques.has(id),
      criado_em: a.criado_em,
    }
  })

  const contagem = { pendente: 0, ativo: 0, suspenso: 0 }
  for (const i of todos) contagem[i.status] += 1

  const status = STATUS.includes(opcoes.status) ? opcoes.status : null
  const nivelId =
    opcoes.nivel === 'sem' ? 'sem' : Number.isSafeInteger(Number(opcoes.nivel)) && Number(opcoes.nivel) > 0 ? Number(opcoes.nivel) : null
  const filtrados = todos.filter(
    (i) =>
      (!status || i.status === status) &&
      (nivelId == null || (nivelId === 'sem' ? !i.nivel : i.nivel?.id === nivelId)) &&
      (opcoes.vendeu !== 'sim' || i.vendas_mes > 0) &&
      (opcoes.vendeu !== 'nao' || i.vendas_mes === 0) &&
      (!opcoes.saldo || i.disponivel_centavos > 0) &&
      (!opcoes.saque || i.saque_pendente) &&
      (!opcoes.perto || (i.proximo && i.faltam >= 1 && i.faltam <= 3)),
  )

  const ordem = Object.hasOwn(CHAVES, opcoes.ordem) ? opcoes.ordem : 'vendas'
  const dir = opcoes.dir === 'asc' ? 1 : opcoes.dir === 'desc' ? -1 : ordem === 'nome' || ordem === 'codigo' ? 1 : -1
  const chave = CHAVES[ordem]
  filtrados.sort((a, b) => comparar(chave(a), chave(b), dir) || comparar(a.nome.toLowerCase(), b.nome.toLowerCase(), 1) || a.id - b.id)

  const pagina = Number.isSafeInteger(Number(opcoes.pagina)) && Number(opcoes.pagina) >= 1 ? Number(opcoes.pagina) : 1
  const itens = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(({ nivel_vendas_minimas, ...resto }) => resto) // eslint-disable-line no-unused-vars
  return {
    mes,
    pagina,
    por_pagina: POR_PAGINA,
    total: filtrados.length,
    ordem,
    dir: dir === 1 ? 'asc' : 'desc',
    truncado,
    contagem_status: contagem,
    niveis: niveis.map((n) => ({ id: n.id, nome: n.nome, cor: n.cor, vendas_minimas: n.vendas_minimas, valor_por_venda_centavos: n.valor_por_venda_centavos })),
    itens,
  }
}
