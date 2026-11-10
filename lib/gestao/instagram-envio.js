import {
  MSG_JANELA_VENCIDA,
  configuracaoInstagram,
  dentroDaJanela,
  enviarTexto,
  explicarErroMeta,
} from '../instagram-meta.js'
import { IGSID_VALIDO } from './instagram.js'

// O que a gestão faz no Instagram: responder (único caminho de envio do
// sistema, sempre no clique de um admin), descartar, gerar de novo e
// ligar/desligar a IA. A janela de 24 h é conferida AQUI, no servidor.

export const TAMANHO_RESPOSTA = 1000
const ABERTOS = ['pendente', 'respondido_no_app', 'gerando']

const recusa = (erro, status = 400) => ({ ok: false, erro, status })

export function validarEnvio(corpo) {
  const igsid = String(corpo?.igsid || '')
  if (!IGSID_VALIDO.test(igsid)) return recusa('Conversa inválida.')
  const texto = String(corpo?.texto || '').trim()
  if (!texto) return recusa('Escreva a resposta.')
  if (texto.length > TAMANHO_RESPOSTA || new TextEncoder().encode(texto).length > TAMANHO_RESPOSTA) {
    return recusa('Texto longo demais para o Instagram: o limite é de 1.000 bytes (letra com acento conta em dobro).')
  }
  const bruto = corpo?.rascunho_id
  const rascunhoId = bruto == null ? null : Number(bruto)
  if (rascunhoId !== null && !(Number.isSafeInteger(rascunhoId) && rascunhoId > 0)) return recusa('Rascunho inválido.')
  return { ok: true, igsid, texto, rascunhoId }
}

// Confere que o rascunho é desta conversa e ainda está aberto.
async function conferirRascunho(db, igsid, rascunhoId) {
  if (rascunhoId === null) return { ok: true, rascunho: null }
  const r = await db.prepare(
    'SELECT id, igsid, texto, status FROM instagram_rascunhos WHERE id = ? LIMIT 1'
  ).bind(rascunhoId).first()
  if (!r || r.igsid !== igsid) return recusa('Rascunho inválido.')
  if (!ABERTOS.includes(r.status)) return recusa('Este rascunho já foi tratado. Atualize a conversa.', 409)
  return { ok: true, rascunho: r }
}

const mudou = (feito) => Number(feito?.meta?.changes || 0) === 1
const JA_TRATADO = 'Este envio já está em andamento ou já foi feito. Atualize a conversa.'

// Hash curto (FNV-1a) só para a chave da trava; não precisa ser secreto.
function hashCurto(texto) {
  let h = 0x811c9dc5
  for (const byte of new TextEncoder().encode(texto)) h = Math.imul(h ^ byte, 0x01000193) >>> 0
  return h.toString(36)
}

export const ehTrava = (idMsg) => String(idMsg || '').startsWith('trava:')

// TRAVA ATÔMICA, antes de chamar a Meta: com rascunho, o UPDATE de status; sem rascunho,
// uma linha de saída 'trava:...' (UNIQUE do ig_msg_id: o mesmo texto no mesmo minuto não passa 2 vezes).
async function travar(db, { igsid, texto, quem, rascunho }, agora) {
  if (rascunho) {
    const feito = await db.prepare(`
      UPDATE instagram_rascunhos SET status = 'enviado', decidido_em = datetime('now'), decidido_por = ?
       WHERE id = ? AND igsid = ? AND status IN ('pendente', 'respondido_no_app', 'gerando')`)
      .bind(quem || null, rascunho.id, igsid).run()
    return mudou(feito) ? { ok: true } : recusa(JA_TRATADO, 409)
  }
  const chave = `trava:${igsid}:${hashCurto(texto)}:${agora.toISOString().slice(0, 16)}`
  const feito = await db.prepare(`
    INSERT INTO instagram_mensagens (ig_msg_id, igsid, direcao, texto, enviado_por)
    VALUES (?, ?, 'saida', ?, ?) ON CONFLICT(ig_msg_id) DO NOTHING`)
    .bind(chave, igsid, texto, quem || null).run()
  return mudou(feito) ? { ok: true, chave } : recusa(JA_TRATADO, 409)
}

// A Meta recusou: devolve o rascunho para pendente / apaga a trava.
async function destravar(db, { rascunho }, chave) {
  if (rascunho) {
    await db.prepare(`
      UPDATE instagram_rascunhos SET status = 'pendente', decidido_em = NULL, decidido_por = NULL
       WHERE id = ? AND status = 'enviado' AND texto_enviado IS NULL`).bind(rascunho.id).run()
  } else {
    await db.prepare('DELETE FROM instagram_mensagens WHERE ig_msg_id = ?').bind(chave).run()
  }
}

// Depois do envio: grava o id real (o eco da Meta pode ter chegado antes) e fecha o rascunho.
function gravacoes(db, { igsid, texto, quem, rascunho }, messageId, chave) {
  const dono = rascunho?.id ?? null
  if (!rascunho) {
    return [
      db.prepare('UPDATE instagram_mensagens SET enviado_por = ? WHERE ig_msg_id = ?').bind(quem || null, messageId),
      db.prepare('DELETE FROM instagram_mensagens WHERE ig_msg_id = ? AND EXISTS (SELECT 1 FROM instagram_mensagens WHERE ig_msg_id = ?)')
        .bind(chave, messageId),
      db.prepare('UPDATE instagram_mensagens SET ig_msg_id = ? WHERE ig_msg_id = ?').bind(messageId, chave),
    ]
  }
  const status = String(rascunho.texto || '').trim() === texto ? 'enviado' : 'editado'
  return [
    db.prepare(`
      INSERT INTO instagram_mensagens (ig_msg_id, igsid, direcao, texto, enviado_por, rascunho_id)
      VALUES (?, ?, 'saida', ?, ?, ?)
      ON CONFLICT(ig_msg_id) DO UPDATE SET enviado_por = excluded.enviado_por, rascunho_id = excluded.rascunho_id`)
      .bind(messageId, igsid, texto, quem || null, dono),
    db.prepare("UPDATE instagram_rascunhos SET status = ?, texto_enviado = ? WHERE id = ? AND status = 'enviado'")
      .bind(status, texto, dono),
  ]
}

export async function responderConversa(db, env, { igsid, texto, rascunhoId = null, quem }, fetchImpl = globalThis.fetch, agora = new Date()) {
  if (!configuracaoInstagram(env).ok) return recusa('O Instagram ainda não está configurado.', 503)

  const entrada = await db.prepare(
    "SELECT criado_em FROM instagram_mensagens WHERE igsid = ? AND direcao = 'entrada' ORDER BY id DESC LIMIT 1"
  ).bind(igsid).first()
  if (!entrada) return recusa('Conversa não encontrada.')
  if (!dentroDaJanela(entrada.criado_em, agora)) return recusa(MSG_JANELA_VENCIDA)

  const conferido = await conferirRascunho(db, igsid, rascunhoId)
  if (!conferido.ok) return conferido
  const pedido = { igsid, texto, quem, rascunho: conferido.rascunho }
  const trava = await travar(db, pedido, agora)
  if (!trava.ok) return trava

  let messageId
  try {
    messageId = await enviarTexto(env, igsid, texto, fetchImpl)
  } catch (erro) {
    console.error('Resposta pelo Instagram não enviada:', erro?.message || erro)
    // Sem resposta a tempo não se sabe se saiu: a trava fica, para não enviar em dobro.
    if (erro?.name === 'AbortError') {
      return { ...recusa('A Meta não respondeu a tempo. Confira a conversa antes de enviar de novo: a mensagem pode ter saído.', 502) }
    }
    await destravar(db, pedido, trava.chave)
    return { ...recusa(explicarErroMeta(erro), 502), codigo: erro?.codigo ?? null }
  }
  try {
    await db.batch(gravacoes(db, pedido, messageId, trava.chave))
  } catch (erro) {
    // Já saiu para o cliente: não pedir para enviar de novo. O eco da Meta completa o histórico.
    console.error('Instagram: enviada, mas não anotada:', erro?.message || erro)
    return { ok: true, aviso: 'A mensagem foi enviada, mas não consegui anotar aqui. Ela aparece em instantes.' }
  }
  return { ok: true }
}

// Só rascunho pendente se descarta; devolve o igsid para o registro.
export async function descartarRascunho(db, { rascunhoId, quem }) {
  const id = Number(rascunhoId)
  if (!Number.isSafeInteger(id) || id <= 0) return recusa('Rascunho inválido.')
  const r = await db.prepare('SELECT igsid FROM instagram_rascunhos WHERE id = ? LIMIT 1').bind(id).first()
  if (!r) return recusa('Rascunho inválido.')
  const feito = await db.prepare(`
    UPDATE instagram_rascunhos SET status = 'descartado', decidido_em = datetime('now'), decidido_por = ?
     WHERE id = ? AND status = 'pendente'`).bind(quem || null, id).run()
  if (!Number(feito?.meta?.changes || 0)) return recusa('Este rascunho já foi tratado. Atualize a conversa.', 409)
  return { ok: true, igsid: r.igsid }
}

// "Gerar de novo": só marca o rascunho da última pergunta como substituído.
// O robô (cron) escreve o novo em até 10 min; o site não tem IA.
export async function regenerarRascunho(db, { igsid }) {
  if (!IGSID_VALIDO.test(String(igsid || ''))) return recusa('Conversa inválida.')
  const estado = await db.prepare('SELECT ia_ligada FROM instagram_estado WHERE id = 1 LIMIT 1').first()
  if (!Number(estado?.ia_ligada || 0)) return recusa('A IA está pausada; ligue-a para gerar um novo rascunho.', 409)
  const feito = await db.prepare(`
    UPDATE instagram_rascunhos SET status = 'substituido'
     WHERE igsid = ?
       AND ate_mensagem_id = (SELECT MAX(id) FROM instagram_mensagens WHERE igsid = ? AND direcao = 'entrada')
       AND status IN ('pendente', 'falhou', 'descartado')`).bind(igsid, igsid).run()
  if (!Number(feito?.meta?.changes || 0)) {
    return recusa('Não há rascunho para trocar agora. Se ele ainda está sendo escrito, espere um pouco.', 409)
  }
  return { ok: true }
}

export function ligadaValida(valor) {
  if (valor === true || valor === 1) return true
  if (valor === false || valor === 0) return false
  return null
}

export async function mudarEstadoInstagram(db, { ligada, quem }) {
  await db.prepare(`
    UPDATE instagram_estado SET ia_ligada = ?, atualizado_em = datetime('now'), atualizado_por = ? WHERE id = 1`)
    .bind(ligada ? 1 : 0, quem || null).run()
  return { ok: true, ia_ligada: ligada }
}
