import { escapeHtml } from '../../lib/safe.js'
import {
  assinaturaValida,
  chamarMeta,
  midiaDaMensagem,
  pedidoDeSaida,
  pedidoTexto,
  telefoneSemPais,
  textoIgual,
} from '../../lib/whatsapp-meta.js'
import { paraSql } from '../../lib/whatsapp-sequencia.js'
import { CAMINHO_LINK_WHATSAPP, atenderLink, testeNaoEntregue } from './whatsapp-estado.js'
import { linhas, mascararTelefone, mudancas } from './whatsapp-banco.js'

// O webhook do WhatsApp (/whatsapp): status das mensagens, respostas e
// pedidos de saída. whatsapp.js reexporta atenderWebhook.

const LIMITE_CORPO = 256 * 1024
const CONFIRMACAO_SAIDA = 'Pronto, você não vai mais receber lembretes.'

// -------------------------------------------------------------- webhook ----

const ROTULOS_MIDIA = { image: 'foto', document: 'arquivo', audio: 'áudio', video: 'vídeo', sticker: 'figurinha' }

function textoDaMensagem(mensagem) {
  if (mensagem?.type === 'text') return String(mensagem.text?.body || '')
  if (mensagem?.type === 'button') return String(mensagem.button?.text || mensagem.button?.payload || '')
  if (mensagem?.type === 'interactive') {
    return String(
      mensagem.interactive?.button_reply?.title || mensagem.interactive?.list_reply?.title || ''
    )
  }
  return `[${String(mensagem?.type || 'mensagem')}]`
}

const ORDEM_STATUS = { sent: 1, delivered: 2, read: 3 }

// Hora do aviso (a Meta manda em segundos desde 1970); sem ela, agora.
function horaDoAviso(aviso) {
  const segundos = Number(aviso?.timestamp)
  return Number.isFinite(segundos) && segundos > 0 ? paraSql(new Date(segundos * 1000)) : paraSql(new Date())
}

// Atualiza o status de cada mensagem da sequência sem regredir (lida não
// volta para entregue) e guarda a hora (ex.: quando leu). 'failed' só vale
// enquanto a mensagem não foi entregue.
async function atualizarStatus(db, aviso) {
  const status = String(aviso?.status || '')
  const id = String(aviso?.id || '')
  if (!id) return
  const em = horaDoAviso(aviso)
  if (status === 'failed') {
    const codigo = Array.isArray(aviso?.errors) ? aviso.errors[0]?.code : null
    await db.prepare(`
      UPDATE lembretes_enviados SET wa_status = 'failed', wa_erro = ?, wa_status_em = ?
       WHERE wa_msg_id = ? AND COALESCE(wa_status, 'sent') = 'sent'`).bind(codigo == null ? null : String(codigo), em, id).run()
    return
  }
  const ordem = ORDEM_STATUS[status]
  if (!ordem) return
  await db.prepare(`
    UPDATE lembretes_enviados SET wa_status = ?, wa_status_em = ?
     WHERE wa_msg_id = ?
       AND (CASE COALESCE(wa_status, '')
              WHEN 'sent' THEN 1 WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 ELSE 0 END) < ?`).bind(status, em, id, ordem).run()
}

// A pessoa escreveu: a sequência deste telefone para na hora. Pedido de saída
// encerra; qualquer outra resposta vira conversa (pausa que a gestão retoma).
async function pararPelaResposta(db, telefone, motivo) {
  await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_encerrado_em = datetime('now'), whatsapp_motivo = ?, proximo_whatsapp_em = NULL
     WHERE telefone = ? AND whatsapp_enviado_em IS NOT NULL AND whatsapp_encerrado_em IS NULL`).bind(motivo, telefone).run()
}

async function guardarMensagem(db, { waId, telefone, nome, direcao, texto, enviadoPor = null, midia = null }) {
  const resultado = await db.prepare(`
    INSERT OR IGNORE INTO whatsapp_mensagens (wa_msg_id, telefone, nome_perfil, direcao, texto, enviado_por, midia_tipo, midia_id, midia_nome, midia_mime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    waId || null,
    telefone,
    nome ? String(nome).slice(0, 80) : null,
    direcao,
    String(texto || '').slice(0, 4000),
    enviadoPor,
    midia?.tipo || null,
    midia?.id || null,
    midia?.nome || null,
    midia?.mime || null
  ).run()
  return mudancas(resultado) === 1
}

async function encaminharPorEmail(env, { nome, telefone, texto, estrangeiro = false }, fetchImpl) {
  const para = String(env.WA_ENCAMINHAR_PARA || env.LEMBRETE_BCC || '').trim()
  if (!para || !env.RESEND_API_KEY) return
  const quem = nome ? `${nome} (${telefone})` : telefone
  const comoResponder = estrangeiro
    ? 'Número de fora do Brasil: não entra na gestão do site. Responda direto pelo WhatsApp, se fizer sentido.'
    : 'Para responder, use a gestão do site: Recuperação → WhatsApp (até 24 h depois da mensagem).'
  const resposta = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [para],
      subject: `WhatsApp de ${quem}`.slice(0, 150),
      text: `${quem} escreveu no WhatsApp:\n\n${texto}\n\n${comoResponder}`,
      html: `<p><strong>${escapeHtml(quem)}</strong> escreveu no WhatsApp:</p><p style="white-space:pre-wrap">${escapeHtml(texto)}</p><p style="color:#5C5C5C">${escapeHtml(comoResponder)}</p>`,
    }),
  })
  if (!resposta.ok) throw new Error(`Resend respondeu com HTTP ${resposta.status}`)
}

async function tratarMensagem(db, env, mensagem, nomes, fetchImpl, logger) {
  const telefone = telefoneSemPais(mensagem?.from)
  if (!telefone) return
  const nome = nomes.get(String(mensagem.from)) || null
  // Foto, áudio, vídeo, documento: o arquivo fica na Meta (a gestão busca na
  // hora); aqui vão a legenda e o id. O e-mail diz o que chegou.
  const midia = midiaDaMensagem(mensagem)
  const texto = midia ? midia.legenda : textoDaMensagem(mensagem)
  const resumo = midia
    ? `[${ROTULOS_MIDIA[midia.tipo] || 'arquivo'}${midia.nome ? ': ' + midia.nome : ''}]${texto ? ' ' + texto : ''}`
    : texto

  // A gestão guarda o telefone sem o 55 e responde pondo o 55 de volta: um
  // número de fora (ex.: +1 631...) viraria um celular brasileiro qualquer.
  // Por isso ele só é encaminhado por e-mail, com o DDI.
  if (telefone === String(mensagem.from).replace(/\D/g, '')) {
    try {
      await encaminharPorEmail(env, { nome, telefone: `+${telefone}`, texto: resumo, estrangeiro: true }, fetchImpl)
    } catch (erro) {
      logger.error('Encaminhamento por e-mail falhou (número de fora do Brasil):', erro?.message || erro)
    }
    return
  }

  if (pedidoDeSaida(texto)) {
    // O descadastro vem ANTES de gravar a mensagem: se algo falhar no meio, a
    // Meta reenvia o aviso e o descadastro (que pode repetir) é refeito.
    const emails = linhas(
      await db.prepare(`SELECT DISTINCT email FROM carrinhos WHERE telefone = ? LIMIT 10`).bind(telefone).all()
    )
    for (const linha of emails) {
      await db.prepare(`INSERT OR IGNORE INTO descadastros (email, canal) VALUES (?, 'whatsapp')`).bind(linha.email).run()
    }
    await pararPelaResposta(db, telefone, 'descadastro')
    // O wa_msg_id é único: aviso repetido não manda a confirmação de novo.
    if (!(await guardarMensagem(db, { waId: mensagem.id, telefone, nome, direcao: 'entrada', texto, midia }))) return
    try {
      const id = await chamarMeta(env, pedidoTexto(telefone, CONFIRMACAO_SAIDA), fetchImpl)
      await guardarMensagem(db, { waId: id, telefone, nome: null, direcao: 'saida', texto: CONFIRMACAO_SAIDA, enviadoPor: 'robô' })
    } catch (erro) {
      logger.error(`Confirmação de saída não enviada para ${mascararTelefone(telefone)}:`, erro?.message || erro)
    }
    return
  }

  // Antes de gravar: se algo falhar no meio, a Meta reenvia e a parada (que
  // pode repetir) é refeita.
  await pararPelaResposta(db, telefone, 'respondeu')
  // O wa_msg_id é único: aviso repetido da Meta não grava nem encaminha de novo.
  if (!(await guardarMensagem(db, { waId: mensagem.id, telefone, nome, direcao: 'entrada', texto, midia }))) return
  try {
    await encaminharPorEmail(env, { nome, telefone, texto: resumo }, fetchImpl)
  } catch (erro) {
    // A mensagem já está gravada e aparece na gestão; só o aviso por e-mail falhou.
    logger.error(`Encaminhamento por e-mail falhou (${mascararTelefone(telefone)}):`, erro?.message || erro)
  }
}

async function processarAvisos(db, env, corpo, fetchImpl, logger) {
  for (const entrada of Array.isArray(corpo?.entry) ? corpo.entry : []) {
    for (const mudanca of Array.isArray(entrada?.changes) ? entrada.changes : []) {
      if (mudanca?.field !== 'messages') continue
      const valor = mudanca.value || {}
      // Só avisos do nosso número (o botão "Teste" do painel manda outro id).
      if (String(valor.metadata?.phone_number_id || '') !== String(env.WA_PHONE_NUMBER_ID || '')) continue
      const nomes = new Map(
        (Array.isArray(valor.contacts) ? valor.contacts : []).map((c) => [String(c?.wa_id || ''), c?.profile?.name || null])
      )
      for (const aviso of Array.isArray(valor.statuses) ? valor.statuses : []) {
        await atualizarStatus(db, aviso)
        if (aviso?.status === 'failed') await testeNaoEntregue(db, env, aviso, fetchImpl, logger)
      }
      for (const mensagem of Array.isArray(valor.messages) ? valor.messages : []) {
        await tratarMensagem(db, env, mensagem, nomes, fetchImpl, logger)
      }
    }
  }
}

const naoExiste = () => new Response(null, { status: 404 })

// Atende só /whatsapp. GET = verificação da Meta; POST = avisos assinados.
export async function atenderWebhook(request, env, opcoes = {}) {
  const url = new URL(request.url)
  if (url.pathname === CAMINHO_LINK_WHATSAPP) return atenderLink(request, env)
  if (url.pathname !== '/whatsapp') return naoExiste()
  const logger = opcoes.logger || console

  if (request.method === 'GET') {
    const modo = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const desafio = url.searchParams.get('hub.challenge') || ''
    if (modo === 'subscribe' && textoIgual(token, env.WA_VERIFY_TOKEN)) {
      return new Response(desafio, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }
    return naoExiste()
  }

  if (request.method !== 'POST' || !env.WA_APP_SECRET) return naoExiste()
  if (Number(request.headers.get('content-length') || 0) > LIMITE_CORPO) {
    return new Response(null, { status: 413 })
  }
  const corpoCru = await request.text()
  if (corpoCru.length > LIMITE_CORPO) return new Response(null, { status: 413 })
  if (!(await assinaturaValida(corpoCru, request.headers.get('x-hub-signature-256'), env.WA_APP_SECRET))) {
    return new Response(null, { status: 401 })
  }

  let corpo
  try {
    corpo = JSON.parse(corpoCru)
  } catch {
    return new Response('ok', { status: 200 })
  }

  try {
    if (!env.DB) throw new Error('Binding DB não configurado.')
    await processarAvisos(env.DB, env, corpo, opcoes.fetchImpl || globalThis.fetch, logger)
  } catch (erro) {
    // 500 faz a Meta reenviar o aviso; o wa_msg_id único impede duplicar.
    logger.error('Falha ao processar aviso do WhatsApp:', erro)
    return new Response(null, { status: 500 })
  }
  return new Response('ok', { status: 200 })
}
