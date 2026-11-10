import { isoUtc } from './clientes.js'
import { horasRestantes } from '../instagram-meta.js'

// Instagram na gestão: o que as telas leem. Toda consulta tem LIMIT. As
// escritas (enviar, descartar, gerar de novo, liga/desliga) ficam em
// instagram-envio.js; a qualidade (Etapa 6) em instagram-qualidade.js.

const CONVERSAS = 50
const MENSAGENS = 30
// Conversa mais velha que isso não tem janela aberta nem rascunho em andamento.
const DIAS_DA_LISTA = 30

export const IGSID_VALIDO = /^[A-Za-z0-9_.-]{1,64}$/

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

// Conversas cuja última mensagem é do cliente e a janela de 24 h ainda está aberta (1 consulta).
export function prepararContagemEsperando(db) {
  return db.prepare(`
    SELECT COUNT(*) AS n
      FROM instagram_mensagens m
     WHERE m.direcao = 'entrada'
       AND m.criado_em > datetime('now', '-24 hours')
       AND NOT EXISTS (
         SELECT 1 FROM instagram_mensagens s WHERE s.igsid = m.igsid AND s.id > m.id
            AND (s.ig_msg_id IS NULL OR s.ig_msg_id NOT LIKE 'trava:%') LIMIT 1
       )`)
}

export async function lerEstadoInstagram(db) {
  const e = await db.prepare(
    'SELECT ia_ligada, atualizado_em, atualizado_por FROM instagram_estado WHERE id = 1 LIMIT 1'
  ).first()
  return {
    ia_ligada: Boolean(Number(e?.ia_ligada || 0)),
    atualizado_em: isoUtc(e?.atualizado_em),
    atualizado_por: e?.atualizado_por || null,
  }
}

function arredondar(horas) {
  return horas > 0 ? Math.round(horas * 10) / 10 : 0
}

function itemDaLista(c, agora) {
  const horas = horasRestantes(c.ultima_entrada_em, agora)
  return {
    igsid: c.igsid,
    usuario: c.usuario || null,
    nome: c.nome_perfil || null,
    ultima: { direcao: c.direcao, texto: c.texto, midia_tipo: c.midia_tipo || null },
    ultima_em: isoUtc(c.criado_em),
    ultima_entrada_em: isoUtc(c.ultima_entrada_em),
    janela_aberta: horas > 0,
    horas_restantes: arredondar(horas),
    esperando: horas > 0 && c.direcao === 'entrada',
    rascunho_pendente: c.rascunho_status === 'pendente',
    rascunho_gerando: c.rascunho_status === 'gerando',
    precisa_humano: Boolean(Number(c.precisa_humano || 0)),
  }
}

// A lista: até 50 conversas, da mais recente para a mais antiga, com o estado da IA.
export async function consultarConversas(db, agora = new Date()) {
  const [lista, estado] = await Promise.all([
    db.prepare(`
      SELECT m.igsid, m.direcao, m.texto, m.midia_tipo, m.criado_em,
             (SELECT u.usuario FROM instagram_mensagens u
               WHERE u.igsid = m.igsid AND u.usuario IS NOT NULL ORDER BY u.id DESC LIMIT 1) AS usuario,
             (SELECT u.nome_perfil FROM instagram_mensagens u
               WHERE u.igsid = m.igsid AND u.nome_perfil IS NOT NULL ORDER BY u.id DESC LIMIT 1) AS nome_perfil,
             (SELECT MAX(e.criado_em) FROM instagram_mensagens e
               WHERE e.igsid = m.igsid AND e.direcao = 'entrada') AS ultima_entrada_em,
             (SELECT r.status FROM instagram_rascunhos r
               WHERE r.igsid = m.igsid AND r.status IN ('gerando', 'pendente') LIMIT 1) AS rascunho_status,
             (SELECT r.precisa_humano FROM instagram_rascunhos r
               WHERE r.igsid = m.igsid AND r.status = 'pendente' LIMIT 1) AS precisa_humano
        FROM instagram_mensagens m
       WHERE m.id IN (
         SELECT MAX(id) FROM instagram_mensagens
          WHERE criado_em > datetime('now', '-${DIAS_DA_LISTA} days')
            AND (ig_msg_id IS NULL OR ig_msg_id NOT LIKE 'trava:%')
          GROUP BY igsid ORDER BY MAX(id) DESC LIMIT ${CONVERSAS}
       )
       ORDER BY m.id DESC
       LIMIT ${CONVERSAS}`).all(),
    lerEstadoInstagram(db),
  ])
  return { estado, conversas: linhas(lista).map((c) => itemDaLista(c, agora)) }
}

function mensagemDaLinha(m) {
  return {
    id: m.id,
    direcao: m.direcao,
    texto: m.texto || '',
    midia_tipo: m.midia_tipo || null, // a URL da mídia expira e não sai do servidor
    enviado_por: m.enviado_por || null,
    em: isoUtc(m.criado_em),
  }
}

function rascunhoDaLinha(r, ultimaEntradaId) {
  if (!r) return null
  return {
    id: r.id,
    status: r.status,
    texto: r.texto || '',
    situacao: r.situacao || null,
    precisa_humano: Boolean(Number(r.precisa_humano || 0)),
    motivo: r.motivo || null,
    criado_em: isoUtc(r.criado_em),
    // Chegou mensagem nova depois do rascunho: ele responde a uma pergunta antiga.
    desatualizado: Number(r.ate_mensagem_id) < Number(ultimaEntradaId || 0),
  }
}

// Uma conversa: últimas 30 mensagens (da mais antiga para a mais nova) e o rascunho aberto.
export async function consultarConversa(db, igsid, agora = new Date()) {
  const [mensagens, rascunho, entrada, perfil] = await db.batch([
    db.prepare(`
      SELECT id, direcao, texto, midia_tipo, enviado_por, criado_em
        FROM instagram_mensagens WHERE igsid = ? AND (ig_msg_id IS NULL OR ig_msg_id NOT LIKE 'trava:%') ORDER BY id DESC LIMIT ${MENSAGENS}`).bind(igsid),
    db.prepare(`
      SELECT id, ate_mensagem_id, texto, situacao, precisa_humano, motivo, status, criado_em
        FROM instagram_rascunhos WHERE igsid = ? AND status IN ('gerando', 'pendente') LIMIT 1`).bind(igsid),
    db.prepare(`
      SELECT id, criado_em FROM instagram_mensagens
       WHERE igsid = ? AND direcao = 'entrada' ORDER BY id DESC LIMIT 1`).bind(igsid),
    db.prepare(`
      SELECT usuario, nome_perfil FROM instagram_mensagens
       WHERE igsid = ? AND (usuario IS NOT NULL OR nome_perfil IS NOT NULL) ORDER BY id DESC LIMIT 1`).bind(igsid),
  ])
  const lista = linhas(mensagens)
  if (!lista.length) return null
  const ultimaEntrada = linhas(entrada)[0] || null
  const horas = horasRestantes(ultimaEntrada?.criado_em, agora)
  return {
    igsid,
    usuario: linhas(perfil)[0]?.usuario || null,
    nome: linhas(perfil)[0]?.nome_perfil || null,
    janela_aberta: horas > 0,
    horas_restantes: arredondar(horas),
    ultima_entrada_em: isoUtc(ultimaEntrada?.criado_em),
    mensagens: lista.reverse().map(mensagemDaLinha),
    rascunho: rascunhoDaLinha(linhas(rascunho)[0], ultimaEntrada?.id),
  }
}
