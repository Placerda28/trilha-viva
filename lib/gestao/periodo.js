import { clienteDaLinha } from './clientes.js'

const POR_PAGINA = 25

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

const CAMPOS_ITEM = `
  c.id,
  c.nome,
  c.email,
  c.criado_em,
  c.bloqueado,
  c.supabase_id,
  (SELECT COUNT(*) FROM downloads d WHERE d.cliente_id = c.id LIMIT 1) AS downloads,
  (SELECT COUNT(*) FROM compras todas WHERE todas.cliente_id = c.id LIMIT 1) AS compras,
  p.id AS compra_id,
  p.stripe_session_id AS compra_origem,
  p.criado_em AS compra_em,
  p.valor_centavos AS compra_valor_centavos,
  p.forma_pagamento AS compra_forma,
  p.status AS compra_status`

export async function consultarItensPeriodo(db, { inicioUtc, fimUtc, pagina }) {
  const offset = (pagina - 1) * POR_PAGINA
  const [resultado, total] = await Promise.all([
    db.prepare(`
      SELECT ${CAMPOS_ITEM}
        FROM compras p
        JOIN clientes c ON c.id = p.cliente_id
       WHERE p.status = 'pago' AND p.criado_em >= ? AND p.criado_em < ?
       ORDER BY p.criado_em DESC, p.id DESC
       LIMIT ? OFFSET ?`)
      .bind(inicioUtc, fimUtc, POR_PAGINA, offset)
      .all(),
    db.prepare(`
      SELECT COUNT(*) AS total
        FROM compras
       WHERE status = 'pago' AND criado_em >= ? AND criado_em < ?
       LIMIT 1`)
      .bind(inicioUtc, fimUtc)
      .first(),
  ])
  return {
    linhas: linhas(resultado),
    total: Number(total?.total || 0),
    por_pagina: POR_PAGINA,
  }
}

export async function comprasMpSemForma(db, { inicioUtc, fimUtc, excluir = [], limite }) {
  if (limite <= 0) return []
  const ids = excluir.map(Number).filter(Number.isInteger)
  const fora = ids.length ? ` AND id NOT IN (${ids.map(() => '?').join(', ')})` : ''
  const resultado = await db.prepare(`
    SELECT id, stripe_session_id, forma_pagamento
      FROM compras
     WHERE status = 'pago'
       AND criado_em >= ? AND criado_em < ?
       AND forma_pagamento IS NULL
       AND stripe_session_id LIKE 'mp_%'
       ${fora}
     ORDER BY criado_em DESC, id DESC
     LIMIT ?`)
    .bind(inicioUtc, fimUtc, ...ids, limite)
    .all()
  return linhas(resultado)
}

export async function consultarResumoPeriodo(db, { inicioUtc, fimUtc }) {
  const [totais, porDia] = await Promise.all([
    db.prepare(`
      WITH base AS (
        SELECT
          cliente_id,
          COALESCE(valor_centavos, 0) AS valor_centavos,
          COALESCE(
            forma_pagamento,
            CASE
              WHEN stripe_session_id LIKE 'cs_live_%' OR stripe_session_id LIKE 'cs_test_%'
              THEN 'cartao'
            END,
            'sem_info'
          ) AS forma
        FROM compras
        WHERE status = 'pago' AND criado_em >= ? AND criado_em < ?
      )
      SELECT
        COUNT(*) AS compras,
        COUNT(DISTINCT cliente_id) AS clientes,
        COALESCE(SUM(valor_centavos), 0) AS bruto_centavos,
        SUM(CASE WHEN forma = 'pix' THEN 1 ELSE 0 END) AS pix_compras,
        COALESCE(SUM(CASE WHEN forma = 'pix' THEN valor_centavos ELSE 0 END), 0) AS pix_centavos,
        SUM(CASE WHEN forma = 'cartao' THEN 1 ELSE 0 END) AS cartao_compras,
        COALESCE(SUM(CASE WHEN forma = 'cartao' THEN valor_centavos ELSE 0 END), 0) AS cartao_centavos,
        SUM(CASE WHEN forma = 'outro' THEN 1 ELSE 0 END) AS outro_compras,
        COALESCE(SUM(CASE WHEN forma = 'outro' THEN valor_centavos ELSE 0 END), 0) AS outro_centavos,
        SUM(CASE WHEN forma = 'sem_info' THEN 1 ELSE 0 END) AS sem_info_compras,
        COALESCE(SUM(CASE WHEN forma = 'sem_info' THEN valor_centavos ELSE 0 END), 0) AS sem_info_centavos
      FROM base
      LIMIT 1`)
      .bind(inicioUtc, fimUtc)
      .first(),
    db.prepare(`
      SELECT
        date(criado_em, '-3 hours') AS chave,
        COUNT(*) AS compras,
        COALESCE(SUM(valor_centavos), 0) AS centavos
      FROM compras
      WHERE status = 'pago' AND criado_em >= ? AND criado_em < ?
      GROUP BY date(criado_em, '-3 hours')
      ORDER BY chave
      LIMIT 732`)
      .bind(inicioUtc, fimUtc)
      .all(),
  ])

  const compras = Number(totais?.compras || 0)
  const bruto = Number(totais?.bruto_centavos || 0)
  return {
    totais: {
      compras,
      clientes: Number(totais?.clientes || 0),
      bruto_centavos: bruto,
      ticket_medio_centavos: compras ? Math.round(bruto / compras) : 0,
      pix: {
        compras: Number(totais?.pix_compras || 0),
        centavos: Number(totais?.pix_centavos || 0),
      },
      cartao: {
        compras: Number(totais?.cartao_compras || 0),
        centavos: Number(totais?.cartao_centavos || 0),
      },
      outro: {
        compras: Number(totais?.outro_compras || 0),
        centavos: Number(totais?.outro_centavos || 0),
      },
      sem_info: {
        compras: Number(totais?.sem_info_compras || 0),
        centavos: Number(totais?.sem_info_centavos || 0),
      },
    },
    dias: linhas(porDia),
  }
}

export async function consultarPeriodoCsv(db, { inicioUtc, fimUtc }) {
  const resultado = await db.prepare(`
    SELECT
      c.nome,
      c.email,
      c.bloqueado,
      c.supabase_id,
      (SELECT COUNT(*) FROM downloads d WHERE d.cliente_id = c.id LIMIT 1) AS downloads,
      (SELECT COUNT(*) FROM compras todas WHERE todas.cliente_id = c.id LIMIT 1) AS compras,
      p.criado_em AS compra_em,
      p.valor_centavos AS compra_valor_centavos,
      COALESCE(
        p.forma_pagamento,
        CASE
          WHEN p.stripe_session_id LIKE 'cs_live_%' OR p.stripe_session_id LIKE 'cs_test_%'
          THEN 'cartao'
        END
      ) AS compra_forma
    FROM compras p
    JOIN clientes c ON c.id = p.cliente_id
    WHERE p.status = 'pago' AND p.criado_em >= ? AND p.criado_em < ?
    ORDER BY p.criado_em DESC, p.id DESC
    LIMIT 5000`)
    .bind(inicioUtc, fimUtc)
    .all()
  return linhas(resultado)
}

export function itemPeriodoDaLinha(linha) {
  return clienteDaLinha(linha)
}
