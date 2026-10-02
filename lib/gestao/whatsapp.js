import { isoUtc } from './clientes.js'
import {
  CUSTO_MENSAGEM_CENTAVOS,
  chamarMeta,
  configuracaoMeta,
  pedidoTexto,
  telefoneSemPais,
} from '../whatsapp-meta.js'

// Conversas do WhatsApp na gestão: as respostas dos clientes ao lembrete e o
// que a equipe respondeu. A Meta só deixa mandar texto livre até 24 h depois
// da última mensagem do cliente; depois disso, só ele pode reabrir a conversa.

const CONVERSAS = 50
const MENSAGENS_POR_CONVERSA = 30
const TAMANHO_RESPOSTA = 1000

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

export function telefoneDaConversa(valor) {
  const telefone = telefoneSemPais(valor)
  return telefone.length === 10 || telefone.length === 11 ? telefone : null
}

export function validarResposta(corpo) {
  const telefone = telefoneDaConversa(corpo?.telefone)
  if (!telefone) return { ok: false, erro: 'Conversa inválida.' }
  const texto = String(corpo?.texto || '').trim()
  if (!texto) return { ok: false, erro: 'Escreva a resposta.' }
  if (texto.length > TAMANHO_RESPOSTA) {
    return { ok: false, erro: `A resposta pode ter até ${TAMANHO_RESPOSTA} caracteres.` }
  }
  return { ok: true, telefone, texto }
}

export async function totaisWhatsapp(db) {
  const linha = await db.prepare(`
    SELECT
      COUNT(*) AS enviados,
      SUM(CASE WHEN whatsapp_status IN ('delivered', 'read') THEN 1 ELSE 0 END) AS entregues,
      SUM(CASE WHEN whatsapp_status = 'read' THEN 1 ELSE 0 END) AS lidos,
      SUM(CASE WHEN whatsapp_status = 'failed' THEN 1 ELSE 0 END) AS falharam,
      SUM(CASE WHEN EXISTS (
            SELECT 1 FROM carrinhos pago
             WHERE pago.email = c.email AND pago.pago_em > c.whatsapp_enviado_em
             LIMIT 1
          ) THEN 1 ELSE 0 END) AS recuperados
      FROM carrinhos c
     WHERE c.whatsapp_enviado_em IS NOT NULL
     LIMIT 1`).first()
  const enviados = Number(linha?.enviados || 0)
  return {
    enviados,
    entregues: Number(linha?.entregues || 0),
    lidos: Number(linha?.lidos || 0),
    falharam: Number(linha?.falharam || 0),
    recuperados: Number(linha?.recuperados || 0),
    custo_estimado_centavos: enviados * CUSTO_MENSAGEM_CENTAVOS,
  }
}

export async function consultarConversas(db) {
  const conversas = linhas(
    await db.prepare(`
      SELECT telefone,
             MAX(criado_em) AS ultima_em,
             MAX(CASE WHEN direcao = 'entrada' THEN criado_em END) AS ultima_entrada_em,
             MAX(CASE WHEN direcao = 'entrada' THEN criado_em END) > datetime('now', '-24 hours') AS janela_aberta
        FROM whatsapp_mensagens
       GROUP BY telefone
       ORDER BY ultima_em DESC
       LIMIT ${CONVERSAS}`).all()
  )
  if (!conversas.length) return []

  const telefones = conversas.map((c) => c.telefone)
  const marcadores = telefones.map(() => '?').join(', ')
  const [mensagens, pessoas] = await Promise.all([
    db.prepare(`
      SELECT telefone, direcao, texto, nome_perfil, enviado_por, criado_em
        FROM (
          SELECT m.*, ROW_NUMBER() OVER (PARTITION BY telefone ORDER BY criado_em DESC, id DESC) AS ordem
            FROM whatsapp_mensagens m
           WHERE telefone IN (${marcadores})
        )
       WHERE ordem <= ${MENSAGENS_POR_CONVERSA}
       ORDER BY criado_em ASC, id ASC`).bind(...telefones).all(),
    db.prepare(`
      SELECT telefone, nome, email
        FROM (
          SELECT telefone, nome, email,
                 ROW_NUMBER() OVER (PARTITION BY telefone ORDER BY criado_em DESC, id DESC) AS ordem
            FROM carrinhos
           WHERE telefone IN (${marcadores})
        )
       WHERE ordem = 1`).bind(...telefones).all(),
  ])

  const porTelefone = new Map(conversas.map((c) => [c.telefone, []]))
  const perfis = new Map()
  for (const m of linhas(mensagens)) {
    porTelefone.get(m.telefone)?.push({
      direcao: m.direcao,
      texto: m.texto,
      enviado_por: m.enviado_por || null,
      em: isoUtc(m.criado_em),
    })
    if (m.direcao === 'entrada' && m.nome_perfil) perfis.set(m.telefone, m.nome_perfil)
  }
  const doCarrinho = new Map(linhas(pessoas).map((p) => [p.telefone, p]))

  return conversas.map((c) => ({
    telefone: c.telefone,
    nome: doCarrinho.get(c.telefone)?.nome || perfis.get(c.telefone) || null,
    nome_perfil: perfis.get(c.telefone) || null,
    email: doCarrinho.get(c.telefone)?.email || null,
    ultima_em: isoUtc(c.ultima_em),
    ultima_entrada_em: isoUtc(c.ultima_entrada_em),
    janela_aberta: Boolean(Number(c.janela_aberta || 0)),
    mensagens: porTelefone.get(c.telefone) || [],
  }))
}

// Resposta pela gestão. A janela de 24 h é conferida AQUI (no servidor), não
// só na tela: fora dela a Meta recusaria e cobraria a tentativa.
export async function responderConversa(db, env, { telefone, texto, quem }, fetchImpl = globalThis.fetch) {
  if (!configuracaoMeta(env).ok) return { ok: false, erro: 'O WhatsApp ainda não está configurado.', status: 503 }

  const janela = await db.prepare(`
    SELECT MAX(criado_em) > datetime('now', '-24 hours') AS aberta
      FROM whatsapp_mensagens
     WHERE telefone = ? AND direcao = 'entrada'
     LIMIT 1`).bind(telefone).first()
  if (!Number(janela?.aberta || 0)) {
    return {
      ok: false,
      erro: 'Janela de 24 h fechada — o cliente precisa escrever de novo.',
      status: 409,
    }
  }

  let id
  try {
    id = await chamarMeta(env, pedidoTexto(telefone, texto), fetchImpl)
  } catch (erro) {
    console.error('Resposta pelo WhatsApp não enviada:', erro?.message || erro)
    return { ok: false, erro: 'A Meta não aceitou a mensagem agora. Tente de novo em instantes.', status: 502 }
  }

  await db.prepare(`
    INSERT OR IGNORE INTO whatsapp_mensagens (wa_msg_id, telefone, direcao, texto, enviado_por)
    VALUES (?, ?, 'saida', ?, ?)`).bind(id, telefone, texto, quem || null).run()
  return { ok: true }
}
