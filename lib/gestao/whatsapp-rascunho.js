import { isoUtc } from './clientes.js'
import { responderConversa, telefoneDaConversa, validarResposta } from './whatsapp-envio.js'

// Rascunhos de resposta da IA no WhatsApp. A IA (robô) só sugere; o envio acontece
// aqui, no clique de um admin, pelo mesmo responderConversa da resposta manual.

const recusa = (erro, status = 400) => ({ ok: false, erro, status })
const mudou = (feito) => Number(feito?.meta?.changes || 0) === 1
const JA_TRATADO = 'Este rascunho já foi tratado. Atualize a conversa.'

const idValido = (v) => (Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null)

function paraTela(r) {
  return {
    id: r.id,
    status: r.status,
    texto: r.texto || '',
    precisa_humano: Boolean(Number(r.precisa_humano || 0)),
    motivo: r.motivo || null,
    criado_em: isoUtc(r.criado_em),
    desatualizado: Number(r.ate_mensagem_id) < Number(r.ultima_entrada_id || 0),
  }
}

// Rascunhos que a tela mostra: abertos (gerando/pendente) e o que falhou na última pergunta.
// Uma consulta para a lista toda; no máximo um por telefone (o mais novo).
export async function anexarRascunhos(db, conversas) {
  const { results } = await db.prepare(`
    SELECT r.id, r.telefone, r.ate_mensagem_id, r.texto, r.precisa_humano, r.motivo, r.status, r.criado_em,
           (SELECT MAX(m.id) FROM whatsapp_mensagens m WHERE m.telefone = r.telefone AND m.direcao = 'entrada') AS ultima_entrada_id
      FROM whatsapp_rascunhos r
     WHERE r.status IN ('gerando', 'pendente')
        OR (r.status = 'falhou' AND r.ate_mensagem_id = (
             SELECT MAX(m.id) FROM whatsapp_mensagens m WHERE m.telefone = r.telefone AND m.direcao = 'entrada'))
     ORDER BY r.id DESC LIMIT 200`).all()
  const porTelefone = new Map()
  for (const r of results || []) if (!porTelefone.has(r.telefone)) porTelefone.set(r.telefone, paraTela(r))
  return conversas.map((c) => ({ ...c, rascunho: porTelefone.get(c.telefone) || null }))
}

// Resposta manual: a sugestão pendente dessa conversa ficou velha.
export async function marcarRespondidoNoApp(db, telefone, quem) {
  await db.prepare(`
    UPDATE whatsapp_rascunhos SET status = 'respondido_no_app', decidido_em = datetime('now'), decidido_por = ?
     WHERE telefone = ? AND status = 'pendente'`).bind(quem || null, telefone).run()
}

// Envia o rascunho (texto possivelmente editado). Trava atômica ANTES de falar com a Meta.
export async function enviarRascunho(db, env, { rascunhoId, telefone, texto, quem }, fetchImpl = globalThis.fetch) {
  const id = idValido(rascunhoId)
  if (!id) return recusa('Rascunho inválido.')
  const valida = validarResposta({ telefone, texto })
  if (!valida.ok) return recusa(valida.erro)
  const r = await db.prepare('SELECT telefone, texto FROM whatsapp_rascunhos WHERE id = ? LIMIT 1').bind(id).first()
  if (!r || r.telefone !== valida.telefone) return recusa('Rascunho inválido.')

  const trava = await db.prepare(`
    UPDATE whatsapp_rascunhos SET status = 'enviado', decidido_em = datetime('now'), decidido_por = ?
     WHERE id = ? AND status = 'pendente'`).bind(quem || null, id).run()
  if (!mudou(trava)) return recusa(JA_TRATADO, 409)

  const res = await responderConversa(db, env, { telefone: valida.telefone, texto: valida.texto, quem }, fetchImpl)
  if (!res.ok) {
    // Sem resposta a tempo não se sabe se saiu: a trava fica, para não enviar em dobro.
    if (!(res.status === 502 && String(res.erro).startsWith('A Meta não respondeu a tempo'))) {
      await db.prepare(`
        UPDATE whatsapp_rascunhos SET status = 'pendente', decidido_em = NULL, decidido_por = NULL
         WHERE id = ? AND status = 'enviado' AND texto_enviado IS NULL`).bind(id).run()
    }
    return res
  }
  const status = String(r.texto || '').trim() === valida.texto ? 'enviado' : 'editado'
  await db.prepare("UPDATE whatsapp_rascunhos SET status = ?, texto_enviado = ? WHERE id = ? AND status = 'enviado'")
    .bind(status, valida.texto, id).run()
  return { ok: true, telefone: valida.telefone }
}

export async function descartarRascunho(db, { rascunhoId, quem }) {
  const id = idValido(rascunhoId)
  if (!id) return recusa('Rascunho inválido.')
  const r = await db.prepare('SELECT telefone FROM whatsapp_rascunhos WHERE id = ? LIMIT 1').bind(id).first()
  if (!r) return recusa('Rascunho inválido.')
  const feito = await db.prepare(`
    UPDATE whatsapp_rascunhos SET status = 'descartado', decidido_em = datetime('now'), decidido_por = ?
     WHERE id = ? AND status = 'pendente'`).bind(quem || null, id).run()
  return mudou(feito) ? { ok: true, telefone: r.telefone } : recusa(JA_TRATADO, 409)
}

// "Gerar outra": só marca como substituído; o robô (cron de 10 min) escreve o novo.
export async function regenerarRascunho(db, { telefone }) {
  const tel = telefoneDaConversa(telefone)
  if (!tel) return recusa('Conversa inválida.')
  const estado = await db.prepare('SELECT ia_ligada FROM whatsapp_ia_estado WHERE id = 1 LIMIT 1').first()
  if (!Number(estado?.ia_ligada || 0)) return recusa('A IA está pausada; ligue-a para gerar uma nova sugestão.', 409)
  const feito = await db.prepare(`
    UPDATE whatsapp_rascunhos SET status = 'substituido'
     WHERE telefone = ?
       AND ate_mensagem_id = (SELECT MAX(id) FROM whatsapp_mensagens WHERE telefone = ? AND direcao = 'entrada')
       AND status IN ('pendente', 'falhou', 'descartado')`).bind(tel, tel).run()
  if (!Number(feito?.meta?.changes || 0)) {
    return recusa('Não há sugestão para trocar agora. Se ela ainda está sendo escrita, espere um pouco.', 409)
  }
  return { ok: true, telefone: tel }
}

export async function lerEstadoIa(db) {
  const e = await db.prepare(
    'SELECT ia_ligada, atualizado_em, atualizado_por FROM whatsapp_ia_estado WHERE id = 1 LIMIT 1'
  ).first()
  return {
    ia_ligada: Boolean(Number(e?.ia_ligada || 0)),
    atualizado_em: isoUtc(e?.atualizado_em),
    atualizado_por: e?.atualizado_por || null,
  }
}

export async function mudarEstadoIa(db, { ligada, quem }) {
  if (typeof ligada !== 'boolean') return recusa('Ação inválida.')
  await db.prepare(`
    UPDATE whatsapp_ia_estado SET ia_ligada = ?, atualizado_em = datetime('now'), atualizado_por = ? WHERE id = 1`)
    .bind(ligada ? 1 : 0, quem || null).run()
  return { ok: true, ia_ligada: ligada }
}
