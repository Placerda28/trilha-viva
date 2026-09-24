const POR_PAGINA = 25

function resultadoLinhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

export function paginaValida(valor) {
  const pagina = Number(valor)
  return Number.isSafeInteger(pagina) && pagina >= 1 ? pagina : 1
}

export function buscaValida(valor) {
  return String(valor || '').slice(0, 80)
}

function escaparLike(valor) {
  return valor.split('\\').join('\\\\').split('%').join('\\%').split('_').join('\\_')
}

function filtroBusca(q) {
  if (!q) return { sql: '', valores: [] }
  const valor = `%${escaparLike(q.toLowerCase())}%`
  return {
    sql: ` AND (
      LOWER(COALESCE(c.nome, '')) LIKE ? ESCAPE '\\'
      OR LOWER(c.email) LIKE ? ESCAPE '\\'
    )`,
    valores: [valor, valor],
  }
}

const CAMPOS_CLIENTE = `
  c.id,
  c.nome,
  c.email,
  c.criado_em,
  c.bloqueado,
  c.supabase_id,
  COUNT(p.id) AS compras,
  (SELECT COUNT(*) FROM downloads d WHERE d.cliente_id = c.id LIMIT 1) AS downloads,
  escolhida.id AS compra_id,
  escolhida.stripe_session_id AS compra_origem,
  escolhida.criado_em AS compra_em,
  escolhida.valor_centavos AS compra_valor_centavos,
  escolhida.forma_pagamento AS compra_forma,
  escolhida.cupom AS compra_cupom,
  escolhida.status AS compra_status`

function juncaoCompraEscolhida() {
  return `
    JOIN compras p ON p.cliente_id = c.id
    LEFT JOIN compras escolhida ON escolhida.id = COALESCE(
      (
        SELECT paga.id
          FROM compras paga
         WHERE paga.cliente_id = c.id AND paga.status = 'pago'
         ORDER BY paga.criado_em DESC, paga.id DESC
         LIMIT 1
      ),
      (
        SELECT qualquer.id
          FROM compras qualquer
         WHERE qualquer.cliente_id = c.id
         ORDER BY qualquer.criado_em DESC, qualquer.id DESC
         LIMIT 1
      )
    )`
}

function sqlPaginaClientes(filtro) {
  return `
    SELECT ${CAMPOS_CLIENTE}
      FROM clientes c
      ${juncaoCompraEscolhida()}
     WHERE 1 = 1 ${filtro}
     GROUP BY c.id
     ORDER BY MAX(p.criado_em) DESC, c.id DESC
     LIMIT ? OFFSET ?`
}

function sqlTotalClientes(filtro) {
  return `
    SELECT COUNT(*) AS total
      FROM clientes c
     WHERE EXISTS (
       SELECT 1 FROM compras existente WHERE existente.cliente_id = c.id LIMIT 1
     ) ${filtro}
     LIMIT 1`
}

export async function consultarClientes(db, { q, pagina }) {
  const busca = buscaValida(q)
  const numeroPagina = paginaValida(pagina)
  const filtro = filtroBusca(busca)
  const deslocamento = (numeroPagina - 1) * POR_PAGINA

  // São exatamente duas consultas ao D1: uma para a página e uma para o total.
  const [paginaResultado, totalResultado] = await Promise.all([
    db.prepare(sqlPaginaClientes(filtro.sql))
      .bind(...filtro.valores, POR_PAGINA, deslocamento)
      .all(),
    db.prepare(sqlTotalClientes(filtro.sql)).bind(...filtro.valores).first(),
  ])

  return {
    pagina: numeroPagina,
    por_pagina: POR_PAGINA,
    total: Number(totalResultado?.total || 0),
    linhas: resultadoLinhas(paginaResultado),
  }
}

export async function consultarClientesCsv(db, q) {
  const filtro = filtroBusca(buscaValida(q))
  const resultado = await db
    .prepare(`
      SELECT ${CAMPOS_CLIENTE.replace(
        'escolhida.forma_pagamento AS compra_forma',
        `COALESCE(
          escolhida.forma_pagamento,
          CASE
            WHEN escolhida.stripe_session_id LIKE 'cs_live_%'
              OR escolhida.stripe_session_id LIKE 'cs_test_%'
            THEN 'cartao'
          END
        ) AS compra_forma`
      )}
        FROM clientes c
        ${juncaoCompraEscolhida()}
       WHERE 1 = 1 ${filtro.sql}
       GROUP BY c.id
       ORDER BY MAX(p.criado_em) DESC, c.id DESC
       LIMIT 5000`)
    .bind(...filtro.valores)
    .all()
  return resultadoLinhas(resultado)
}

export function isoUtc(valor) {
  if (!valor) return null
  const achado = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(String(valor))
  return achado ? `${achado[1]}T${achado[2]}Z` : null
}

export function clienteDaLinha(linha) {
  return {
    id: Number(linha.id),
    nome: linha.nome || null,
    email: linha.email,
    criado_em: isoUtc(linha.criado_em),
    bloqueado: Boolean(Number(linha.bloqueado)),
    tem_senha: Boolean(linha.supabase_id),
    downloads: Number(linha.downloads || 0),
    compras: Number(linha.compras || 0),
    compra: linha.compra_id
      ? {
          id: Number(linha.compra_id),
          em: isoUtc(linha.compra_em),
          valor_centavos: Number(linha.compra_valor_centavos || 0),
          forma: linha.compra_forma || null,
          cupom: linha.compra_cupom || null,
          status: linha.compra_status,
        }
      : null,
  }
}
