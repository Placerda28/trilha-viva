// Saques vistos pela Gestão: fila, pagar (com comprovante) e recusar. Sem `@/`.
// Pagar e recusar são atômicos (db.batch) e só agem em saque ainda 'solicitado': repetir não faz nada.
// O sucesso é conferido relendo o saque (marcado com quem e quando), nunca pela contagem do lote.
import { dataDeTexto, somarDias, textoUtc } from './datas.js'
import { caminhoValido } from '../b2-envio.js'

export const POR_PAGINA = 20
const DIA_MS = 86400000
const STATUS = { pendentes: 'solicitado', pagos: 'pago', recusados: 'recusado', todos: null }
const LINK_PAINEL = '/minha-conta/afiliado#saques'
const reais = (c) => 'R$ ' + (Number(c) / 100).toFixed(2).replace('.', ',')

function pix(texto) {
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}

// { pagina, por_pagina, total, itens, resumo }. Nunca mais de POR_PAGINA saques e 300 créditos por resposta.
export async function listarSaques(db, { status = 'pendentes', pagina = 1 } = {}, agora = new Date()) {
  const filtro = Object.hasOwn(STATUS, status) ? STATUS[status] : STATUS.pendentes
  const pag = Number.isSafeInteger(Number(pagina)) && Number(pagina) >= 1 ? Number(pagina) : 1
  const desde = textoUtc(somarDias(agora, -30))
  const [lista, total, resumo] = await db.batch([
    db
      .prepare(
        `SELECT s.id, s.afiliado_id, a.nome, a.codigo, s.valor_centavos, s.status, s.pedido_em, s.pago_em, s.pago_por,
                s.nota, s.pix_snapshot, (s.comprovante_caminho IS NOT NULL) AS comprovante
           FROM afiliados_saques s JOIN afiliados a ON a.id = s.afiliado_id
          WHERE (?1 IS NULL OR s.status = ?1)
          ORDER BY (s.status != 'solicitado'), CASE WHEN s.status = 'solicitado' THEN s.pedido_em END ASC, s.pedido_em DESC, s.id DESC
          LIMIT ?2 OFFSET ?3`,
      )
      .bind(filtro, POR_PAGINA, (pag - 1) * POR_PAGINA),
    db.prepare('SELECT COUNT(*) AS n FROM afiliados_saques WHERE (?1 IS NULL OR status = ?1)').bind(filtro),
    db
      .prepare(
        `SELECT
           COALESCE(SUM(status = 'solicitado'), 0) AS pend_qtd,
           COALESCE(SUM(CASE WHEN status = 'solicitado' THEN valor_centavos END), 0) AS pend_valor,
           COALESCE(SUM(status = 'pago' AND pago_em >= ?1), 0) AS pagos_qtd,
           COALESCE(SUM(CASE WHEN status = 'pago' AND pago_em >= ?1 THEN valor_centavos END), 0) AS pagos_valor,
           AVG(CASE WHEN status = 'pago' AND pago_em >= ?1 THEN (julianday(pago_em) - julianday(pedido_em)) * 24 END) AS horas,
           COALESCE(SUM(status = 'recusado' AND pedido_em >= ?1), 0) AS recus_qtd
         FROM afiliados_saques`,
      )
      .bind(desde),
  ])
  const linhas = lista.results
  const ids = linhas.map((l) => Number(l.id))
  let creditos = []
  let contagens = []
  if (ids.length) {
    const marcas = ids.map(() => '?').join(',')
    const [c1, c2] = await db.batch([
      db
        .prepare(
          `SELECT saque_id, id, tipo, mes_referencia, valor_centavos, compra_id, descricao
             FROM afiliados_lancamentos WHERE saque_id IN (${marcas}) ORDER BY saque_id, id LIMIT 300`,
        )
        .bind(...ids),
      db
        .prepare(`SELECT saque_id, COUNT(*) AS n FROM afiliados_lancamentos WHERE saque_id IN (${marcas}) GROUP BY saque_id`)
        .bind(...ids),
    ])
    creditos = c1.results
    contagens = c2.results
  }
  const r = resumo.results[0] || {}
  return {
    pagina: pag,
    por_pagina: POR_PAGINA,
    total: Number(total.results[0]?.n || 0),
    itens: linhas.map((l) => ({
      id: Number(l.id),
      afiliado_id: Number(l.afiliado_id),
      nome: l.nome,
      codigo: l.codigo,
      valor_centavos: Number(l.valor_centavos),
      status: l.status,
      pedido_em: l.pedido_em,
      pago_em: l.pago_em,
      pago_por: l.pago_por,
      nota: l.nota,
      dias_esperando: l.status === 'solicitado' ? Math.max(0, Math.floor((agora - dataDeTexto(l.pedido_em)) / DIA_MS)) : null,
      pix: pix(l.pix_snapshot),
      comprovante: Boolean(l.comprovante),
      creditos_qtd: Number(contagens.find((c) => Number(c.saque_id) === Number(l.id))?.n || 0),
      creditos: creditos
        .filter((c) => Number(c.saque_id) === Number(l.id))
        .map(({ saque_id, ...resto }) => resto), // eslint-disable-line no-unused-vars
    })),
    resumo: {
      pendentes_qtd: Number(r.pend_qtd || 0),
      pendentes_valor_centavos: Number(r.pend_valor || 0),
      pagos_30d_qtd: Number(r.pagos_qtd || 0),
      pagos_30d_valor_centavos: Number(r.pagos_valor || 0),
      tempo_medio_horas: r.horas == null ? null : Math.round(Number(r.horas) * 10) / 10,
      recusados_30d_qtd: Number(r.recus_qtd || 0),
    },
  }
}

// Saque + dados do afiliado para e-mail e comprovante. null se não existir.
export async function saquePorId(db, saqueId) {
  const s = await db
    .prepare(
      `SELECT s.id, s.afiliado_id, s.valor_centavos, s.status, s.pago_em, s.nota, s.comprovante_caminho,
              a.nome, a.codigo, c.email
         FROM afiliados_saques s JOIN afiliados a ON a.id = s.afiliado_id JOIN clientes c ON c.id = a.cliente_id
        WHERE s.id = ?`,
    )
    .bind(saqueId)
    .first()
  return s ? { ...s, id: Number(s.id), afiliado_id: Number(s.afiliado_id), valor_centavos: Number(s.valor_centavos) } : null
}

const jaTratado = (depois) => ({
  ok: false,
  motivo: `Este saque já está ${depois.status === 'pago' ? 'pago' : 'recusado'}.`,
  jaTratado: true,
})

// Grava o caminho do comprovante já enviado ao B2 (só saque 'solicitado'). true se gravou.
export async function gravarComprovante(db, { saqueId, caminho }) {
  const { results } = await db
    .prepare("UPDATE afiliados_saques SET comprovante_caminho = ? WHERE id = ? AND status = 'solicitado' RETURNING id")
    .bind(caminho, saqueId)
    .all()
  return results.length > 0
}

// Vencedor = quem recebeu a linha do UPDATE ... RETURNING (decidido pelo banco, não por releitura).
// Paga usando SÓ o comprovante gravado no banco pelo upload.
// { ok: true, saque } se ESTE pedido pagou; { ok: false, motivo, jaTratado?, semComprovante? } caso contrário.
export async function marcarPago(db, { saqueId, quem, agora = new Date() }) {
  const antes = await saquePorId(db, saqueId)
  if (!antes) return { ok: false, motivo: 'Saque não encontrado.', naoEncontrado: true }
  if (antes.status !== 'solicitado') return jaTratado(antes)
  // Caminho fora do formato do servidor (id + uuid + pdf/jpg/png) nunca vira link: vale como sem comprovante.
  if (!caminhoValido(saqueId, antes.comprovante_caminho)) return { ok: false, motivo: 'Anexe o comprovante antes de marcar como pago.', semComprovante: true }
  const t = textoUtc(agora)
  const por = String(quem || '').trim().toLowerCase()
  const [upd] = await db.batch([
    db
      .prepare(
        `UPDATE afiliados_saques SET status = 'pago', pago_em = ?2, pago_por = ?3
          WHERE id = ?1 AND status = 'solicitado' AND comprovante_caminho IS NOT NULL RETURNING id`,
      )
      .bind(saqueId, t, por),
    db
      .prepare(
        `UPDATE afiliados_lancamentos SET status = 'paga'
          WHERE saque_id = ?1 AND status = 'em_saque'
            AND EXISTS (SELECT 1 FROM afiliados_saques WHERE id = ?1 AND status = 'pago' AND pago_em = ?2 AND pago_por = ?3)`,
      )
      .bind(saqueId, t, por),
    db
      .prepare(
        `INSERT INTO afiliados_avisos (afiliado_id, tipo, titulo, texto, link, criado_em)
         SELECT s.afiliado_id, 'saque_pago', ?4, ?5, '${LINK_PAINEL}', ?2 FROM afiliados_saques s
          WHERE s.id = ?1 AND s.status = 'pago' AND s.pago_em = ?2 AND s.pago_por = ?3
            AND NOT EXISTS (SELECT 1 FROM afiliados_avisos x WHERE x.afiliado_id = s.afiliado_id AND x.tipo = 'saque_pago' AND x.criado_em >= s.pedido_em)`,
      )
      .bind(
        saqueId,
        t,
        por,
        `Seu saque de ${reais(antes.valor_centavos)} foi pago`,
        'O comprovante foi enviado para o seu e-mail e fica disponível aqui, na aba Saques.',
      ),
  ])
  const depois = await saquePorId(db, saqueId)
  if (upd.results.length > 0) return { ok: true, saque: depois }
  return jaTratado(depois)
}

export async function recusar(db, { saqueId, motivo, quem, agora = new Date() }) {
  const texto = String(motivo || '').trim()
  if (texto.length < 3) return { ok: false, motivo: 'Escreva o motivo da recusa.' }
  if (texto.length > 500) return { ok: false, motivo: 'O motivo pode ter até 500 letras.' }
  const antes = await saquePorId(db, saqueId)
  if (!antes) return { ok: false, motivo: 'Saque não encontrado.', naoEncontrado: true }
  if (antes.status !== 'solicitado') return jaTratado(antes)
  const t = textoUtc(agora)
  const por = String(quem || '').trim().toLowerCase()
  const [upd] = await db.batch([
    db
      .prepare(`UPDATE afiliados_saques SET status = 'recusado', nota = ?2, pago_por = ?3 WHERE id = ?1 AND status = 'solicitado' RETURNING id`)
      .bind(saqueId, texto, por),
    db
      .prepare(
        `UPDATE afiliados_lancamentos SET status = 'pendente', saque_id = NULL
          WHERE saque_id = ?1 AND status = 'em_saque'
            AND EXISTS (SELECT 1 FROM afiliados_saques WHERE id = ?1 AND status = 'recusado' AND nota = ?2 AND pago_por = ?3)`,
      )
      .bind(saqueId, texto, por),
    db
      .prepare(
        `INSERT INTO afiliados_avisos (afiliado_id, tipo, titulo, texto, link, criado_em)
         SELECT s.afiliado_id, 'saque_recusado', ?4, ?5, '${LINK_PAINEL}', ?6 FROM afiliados_saques s
          WHERE s.id = ?1 AND s.status = 'recusado' AND s.nota = ?2 AND s.pago_por = ?3
            AND NOT EXISTS (SELECT 1 FROM afiliados_avisos x WHERE x.afiliado_id = s.afiliado_id AND x.tipo = 'saque_recusado' AND x.criado_em >= s.pedido_em)`,
      )
      .bind(
        saqueId,
        texto,
        por,
        `Seu saque de ${reais(antes.valor_centavos)} foi recusado`,
        `Motivo: ${texto}. Os valores voltaram ao seu saldo.`,
        t,
      ),
  ])
  const depois = await saquePorId(db, saqueId)
  if (upd.results.length > 0) return { ok: true, saque: depois, motivo: texto }
  return jaTratado(depois)
}
