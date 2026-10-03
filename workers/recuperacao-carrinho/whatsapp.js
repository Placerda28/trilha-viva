import { escapeHtml } from '../../lib/safe.js'
import { normalizarEmailLembrete } from '../../lib/lembrete-assinatura.js'
import {
  assinaturaValida,
  chamarMeta,
  configuracaoMeta,
  pedidoDeSaida,
  pedidoModelo,
  pedidoTexto,
  telefoneSemPais,
  textoIgual,
} from '../../lib/whatsapp-meta.js'
import {
  CAMINHO_LINK_WHATSAPP,
  atenderLink,
  prepararLigacao,
  resumoDoDia,
  testeNaoEntregue,
  tetoDoDia,
} from './whatsapp-estado.js'

// WhatsApp da recuperação de carrinho pela API oficial da Meta.
// Uma mensagem por telefone, para sempre, 3 h depois do carrinho, só se a
// pessoa ainda não pagou. Independente do e-mail: um erro aqui não para o
// e-mail, e o 'ignorado' do e-mail não impede o WhatsApp.

const POR_RODADA = 20
const LIMITE_CORPO = 256 * 1024
const CONFIRMACAO_SAIDA = 'Pronto, você não vai mais receber lembretes.'

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

function mudancas(resultado) {
  return Number(resultado?.meta?.changes ?? resultado?.changes ?? 0)
}

function limite(valor, padrao) {
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : padrao
}

export function mascararTelefone(telefone) {
  const numero = String(telefone || '')
  return `${numero.slice(0, 2)}*****${numero.slice(-4)}`
}

// Mensagem de venda de madrugada gera bloqueio e denúncia, que derrubam a
// qualidade do número na Meta. Só das 9h às 19h59 de Brasília (UTC-3).
export function dentroDoHorario(agora = new Date()) {
  const hora = new Date(new Date(agora).getTime() - 3 * 3600000).getUTCHours()
  return hora >= 9 && hora < 20
}

// ---------------------------------------------------------------- envio ----

async function contarEnviosHoje(db) {
  const linha = await db.prepare(`
    SELECT COUNT(*) AS total
      FROM lembretes_enviados
     WHERE canal = 'whatsapp'
       AND enviado_em >= datetime('now', 'start of day')
     LIMIT 1`).first()
  return Number(linha?.total || 0)
}

async function buscarCandidatos(db, soTelefone) {
  const resultado = await db.prepare(`
    SELECT id, email, nome, telefone
      FROM carrinhos
     WHERE telefone IS NOT NULL
       AND whatsapp_enviado_em IS NULL
       AND whatsapp_falhou_em IS NULL
       AND status <> 'pago'
       AND criado_em <= datetime('now', '-3 hours')
       AND criado_em >= datetime('now', '-48 hours')
       AND (? IS NULL OR telefone = ?)
     ORDER BY criado_em ASC, id ASC
     LIMIT ${POR_RODADA}`).bind(soTelefone, soTelefone).all()
  return linhas(resultado)
}

async function impedimentos(db, email, telefone) {
  const linha = await db.prepare(`
    SELECT
      EXISTS(
        SELECT 1 FROM compras p JOIN clientes c ON c.id = p.cliente_id
         WHERE p.status = 'pago' AND c.email = ? LIMIT 1
      ) AS tem_compra,
      EXISTS(SELECT 1 FROM descadastros d WHERE d.email = ? LIMIT 1) AS descadastrado,
      EXISTS(
        SELECT 1 FROM carrinhos outro
         WHERE (outro.telefone = ? OR outro.email = ?)
           AND outro.whatsapp_enviado_em IS NOT NULL
         LIMIT 1
      ) AS ja_enviado
    LIMIT 1`).bind(email, email, telefone, email).first()
  return {
    temCompra: Boolean(Number(linha?.tem_compra || 0)),
    descadastrado: Boolean(Number(linha?.descadastrado || 0)),
    jaEnviado: Boolean(Number(linha?.ja_enviado || 0)),
  }
}

// Marca para nunca mais tentar (bloqueado ou falhou).
async function naoTentarDeNovo(db, id) {
  await db.prepare(`
    UPDATE carrinhos SET whatsapp_falhou_em = datetime('now')
     WHERE id = ? AND whatsapp_enviado_em IS NULL AND whatsapp_falhou_em IS NULL`).bind(id).run()
}

// Reserva atômica: a linha em lembretes_enviados é a vaga. O teto do dia e o
// "este telefone/e-mail nunca recebeu" ficam no próprio INSERT, então duas
// rodadas ao mesmo tempo não mandam duas vezes nem passam do teto.
async function reservar(db, carrinho, tetoDia) {
  const reserva = await db.prepare(`
    INSERT OR IGNORE INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em)
    SELECT c.id, 'whatsapp', 1, datetime('now')
      FROM carrinhos c
     WHERE c.id = ?
       AND c.whatsapp_enviado_em IS NULL
       AND c.whatsapp_falhou_em IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM lembretes_enviados l JOIN carrinhos outro ON outro.id = l.carrinho_id
          WHERE l.canal = 'whatsapp' AND (outro.telefone = ? OR outro.email = ?)
          LIMIT 1
       )
       AND (
         SELECT COUNT(*) FROM lembretes_enviados
          WHERE canal = 'whatsapp' AND enviado_em >= datetime('now', 'start of day')
       ) < ?`).bind(carrinho.id, carrinho.telefone, carrinho.email, tetoDia).run()
  if (mudancas(reserva) !== 1) return false

  const marcado = await db.prepare(`
    UPDATE carrinhos SET whatsapp_enviado_em = datetime('now')
     WHERE id = ? AND whatsapp_enviado_em IS NULL`).bind(carrinho.id).run()
  if (mudancas(marcado) === 1) return true

  await apagarReserva(db, carrinho.id)
  return false
}

async function apagarReserva(db, id) {
  await db.prepare(`
    DELETE FROM lembretes_enviados WHERE carrinho_id = ? AND canal = 'whatsapp' AND etapa = 1`).bind(id).run()
}

async function registrarFalha(db, id, codigo) {
  await apagarReserva(db, id)
  await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_enviado_em = NULL,
           whatsapp_falhou_em = datetime('now'),
           whatsapp_status = 'failed',
           whatsapp_erro = ?
     WHERE id = ?`).bind(codigo == null ? null : String(codigo), id).run()
}

export async function executarWhatsapp(env, opcoes = {}) {
  const resultado = { enviados: 0, ignorados: 0, falhas: 0 }
  const modo = String(env.WA_MODO || 'teste').toLowerCase()
  if (modo !== 'teste' && modo !== 'ativo') return resultado
  const logger = opcoes.logger || console

  // Sem número ou token, o WhatsApp simplesmente não roda (o e-mail segue).
  if (!configuracaoMeta(env).ok) return resultado

  const db = env.DB
  if (!db) throw new Error('Binding DB não configurado.')
  const fetchImpl = opcoes.fetchImpl || globalThis.fetch
  const agora = opcoes.agora || new Date()
  const dentro = dentroDoHorario(agora)

  // Até o Paulo tocar em LIGAR, nenhum cliente recebe: o robô só confere o
  // modelo na Meta e, aprovado, manda o teste para o celular dele.
  const estado = await prepararLigacao(db, env, { dentroDoHorario: dentro, fetchImpl, logger })
  if (estado.estado !== 'ativo') return resultado
  await resumoDoDia(db, env, agora, fetchImpl, logger)
  if (!dentro) return resultado

  const tetoDia = tetoDoDia(estado, limite(env.WA_TETO_DIA, 30))
  let enviadosHoje = await contarEnviosHoje(db)
  if (enviadosHoje >= tetoDia) return resultado

  // No modo teste a busca já filtra o celular de teste: carrinhos reais não
  // ocupam as vagas da rodada. Sem celular de teste, não envia nada.
  const soTelefone = modo === 'teste' ? telefoneSemPais(env.WA_TESTE_PARA) || '-' : null
  const candidatos = await buscarCandidatos(db, soTelefone)

  for (const carrinho of candidatos) {
    if (enviadosHoje >= tetoDia) break
    const email = normalizarEmailLembrete(carrinho.email)

    const bloqueio = await impedimentos(db, email, carrinho.telefone)
    if (bloqueio.temCompra || bloqueio.descadastrado || bloqueio.jaEnviado) {
      await naoTentarDeNovo(db, carrinho.id)
      resultado.ignorados += 1
      continue
    }

    if (!(await reservar(db, { ...carrinho, email }, tetoDia))) {
      enviadosHoje = await contarEnviosHoje(db)
      continue
    }

    try {
      const id = await chamarMeta(
        env,
        pedidoModelo({ telefone: carrinho.telefone, nome: carrinho.nome, carrinhoId: carrinho.id }, env),
        fetchImpl
      )
      await db.prepare(`
        UPDATE carrinhos SET whatsapp_msg_id = ?, whatsapp_status = 'sent' WHERE id = ?`).bind(id, carrinho.id).run()
      enviadosHoje += 1
      resultado.enviados += 1
    } catch (erro) {
      // Sem repetir: uma falha marca o carrinho e ele não volta para a fila.
      resultado.falhas += 1
      logger.error(
        `WhatsApp não enviado para ${mascararTelefone(carrinho.telefone)} (carrinho ${carrinho.id}):`,
        erro?.message || erro
      )
      try {
        await registrarFalha(db, carrinho.id, erro?.codigo)
      } catch (erroBanco) {
        logger.error(`Falha ao registrar o erro do WhatsApp do carrinho ${carrinho.id}:`, erroBanco)
      }
    }
  }

  return resultado
}

// -------------------------------------------------------------- webhook ----

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

// Atualiza o status da mensagem do lembrete sem regredir (lido não volta para
// entregue). 'failed' só vale enquanto a mensagem não foi entregue.
async function atualizarStatus(db, aviso) {
  const status = String(aviso?.status || '')
  const id = String(aviso?.id || '')
  if (!id) return
  if (status === 'failed') {
    const codigo = Array.isArray(aviso?.errors) ? aviso.errors[0]?.code : null
    await db.prepare(`
      UPDATE carrinhos SET whatsapp_status = 'failed', whatsapp_erro = ?
       WHERE whatsapp_msg_id = ? AND COALESCE(whatsapp_status, 'sent') = 'sent'`).bind(codigo == null ? null : String(codigo), id).run()
    return
  }
  const ordem = ORDEM_STATUS[status]
  if (!ordem) return
  await db.prepare(`
    UPDATE carrinhos SET whatsapp_status = ?
     WHERE whatsapp_msg_id = ?
       AND (CASE COALESCE(whatsapp_status, '')
              WHEN 'sent' THEN 1 WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 ELSE 0 END) < ?`).bind(status, id, ordem).run()
}

async function guardarMensagem(db, { waId, telefone, nome, direcao, texto, enviadoPor = null }) {
  const resultado = await db.prepare(`
    INSERT OR IGNORE INTO whatsapp_mensagens (wa_msg_id, telefone, nome_perfil, direcao, texto, enviado_por)
    VALUES (?, ?, ?, ?, ?, ?)`).bind(
    waId || null,
    telefone,
    nome ? String(nome).slice(0, 80) : null,
    direcao,
    String(texto || '').slice(0, 4000),
    enviadoPor
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
  const texto = textoDaMensagem(mensagem)

  // A gestão guarda o telefone sem o 55 e responde pondo o 55 de volta: um
  // número de fora (ex.: +1 631...) viraria um celular brasileiro qualquer.
  // Por isso ele só é encaminhado por e-mail, com o DDI.
  if (telefone === String(mensagem.from).replace(/\D/g, '')) {
    try {
      await encaminharPorEmail(env, { nome, telefone: `+${telefone}`, texto, estrangeiro: true }, fetchImpl)
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
    // O wa_msg_id é único: aviso repetido não manda a confirmação de novo.
    if (!(await guardarMensagem(db, { waId: mensagem.id, telefone, nome, direcao: 'entrada', texto }))) return
    try {
      const id = await chamarMeta(env, pedidoTexto(telefone, CONFIRMACAO_SAIDA), fetchImpl)
      await guardarMensagem(db, { waId: id, telefone, nome: null, direcao: 'saida', texto: CONFIRMACAO_SAIDA, enviadoPor: 'robô' })
    } catch (erro) {
      logger.error(`Confirmação de saída não enviada para ${mascararTelefone(telefone)}:`, erro?.message || erro)
    }
    return
  }

  // O wa_msg_id é único: aviso repetido da Meta não grava nem encaminha de novo.
  if (!(await guardarMensagem(db, { waId: mensagem.id, telefone, nome, direcao: 'entrada', texto }))) return
  try {
    await encaminharPorEmail(env, { nome, telefone, texto }, fetchImpl)
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
