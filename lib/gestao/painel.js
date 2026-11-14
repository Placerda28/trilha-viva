import { isoUtc } from './clientes.js'
import { diaBrasiliaDeUtc, inicioDoDiaBrasilia, montarSerie, periodoAnterior, somarDias } from './datas.js'
import { prepararResumoPeriodo, resumoDeResultados } from './periodo.js'

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

const FONTES_META = new Set(['ig', 'instagram', 'facebook', 'fb', 'meta'])

// Rótulo legível da origem de uma venda. `registrado` é falso nas compras de antes
// de 12/10/2026, quando a origem ainda não era gravada; `meio` = utm_medium.
// Fonte desconhecida (ex.: chatgpt.com) aparece com o próprio nome.
export function rotuloFonte(fonte, registrado = true, meio = null) {
  const f = String(fonte || '').trim().toLowerCase()
  if (!f) return registrado ? 'Direto' : 'Sem registro'
  if (f === 'vs-gratis' || String(meio || '').trim().toLowerCase() === 'lead') return 'VS grátis'
  if (FONTES_META.has(f)) return 'Instagram/Meta'
  if (f === 'google') return 'Google'
  return f.slice(0, 40)
}

// Junta as linhas (fonte × meio × registrado) nos rótulos, somando vendas e centavos,
// da maior para a menor. Poucas linhas (LIMIT 200 no SQL), então o laço é barato.
export function agruparFontes(linhasFonte) {
  const mapa = new Map()
  for (const l of linhasFonte) {
    const fonte = rotuloFonte(l.utm_source, Boolean(Number(l.registrado)), l.utm_medium)
    const atual = mapa.get(fonte) || { fonte, vendas: 0, centavos: 0 }
    atual.vendas += Number(l.vendas || 0)
    atual.centavos += Number(l.centavos || 0)
    mapa.set(fonte, atual)
  }
  return [...mapa.values()].sort((a, b) => b.vendas - a.vendas || b.centavos - a.centavos)
}

function percentual(parte, total) {
  return total ? Math.round((parte / total) * 10000) / 100 : 0
}

// A série de ticket mora em datas.js (sem SQL), para o navegador não carregar este arquivo.
export { serieDeTicket } from './datas.js'

// Três janelas fixas do dia de Brasília, calculadas fora do SQL.
function prepararAgora(db, agora) {
  const hoje = diaBrasiliaDeUtc(agora.toISOString())
  const inicioHoje = inicioDoDiaBrasilia(agora)
  const inicioOntem = `${somarDias(hoje, -1)} 03:00:00`
  const inicioAmanha = `${somarDias(hoje, 1)} 03:00:00`
  const inicioMes = `${hoje.slice(0, 7)}-01 03:00:00`
  return db.prepare(`
    SELECT
      COUNT(CASE WHEN criado_em >= ? AND criado_em < ? THEN 1 END) AS hoje_vendas,
      COALESCE(SUM(CASE WHEN criado_em >= ? AND criado_em < ? THEN valor_centavos ELSE 0 END), 0) AS hoje_centavos,
      COUNT(CASE WHEN criado_em >= ? AND criado_em < ? THEN 1 END) AS ontem_vendas,
      COALESCE(SUM(CASE WHEN criado_em >= ? AND criado_em < ? THEN valor_centavos ELSE 0 END), 0) AS ontem_centavos,
      COUNT(CASE WHEN criado_em >= ? THEN 1 END) AS mes_vendas,
      COALESCE(SUM(CASE WHEN criado_em >= ? THEN valor_centavos ELSE 0 END), 0) AS mes_centavos
    FROM compras_reais
    WHERE status = 'pago' AND criado_em >= ? AND criado_em < ?`)
    // No dia 1, ontem é do mês passado: a janela começa no mais antigo dos dois.
    .bind(inicioHoje, inicioAmanha, inicioHoje, inicioAmanha,
      inicioOntem, inicioHoje, inicioOntem, inicioHoje, inicioMes, inicioMes,
      inicioOntem < inicioMes ? inicioOntem : inicioMes, inicioAmanha)
}

function agoraDaLinha(resultado) {
  const l = linhas(resultado)[0] || {}
  return Object.fromEntries(['hoje', 'ontem', 'mes'].map((k) => [k, {
    vendas: Number(l[k + '_vendas'] || 0), centavos: Number(l[k + '_centavos'] || 0),
  }]))
}

// Carrinhos reais do período, por pessoa (e-mail): quantos, quantos pagaram e
// quantos pagaram depois de receber um lembrete (recuperados).
export function prepararCarrinhosPeriodo(db, { inicioUtc, fimUtc }) {
  return db.prepare(`
    SELECT
      COUNT(DISTINCT c.email) AS carrinhos,
      COUNT(DISTINCT CASE WHEN c.pago_em IS NOT NULL THEN c.email END) AS pagos,
      COUNT(DISTINCT CASE WHEN c.pago_em IS NOT NULL AND EXISTS (
        SELECT 1 FROM carrinhos_reais e
          JOIN lembretes_enviados l ON l.carrinho_id = e.id
         WHERE e.email = c.email AND l.enviado_em < c.pago_em
         LIMIT 1
      ) THEN c.email END) AS recuperados
    FROM carrinhos_reais c
    WHERE c.criado_em >= ? AND c.criado_em < ?
    LIMIT 1`)
    .bind(inicioUtc, fimUtc)
}

// Clientes cuja primeira compra real paga caiu no período.
function prepararClientesNovos(db, { inicioUtc, fimUtc }) {
  return db.prepare(`
    SELECT COUNT(*) AS n FROM (
      SELECT cliente_id FROM compras_reais
       WHERE status = 'pago'
       GROUP BY cliente_id
      HAVING MIN(criado_em) >= ? AND MIN(criado_em) < ?
    )`)
    .bind(inicioUtc, fimUtc)
}

function prepararFontes(db, { inicioUtc, fimUtc }) {
  return db.prepare(`
    SELECT utm_source, utm_medium,
           CASE WHEN meta_status IS NULL AND utm_source IS NULL THEN 0 ELSE 1 END AS registrado,
           COUNT(*) AS vendas,
           COALESCE(SUM(valor_centavos), 0) AS centavos
      FROM compras_reais
     WHERE status = 'pago' AND criado_em >= ? AND criado_em < ?
     GROUP BY utm_source, utm_medium, registrado
     LIMIT 200`)
    .bind(inicioUtc, fimUtc)
}

function prepararUltimasVendas(db) {
  return db.prepare(`
    SELECT p.id, p.criado_em, p.valor_centavos, p.forma_pagamento, p.utm_source, p.utm_medium,
           p.utm_campaign,
           CASE WHEN p.meta_status IS NULL AND p.utm_source IS NULL THEN 0 ELSE 1 END AS registrado,
           c.id AS cliente_id, c.nome, c.email
      FROM compras_reais p
      JOIN clientes c ON c.id = p.cliente_id
     WHERE p.status = 'pago'
     ORDER BY p.criado_em DESC, p.id DESC
     LIMIT 6`)
}

// Os últimos acontecimentos misturados. Cada fonte entra com LIMIT 10 antes da
// união, para a consulta nunca ordenar uma tabela inteira.
function prepararAtividade(db) {
  return db.prepare(`
    SELECT * FROM (
      SELECT 'compra' AS tipo, p.criado_em AS em, c.nome AS nome, c.email AS email,
             p.valor_centavos AS valor, c.id AS cliente_id, NULL AS acao, NULL AS quem, NULL AS alvo
        FROM compras_reais p JOIN clientes c ON c.id = p.cliente_id
       WHERE p.status = 'pago'
       ORDER BY p.criado_em DESC LIMIT 10)
    UNION ALL
    SELECT * FROM (
      SELECT 'lead', criado_em, nome, email, NULL, NULL, NULL, NULL, NULL
        FROM leads ORDER BY criado_em DESC LIMIT 10)
    UNION ALL
    SELECT * FROM (
      SELECT 'recuperado', k.pago_em, k.nome, k.email, NULL, NULL, NULL, NULL, NULL
        FROM carrinhos_reais k
       WHERE k.pago_em IS NOT NULL AND EXISTS (
         SELECT 1 FROM carrinhos_reais e
           JOIN lembretes_enviados l ON l.carrinho_id = e.id
          WHERE e.email = k.email AND l.enviado_em < k.pago_em
          LIMIT 1)
       ORDER BY k.pago_em DESC LIMIT 10)
    UNION ALL
    SELECT * FROM (
      SELECT 'equipe', criado_em, NULL, NULL, NULL, NULL, acao, quem, alvo
        FROM registro ORDER BY criado_em DESC LIMIT 10)
    ORDER BY em DESC
    LIMIT 10`)
}

function resumoDoPeriodo(totaisResumo, novos, carrinhos) {
  const t = totaisResumo.totais
  const c = linhas(carrinhos)[0]
  const pessoas = Number(c?.carrinhos || 0)
  const pagos = Number(c?.pagos || 0)
  return {
    faturamento_centavos: t.bruto_centavos,
    vendas: t.compras,
    clientes: t.clientes,
    clientes_novos: Number(linhas(novos)[0]?.n || 0),
    ticket_centavos: t.ticket_medio_centavos,
    carrinhos: pessoas,
    carrinhos_pagos: pagos,
    recuperados: Number(c?.recuperados || 0),
    conversao: percentual(pagos, pessoas),
  }
}

export function atividadeDaLinha(l) {
  return {
    tipo: l.tipo,
    em: isoUtc(l.em),
    nome: l.nome || null,
    email: l.email || null,
    valor_centavos: l.valor == null ? null : Number(l.valor),
    cliente_id: l.cliente_id == null ? null : Number(l.cliente_id),
    acao: l.acao || null,
    quem: l.quem || null,
    alvo: l.alvo || null,
  }
}

// Um único db.batch() com tudo o que o Painel mostra. A forma de pagamento vem só
// da coluna (sem chamar o Mercado Pago, como a tela Vendas faz).
export async function consultarPainel(db, periodo, agrupar = 'dia', agora = new Date()) {
  const anterior = periodoAnterior(periodo.de, periodo.ate)
  const [totaisAtual, diasAtual] = prepararResumoPeriodo(db, periodo)
  const [totaisAnterior] = prepararResumoPeriodo(db, anterior)
  const [
    rTotaisAtual, rDias, rTotaisAnterior,
    rNovosAtual, rNovosAnterior, rCarrinhosAtual, rCarrinhosAnterior,
    rFontes, rUltimas, rAtividade, rAgora,
  ] = await db.batch([
    totaisAtual, diasAtual, totaisAnterior,
    prepararClientesNovos(db, periodo), prepararClientesNovos(db, anterior),
    prepararCarrinhosPeriodo(db, periodo), prepararCarrinhosPeriodo(db, anterior),
    prepararFontes(db, periodo), prepararUltimasVendas(db), prepararAtividade(db), prepararAgora(db, agora),
  ])

  const resumoAtual = resumoDeResultados(linhas(rTotaisAtual)[0], rDias)
  const resumoAnterior = resumoDeResultados(linhas(rTotaisAnterior)[0], null)
  return {
    de: periodo.de,
    ate: periodo.ate,
    agrupar,
    anterior_de: anterior.de,
    anterior_ate: anterior.ate,
    atual: resumoDoPeriodo(resumoAtual, rNovosAtual, rCarrinhosAtual),
    anterior: resumoDoPeriodo(resumoAnterior, rNovosAnterior, rCarrinhosAnterior),
    agora: agoraDaLinha(rAgora),
    serie: montarSerie({ de: periodo.de, ate: periodo.ate, agrupar, linhas: resumoAtual.dias }),
    fontes: agruparFontes(linhas(rFontes)),
    ultimas_vendas: linhas(rUltimas).map((l) => ({
      id: Number(l.id),
      em: isoUtc(l.criado_em),
      valor_centavos: Number(l.valor_centavos || 0),
      forma: l.forma_pagamento || null,
      fonte: rotuloFonte(l.utm_source, Boolean(Number(l.registrado)), l.utm_medium),
      campanha: l.utm_campaign || null,
      cliente: { id: Number(l.cliente_id), nome: l.nome || null, email: l.email },
    })),
    atividade: linhas(rAtividade).map(atividadeDaLinha),
  }
}
