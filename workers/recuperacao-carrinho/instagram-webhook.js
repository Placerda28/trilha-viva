import { assinaturaValida, textoIgual } from '../../lib/whatsapp-meta.js'
import { mudancas } from './whatsapp-banco.js'
import { cabe, consultasGastas, contarConsultas } from './orcamento.js'

// O webhook do Instagram Direct (/instagram): grava o que chega e pede o rascunho da IA.
// REGRA DE OURO: este arquivo NUNCA envia mensagem no Instagram (só lê o perfil da pessoa).

const LIMITE_CORPO = 256 * 1024
// O D1 grátis aceita 50 consultas por invocação (waitUntil incluído): gravar usa até 30, o resto é do perfil e do rascunho.
const CONSULTAS_GRAVACAO = 30
const RASCUNHOS_POR_PEDIDO = 3 // os demais novos ficam para o cron
const CUSTO_PADRAO_RASCUNHO = 10
const MAX_TEXTO = 4000
const ROTULOS = {
  image: '[enviou uma foto]',
  video: '[enviou um vídeo]',
  audio: '[enviou um áudio]',
  file: '[enviou um arquivo]',
  share: '[compartilhou um post]',
  ig_reel: '[compartilhou um Reel]',
  reel: '[compartilhou um Reel]',
  story_mention: '[mencionou você no story]',
  ephemeral: '[mídia temporária]', // vem sem url
}

const naoExiste = () => new Response(null, { status: 404 })
const mascarar = (id) => `…${String(id || '').slice(-4)}`
const idValido = (id) => typeof id === 'string' && /^\d{1,30}$/.test(id)

// Hora do aviso (a Meta manda em milissegundos) como texto UTC do D1; sem ela ou no futuro, agora.
function horaSql(timestamp) {
  const agora = Date.now()
  let ms = Number(timestamp)
  if (Number.isFinite(ms) && ms > 0 && ms < 1e11) ms *= 1000
  const t = Number.isFinite(ms) && ms > 0 ? Math.min(ms, agora) : agora
  return new Date(t).toISOString().slice(0, 19).replace('T', ' ')
}

// Texto legível + tipo e URL da mídia (para a Gestão). Nunca devolve texto vazio.
export function resumirMensagem(mensagem) {
  const anexos = Array.isArray(mensagem?.attachments) ? mensagem.attachments : []
  const partes = []
  if (mensagem?.reply_to?.story) partes.push('[respondeu ao seu story]')
  for (const anexo of anexos.slice(0, 3)) partes.push(ROTULOS[anexo?.type] || '[enviou um anexo]')
  if (typeof mensagem?.text === 'string' && mensagem.text.trim()) partes.push(mensagem.text.trim())
  const primeiro = anexos[0]
  const url = primeiro?.payload?.url
  const tipoAnexo = primeiro?.type ? String(primeiro.type).slice(0, 30) : null
  return {
    texto: (partes.join(' ') || '[mensagem sem texto]').slice(0, MAX_TEXTO),
    midiaTipo: tipoAnexo || (mensagem?.reply_to?.story ? 'story_reply' : null),
    midiaUrl: typeof url === 'string' && url.startsWith('https://') ? url.slice(0, 2000) : null,
  }
}

// Aviso que não é mensagem nova (leitura, reação, edição, apagada): só log.
const ignoravel = (item) =>
  !item?.message || item.message.is_deleted || item.message.is_unsupported || !item.message.mid
  || item.read || item.reaction || item.message_edit

async function gravarEntrada(db, igsid, item) {
  const m = resumirMensagem(item.message)
  const feito = await db.prepare(`
    INSERT INTO instagram_mensagens (ig_msg_id, igsid, direcao, texto, midia_tipo, midia_url, criado_em)
    VALUES (?, ?, 'entrada', ?, ?, ?, ?) ON CONFLICT(ig_msg_id) DO NOTHING`)
    .bind(String(item.message.mid).slice(0, 500), igsid, m.texto, m.midiaTipo, m.midiaUrl, horaSql(item.timestamp)).run()
  return mudancas(feito) === 1
}

// Eco = mensagem que a própria conta enviou. Se o mid já existe, a Gestão enviou: nada a marcar.
// Só vale para o rascunho aberto cuja pergunta é anterior ao eco (eco atrasado não fecha rascunho novo).
async function gravarEco(db, igsid, item) {
  const m = resumirMensagem(item.message)
  const hora = horaSql(item.timestamp)
  const feito = await db.prepare(`
    INSERT INTO instagram_mensagens (ig_msg_id, igsid, direcao, texto, midia_tipo, midia_url, enviado_por, criado_em)
    VALUES (?, ?, 'saida', ?, ?, ?, 'app', ?) ON CONFLICT(ig_msg_id) DO NOTHING`)
    .bind(String(item.message.mid).slice(0, 500), igsid, m.texto, m.midiaTipo, m.midiaUrl, hora).run()
  if (mudancas(feito) !== 1) return
  await db.prepare(`
    UPDATE instagram_rascunhos SET status = 'respondido_no_app', decidido_em = datetime('now'), decidido_por = 'app'
     WHERE igsid = ? AND status IN ('gerando', 'pendente')
       AND EXISTS (SELECT 1 FROM instagram_mensagens m
                    WHERE m.id = instagram_rascunhos.ate_mensagem_id AND m.criado_em <= ?)`).bind(igsid, hora).run()
}

// Nome e @ da pessoa, uma vez por conversa. Falha de rede ou da Meta ("User consent is required"): segue sem.
async function guardarPerfil(env, igsid, fetchImpl, logger) {
  const db = env.DB
  const conhecido = await db
    .prepare('SELECT 1 AS ok FROM instagram_mensagens WHERE igsid = ? AND usuario IS NOT NULL LIMIT 1')
    .bind(igsid).first()
  if (conhecido || !env.IG_TOKEN || !idValido(igsid)) return
  try {
    const resposta = await fetchImpl(`https://graph.facebook.com/${env.IG_GRAPH_VERSION}/${igsid}?fields=name,username`, {
      headers: { Authorization: `Bearer ${env.IG_TOKEN}` },
      signal: AbortSignal.timeout(4000),
    })
    if (!resposta.ok) return logger.log(`Instagram perfil ${mascarar(igsid)}: HTTP ${resposta.status}`)
    const dados = await resposta.json()
    const usuario = typeof dados?.username === 'string' ? dados.username.slice(0, 100) : null
    const nome = typeof dados?.name === 'string' ? dados.name.slice(0, 200) : null
    if (!usuario && !nome) return
    // Só as últimas linhas da conversa ainda sem perfil (índice por igsid), nunca a conversa inteira.
    await db.prepare(`UPDATE instagram_mensagens SET usuario = ?, nome_perfil = ?
       WHERE id IN (SELECT id FROM instagram_mensagens WHERE igsid = ? AND usuario IS NULL ORDER BY id DESC LIMIT 20)`)
      .bind(usuario || '', nome, igsid).run()
  } catch (erro) {
    logger.log(`Instagram perfil ${mascarar(igsid)} não buscado: ${erro?.name || 'erro'}`)
  }
}

// Perfil e rascunho dos primeiros novos, um de cada vez. O módulo da IA só é carregado aqui (há entrada nova).
// Quem não couber no orçamento de consultas do pedido fica para o cron (que acha a conversa pela fila).
async function pedirRascunhos(env, igsids, opcoes, logger) {
  try {
    const modulo = opcoes.gerarRascunho
      ? { gerarRascunho: opcoes.gerarRascunho, CUSTO_RASCUNHO: opcoes.CUSTO_RASCUNHO }
      : await import('../../lib/instagram-ia/rascunho.js')
    const custo = 2 + (Number(modulo.CUSTO_RASCUNHO) || CUSTO_PADRAO_RASCUNHO)
    for (const igsid of igsids.slice(0, RASCUNHOS_POR_PEDIDO)) {
      if (!cabe(env.DB, custo)) return logger.log('Instagram: sem consultas sobrando no pedido; o cron gera o rascunho.')
      await guardarPerfil(env, igsid, opcoes.fetchImpl || globalThis.fetch, logger)
      const r = await modulo.gerarRascunho(env, igsid)
      logger.log(`Instagram rascunho ${mascarar(igsid)}: ${r?.status || '?'}`)
    }
  } catch (erro) {
    logger.error('Instagram rascunho falhou:', erro?.message || erro)
  }
}

// Grava tudo que couber em CONSULTAS_GRAVACAO. Devolve os igsid com entrada nova e se sobrou aviso sem gravar.
async function processarAvisos(env, corpo, logger) {
  const resultado = { novos: new Set(), excedeu: false }
  if (corpo?.object !== 'instagram' || !env.IG_ACCOUNT_ID) return resultado
  const conta = String(env.IG_ACCOUNT_ID)
  for (const entrada of Array.isArray(corpo.entry) ? corpo.entry : []) {
    for (const item of Array.isArray(entrada?.messaging) ? entrada.messaging : []) {
      if (ignoravel(item)) { logger.log('Instagram aviso ignorado (sem mensagem nova)'); continue }
      const eco = item.message.is_echo === true
      const de = String(item.sender?.id || '')
      const para = String(item.recipient?.id || '')
      const igsid = eco ? para : de
      if (!idValido(igsid) || (eco ? de : para) !== conta || igsid === conta) { logger.log('Instagram aviso de outra conta ignorado'); continue }
      if (consultasGastas(env.DB) + (eco ? 2 : 1) > CONSULTAS_GRAVACAO) {
        resultado.excedeu = true // nunca descarta com 200: a Meta reenvia e o mid único evita duplicar
        return resultado
      }
      if (eco) await gravarEco(env.DB, igsid, item)
      else if (await gravarEntrada(env.DB, igsid, item)) resultado.novos.add(igsid)
    }
  }
  return resultado
}

// Lê o corpo contando BYTES (content-length pode faltar ou mentir). null = passou do limite.
async function lerCorpo(request) {
  if (!request.body) return ''
  const leitor = request.body.getReader()
  const partes = []
  let total = 0
  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    total += value.byteLength
    if (total > LIMITE_CORPO) {
      await leitor.cancel().catch(() => {})
      return null
    }
    partes.push(value)
  }
  return new Blob(partes).text()
}

// Atende só /instagram. GET = verificação da Meta; POST = avisos assinados.
export async function atenderInstagram(request, env, ctx, opcoes = {}) {
  const url = new URL(request.url)
  if (url.pathname !== '/instagram') return naoExiste()
  const logger = opcoes.logger || console

  if (request.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe'
      && textoIgual(url.searchParams.get('hub.verify_token'), env.IG_VERIFY_TOKEN)
    if (!ok) return naoExiste()
    return new Response(url.searchParams.get('hub.challenge') || '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  const segredo = env.IG_APP_SECRET || env.WA_APP_SECRET
  if (request.method !== 'POST' || !segredo) return naoExiste()
  if (Number(request.headers.get('content-length') || 0) > LIMITE_CORPO) return new Response(null, { status: 413 })
  const corpoCru = await lerCorpo(request)
  if (corpoCru === null) return new Response(null, { status: 413 })
  if (!(await assinaturaValida(corpoCru, request.headers.get('x-hub-signature-256'), segredo))) {
    return new Response(null, { status: 401 })
  }

  let corpo
  try {
    corpo = JSON.parse(corpoCru)
  } catch {
    return new Response('ok', { status: 200 })
  }

  let resultado
  const contado = { ...env, DB: contarConsultas(env.DB) }
  try {
    if (!env.DB) throw new Error('Binding DB não configurado.')
    resultado = await processarAvisos(contado, corpo, logger)
  } catch (erro) {
    // 500 faz a Meta reenviar; o mid único impede duplicar.
    logger.error('Falha ao processar aviso do Instagram:', erro?.message || erro)
    return new Response(null, { status: 500 })
  }
  if (resultado.novos.size) {
    const tarefa = pedirRascunhos(contado, [...resultado.novos], opcoes, logger)
    if (ctx?.waitUntil) ctx.waitUntil(tarefa)
    else await tarefa
  }
  if (resultado.excedeu) {
    logger.error('Instagram: pedido com avisos demais para uma invocação; a Meta vai reenviar.')
    return new Response(null, { status: 500 })
  }
  return new Response('ok', { status: 200 })
}
