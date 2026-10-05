import { escapeHtml } from '../../lib/safe.js'
import {
  chamarMeta,
  configuracaoMeta,
  pedidoModelo,
  telefoneSemPais,
  textoIgual,
} from '../../lib/whatsapp-meta.js'
import { MODELOS, MOTIVOS } from '../../lib/whatsapp-sequencia.js'

// Ligar o WhatsApp sem deploy. O estado fica no banco (tabela whatsapp_estado):
//   aguardando_modelo → a Meta aprova o modelo → teste vai para o celular do
//   Paulo → teste_enviado → LIGAR (ativo) ou NÃO LIGAR (pausado).
// O WA_MODO continua sendo a trava geral: fora de teste/ativo nada roda.

const CONFERIR_MODELO_MIN = 30
const TESTE_A_CADA_HORAS = 6
const LINK_VALIDO_HORAS = 72
const DIAS_DE_FREIO = 3
const TETO_DO_FREIO = 10

const CAMINHO_LINK = '/whatsapp/ligar'

function mudou(resultado) {
  return Number(resultado?.meta?.changes ?? resultado?.changes ?? 0) === 1
}

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

export async function lerEstado(db) {
  const linha = await db.prepare(`
    SELECT *, COALESCE(ligado_em > datetime('now', '-${DIAS_DE_FREIO} days'), 0) AS no_freio
      FROM whatsapp_estado WHERE id = 1 LIMIT 1`).first()
  return linha || { estado: 'aguardando_modelo' }
}

export function hojeBrasilia(agora = new Date()) {
  return new Date(new Date(agora).getTime() - 3 * 3600000).toISOString().slice(0, 10)
}

// Nos 3 primeiros dias depois de ligar, no máximo 10 por dia (a conta dos
// dias é feita no banco, com o mesmo relógio das outras datas).
export function tetoDoDia(estado, tetoNormal) {
  return Number(estado?.no_freio || 0) ? Math.min(TETO_DO_FREIO, tetoNormal) : tetoNormal
}

// ------------------------------------------------------------ e-mail ----

async function emailAoSuporte(env, { assunto, texto, html }, fetchImpl) {
  const para = String(env.WA_ENCAMINHAR_PARA || env.LEMBRETE_BCC || '').trim()
  if (!para || !env.RESEND_API_KEY) return
  const resposta = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [para], subject: assunto.slice(0, 150), text: texto, html }),
  })
  if (!resposta.ok) throw new Error(`Resend respondeu com HTTP ${resposta.status}`)
}

function paragrafos(texto) {
  return texto
    .split('\n\n')
    .map((p) => `<p style="white-space:pre-wrap">${escapeHtml(p)}</p>`)
    .join('')
}

// O que cada erro comum da Meta quer dizer, e o que o Paulo faz.
const ERROS_META = {
  131042: 'Problema de pagamento na conta do WhatsApp. Cadastre ou atualize o cartão no Gerenciador de Negócios da Meta (Configurações de pagamento do WhatsApp).',
  130497: 'A Meta está impedindo esta conta de mandar mensagens para o Brasil. Normalmente se resolve com a verificação da empresa na Meta.',
  132001: 'A Meta não encontrou o modelo "carrinho_lembrete" em português (pt_BR) nesta conta.',
  132000: 'O modelo aprovado não bate com o que o robô manda (nome ou botão). Avise o Claude Code.',
  132012: 'O modelo aprovado não bate com o que o robô manda (nome ou botão). Avise o Claude Code.',
  131026: 'A mensagem não pôde ser entregue nesse celular (sem WhatsApp, versão antiga ou bloqueio).',
  190: 'O token do robô expirou ou foi revogado. Gere um novo token do usuário do sistema e cadastre na Cloudflare.',
  10: 'O usuário do sistema não tem permissão na conta do WhatsApp. Confira os ativos atribuídos ao Trilhavivarobo.',
  200: 'O usuário do sistema não tem permissão na conta do WhatsApp. Confira os ativos atribuídos ao Trilhavivarobo.',
}

export function explicarErro(codigo, detalhe = '') {
  const conhecido = ERROS_META[Number(codigo)]
  return conhecido
    ? `${conhecido} (código ${codigo})`
    : `Erro ${codigo || 'desconhecido'} da Meta${detalhe ? `: ${detalhe}` : ''}. Encaminhe este e-mail ao Claude Code.`
}

// -------------------------------------------------------------- links ----

function paraHex(bytes) {
  let hex = ''
  for (const byte of new Uint8Array(bytes)) hex += byte.toString(16).padStart(2, '0')
  return hex
}

async function assinarLink(acao, nonce, segredo) {
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(segredo)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return paraHex(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(`whatsapp:${acao}:${nonce}`)))
}

function novoNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return paraHex(bytes)
}

async function montarLink(env, acao, nonce) {
  const base = String(env.WA_LINK_BASE || '').replace(/\/+$/, '')
  const t = await assinarLink(acao, nonce, env.WA_LINK_SEGREDO)
  return `${base}${CAMINHO_LINK}?acao=${acao}&n=${nonce}&t=${t}`
}

// ------------------------------------------------------ modelo na Meta ----

// Consulta o modelo, no máximo uma vez a cada 30 min. Devolve null quando não
// era hora de consultar (ou a consulta falhou).
async function conferirModelo(db, env, fetchImpl, logger) {
  const vez = await db.prepare(`
    UPDATE whatsapp_estado SET modelo_conferido_em = datetime('now')
     WHERE id = 1 AND estado = 'aguardando_modelo'
       AND (modelo_conferido_em IS NULL OR modelo_conferido_em <= datetime('now', '-${CONFERIR_MODELO_MIN} minutes'))`).run()
  if (!mudou(vez)) return null

  const { versao, token } = configuracaoMeta(env)
  const nome = String(env.WA_TEMPLATE || 'carrinho_lembrete')
  const url = `https://graph.facebook.com/${versao}/${env.WA_WABA_ID}/message_templates?name=${encodeURIComponent(nome)}&fields=name,status,language,rejected_reason`
  let dados
  try {
    const resposta = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } })
    dados = await resposta.json().catch(() => null)
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status} (código ${dados?.error?.code ?? '-'})`)
  } catch (erro) {
    logger.error('Consulta do modelo na Meta falhou:', erro?.message || erro)
    return null
  }
  const modelos = (Array.isArray(dados?.data) ? dados.data : []).filter((m) => m?.name === nome)
  const modelo = modelos.find((m) => m.language === 'pt_BR') || modelos[0]
  const status = String(modelo?.status || 'NAO_ENCONTRADO').toUpperCase()
  await db.prepare(`UPDATE whatsapp_estado SET modelo_status = ? WHERE id = 1`).bind(status).run()
  return { status, motivo: String(modelo?.rejected_reason || '').trim() }
}

async function avisarRecusa(db, env, estado, motivo, fetchImpl) {
  const chave = motivo || 'sem motivo informado'
  if (estado.recusa_avisada === chave) return
  await emailAoSuporte(env, {
    assunto: `WhatsApp: modelo recusado pela Meta (${chave})`,
    texto: `Modelo recusado: ${chave}\n\nO robô continua esperando. Reescreva o modelo "${env.WA_TEMPLATE || 'carrinho_lembrete'}" e envie de novo para análise; quando a Meta aprovar, o teste vai para o seu celular automaticamente.`,
    html: paragrafos(`Modelo recusado: ${chave}\n\nO robô continua esperando. Reescreva o modelo "${env.WA_TEMPLATE || 'carrinho_lembrete'}" e envie de novo para análise; quando a Meta aprovar, o teste vai para o seu celular automaticamente.`),
  }, fetchImpl)
  await db.prepare(`UPDATE whatsapp_estado SET recusa_avisada = ? WHERE id = 1`).bind(chave).run()
}

// ----------------------------------------------------- teste do Paulo ----

async function avisarFalhaDoTeste(env, codigo, detalhe, fetchImpl) {
  const texto = `O modelo do WhatsApp foi aprovado, mas a mensagem de teste para o seu celular não saiu.\n\n${explicarErro(codigo, detalhe)}\n\nO robô tenta de novo sozinho daqui a ${TESTE_A_CADA_HORAS} horas. Nenhum cliente recebeu nada.`
  await emailAoSuporte(env, { assunto: 'WhatsApp: o teste para o seu celular não saiu', texto, html: paragrafos(texto) }, fetchImpl)
}

async function enviarTeste(db, env, fetchImpl, logger) {
  const vez = await db.prepare(`
    UPDATE whatsapp_estado SET teste_tentado_em = datetime('now')
     WHERE id = 1 AND estado = 'aguardando_modelo'
       AND (teste_tentado_em IS NULL OR teste_tentado_em <= datetime('now', '-${TESTE_A_CADA_HORAS} hours'))`).run()
  if (!mudou(vez)) return 'aguardando'

  const telefone = telefoneSemPais(env.WA_TESTE_PARA)
  // O botão abre a página de compra já preenchida com um carrinho do Paulo.
  // Só o código do carrinho vai no endereço (nunca e-mail, nome ou telefone).
  const carrinho = telefone
    ? await db.prepare(`SELECT id FROM carrinhos WHERE telefone = ? ORDER BY criado_em DESC LIMIT 1`).bind(telefone).first()
    : null
  const r = encodeURIComponent(String(carrinho?.id || 'teste'))
  const sufixo = `r=${r}&utm_source=whatsapp&utm_medium=teste&utm_campaign=aprovacao`

  let msgId
  try {
    msgId = await chamarMeta(env, pedidoModelo({ telefone, nome: 'Paulo', sufixo }, env), fetchImpl)
  } catch (erro) {
    logger.error('Teste do WhatsApp para o Paulo não enviado:', erro?.message || erro)
    await avisarFalhaDoTeste(env, erro?.codigo, String(erro?.message || '').slice(0, 200), fetchImpl)
    return 'falhou'
  }

  const nonce = novoNonce()
  const passou = await db.prepare(`
    UPDATE whatsapp_estado
       SET estado = 'teste_enviado', teste_msg_id = ?, link_nonce = ?,
           link_expira_em = datetime('now', '+${LINK_VALIDO_HORAS} hours'),
           atualizado_em = datetime('now'), atualizado_por = 'robô'
     WHERE id = 1 AND estado = 'aguardando_modelo'`).bind(msgId, nonce).run()
  if (!mudou(passou)) return 'aguardando'

  const ligar = await montarLink(env, 'ligar', nonce)
  const pausar = await montarLink(env, 'pausar', nonce)
  const texto = `O lembrete do WhatsApp foi aprovado. Confira a mensagem no seu celular e toque em LIGAR se estiver tudo certo.\n\nLIGAR: ${ligar}\n\nNÃO LIGAR / PAUSAR: ${pausar}\n\nOs links valem por ${LINK_VALIDO_HORAS} horas e só funcionam uma vez. Também dá para ligar ou pausar na gestão: Recuperação → WhatsApp.`
  const botao = (href, rotulo, cor) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;margin:4px 8px 4px 0;border-radius:6px;background:${cor};color:#fff;text-decoration:none;font-weight:600">${rotulo}</a>`
  await emailAoSuporte(env, {
    assunto: 'WhatsApp aprovado: confira o teste e toque em LIGAR',
    texto,
    html: `<p>O lembrete do WhatsApp foi aprovado. Confira a mensagem no seu celular e toque em <strong>LIGAR</strong> se estiver tudo certo.</p><p>${botao(ligar, 'LIGAR', '#15803d')}${botao(pausar, 'NÃO LIGAR / PAUSAR', '#5c5c5c')}</p><p style="color:#5C5C5C">Os links valem por ${LINK_VALIDO_HORAS} horas e só funcionam uma vez. Também dá para ligar ou pausar na gestão: Recuperação → WhatsApp.</p>`,
  }, fetchImpl)
  return 'enviado'
}

// A Meta aceitou o teste, mas avisou depois que não entregou (ex.: cartão):
// volta a esperar e avisa o Paulo. O robô tenta de novo em 6 h.
export async function testeNaoEntregue(db, env, aviso, fetchImpl, logger) {
  const voltou = await db.prepare(`
    UPDATE whatsapp_estado
       SET estado = 'aguardando_modelo', link_nonce = NULL, link_expira_em = NULL,
           atualizado_em = datetime('now'), atualizado_por = 'robô'
     WHERE id = 1 AND estado = 'teste_enviado' AND teste_msg_id = ?`).bind(String(aviso?.id || '')).run()
  if (!mudou(voltou)) return false
  const erro = Array.isArray(aviso?.errors) ? aviso.errors[0] : null
  try {
    await avisarFalhaDoTeste(env, erro?.code, String(erro?.title || erro?.message || '').slice(0, 200), fetchImpl)
  } catch (falha) {
    logger.error('Aviso de teste não entregue falhou:', falha?.message || falha)
  }
  return true
}

// Rodada enquanto o WhatsApp não está ligado: confere o modelo e manda o teste.
export async function prepararLigacao(db, env, { dentroDoHorario, fetchImpl, logger }) {
  const estado = await lerEstado(db)
  if (estado.estado !== 'aguardando_modelo') return estado
  if (!env.WA_WABA_ID || !env.WA_LINK_SEGREDO || !env.WA_LINK_BASE) {
    logger.error('WhatsApp: falta WA_WABA_ID, WA_LINK_SEGREDO ou WA_LINK_BASE; o modelo não é conferido.')
    return estado
  }

  const modelo = await conferirModelo(db, env, fetchImpl, logger)
  const status = modelo?.status || estado.modelo_status
  if (modelo?.status === 'REJECTED') {
    try {
      await avisarRecusa(db, env, estado, modelo.motivo, fetchImpl)
    } catch (erro) {
      logger.error('Aviso de modelo recusado falhou:', erro?.message || erro)
    }
  }
  // Teste só em horário comercial (é uma mensagem no celular do Paulo).
  if (status === 'APPROVED' && dentroDoHorario) await enviarTeste(db, env, fetchImpl, logger)
  return lerEstado(db)
}

// ------------------------------------------- modelos da sequência ----

// Ligado: o status dos modelos da sequência na Meta, no máximo 1 consulta a
// cada 30 min (uma chamada traz todos). Sem WA_WABA_ID, usa o último status
// guardado. Devolve Map nome → { status, botaoUrl }.
export async function modelosDaSequencia(db, env, fetchImpl, logger) {
  if (env.WA_WABA_ID) {
    const vez = await db.prepare(`
      UPDATE whatsapp_estado SET modelo_conferido_em = datetime('now')
       WHERE id = 1 AND estado = 'ativo'
         AND (modelo_conferido_em IS NULL OR modelo_conferido_em <= datetime('now', '-${CONFERIR_MODELO_MIN} minutes'))`).run()
    if (mudou(vez)) await atualizarModelos(db, env, fetchImpl, logger)
  }
  const guardados = linhas(await db.prepare(`SELECT nome, status, botao_url FROM whatsapp_modelos LIMIT 20`).all())
  return new Map(guardados.map((m) => [m.nome, { status: m.status, botaoUrl: Number(m.botao_url || 0) }]))
}

async function atualizarModelos(db, env, fetchImpl, logger) {
  const { versao, token } = configuracaoMeta(env)
  const url = `https://graph.facebook.com/${versao}/${env.WA_WABA_ID}/message_templates?fields=name,status,language,components&limit=100`
  let dados
  try {
    const resposta = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } })
    dados = await resposta.json().catch(() => null)
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status} (código ${dados?.error?.code ?? '-'})`)
  } catch (erro) {
    logger.error('Consulta dos modelos na Meta falhou:', erro?.message || erro)
    return
  }
  const todos = Array.isArray(dados?.data) ? dados.data : []
  for (const nome of MODELOS) {
    const doNome = todos.filter((m) => m?.name === nome)
    const modelo = doNome.find((m) => m.language === 'pt_BR') || doNome[0]
    const status = String(modelo?.status || 'NAO_ENCONTRADO').toUpperCase()
    const componentes = Array.isArray(modelo?.components) ? modelo.components : []
    const botoes = componentes.find((c) => String(c?.type || '').toUpperCase() === 'BUTTONS')?.buttons || []
    const botaoUrl = Math.max(0, botoes.findIndex((b) => String(b?.type || '').toUpperCase() === 'URL'))
    await db.prepare(`
      INSERT INTO whatsapp_modelos (nome, status, botao_url, conferido_em) VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(nome) DO UPDATE SET status = excluded.status, botao_url = excluded.botao_url,
                                      conferido_em = excluded.conferido_em`).bind(nome, status, botaoUrl).run()
  }
}

// --------------------------------------------------- resumo do dia ----

// Uma vez por dia, depois das 20h de Brasília (quando os envios acabam).
export async function resumoDoDia(db, env, agora, fetchImpl, logger) {
  const local = new Date(new Date(agora).getTime() - 3 * 3600000)
  if (local.getUTCHours() < 20) return false
  const dia = hojeBrasilia(agora)
  const vez = await db.prepare(`
    UPDATE whatsapp_estado SET resumo_enviado_em = ?
     WHERE id = 1 AND estado = 'ativo' AND COALESCE(resumo_enviado_em, '') <> ?`).bind(dia, dia).run()
  if (!mudou(vez)) return false

  const n = (v) => Number(v || 0)
  const [d, m, a] = [dia.slice(8, 10), dia.slice(5, 7), dia.slice(0, 4)]
  const numeros = await numerosDoDia(db, dia)
  const total = (campo) => numeros.porMensagem.reduce((s, r) => s + n(r[campo]), 0)
  const totalRecusas = numeros.recusas.reduce((s, r) => s + n(r.total), 0)
  const porMensagem = numeros.porMensagem
    .map((r) => `- ${r.etapa}ª: ${n(r.enviadas)} enviadas, ${n(r.entregues)} entregues, ${n(r.lidas)} lidas`)
    .join('\n')
  const cliques = Object.entries(numeros.cliques)
    .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
    .map(([conteudo, quantos]) => `${conteudo}: ${quantos}`)
    .join(' · ')
  const totalCliques = Object.values(numeros.cliques).reduce((s, v) => s + v, 0)
  const encerradas = numeros.encerradas
    .map((r) => `- ${MOTIVOS[r.motivo] || r.motivo}: ${n(r.total)}`)
    .join('\n')
  const detalheRecusas = numeros.recusas.map((r) => `- ${n(r.total)} × ${explicarErro(r.codigo)}`).join('\n')
  const texto = [
    `WhatsApp em ${d}/${m}/${a}:`,
    `Enviadas: ${total('enviadas')}\nEntregues: ${total('entregues')}\nLidas: ${total('lidas')}\nRecusadas: ${totalRecusas}\nVoltaram ao checkout pelo botão: ${totalCliques}${cliques ? ` (${cliques})` : ''}\nCompraram hoje depois de um WhatsApp: ${n(numeros.compraram)}`,
    porMensagem ? `Por mensagem da sequência:\n${porMensagem}` : '',
    encerradas ? `Sequências que pararam hoje:\n${encerradas}` : '',
    totalRecusas ? `Recusas:\n${detalheRecusas}` : '',
    'Para pausar: gestão → Recuperação → WhatsApp → Pausar.',
  ].filter(Boolean).join('\n\n')
  try {
    await emailAoSuporte(env, { assunto: `WhatsApp: resumo de ${d}/${m}`, texto, html: paragrafos(texto) }, fetchImpl)
  } catch (erro) {
    logger.error('Resumo diário do WhatsApp não enviado:', erro?.message || erro)
  }
  return true
}

// Os números de um dia de Brasília (das 03:00 UTC às 03:00 UTC do dia
// seguinte), separados do e-mail para o teste conferir as contas.
export async function numerosDoDia(db, dia) {
  const inicio = `${dia} 03:00:00`
  const [porMensagem, recusas, origens, compraram, encerradas] = await Promise.all([
    db.prepare(`
      SELECT etapa, COUNT(*) AS enviadas,
             SUM(CASE WHEN wa_status IN ('delivered', 'read') THEN 1 ELSE 0 END) AS entregues,
             SUM(CASE WHEN wa_status = 'read' THEN 1 ELSE 0 END) AS lidas
        FROM lembretes_enviados
       WHERE canal = 'whatsapp' AND enviado_em >= ? AND enviado_em < datetime(?, '+1 day')
       GROUP BY etapa ORDER BY etapa`).bind(inicio, inicio).all(),
    // Recusas: mensagens da sequência que falharam e 1ªs que a Meta não aceitou.
    db.prepare(`
      SELECT codigo, SUM(total) AS total FROM (
        SELECT COALESCE(wa_erro, 'sem código') AS codigo, COUNT(*) AS total
          FROM lembretes_enviados
         WHERE canal = 'whatsapp' AND wa_status = 'failed'
           AND enviado_em >= ? AND enviado_em < datetime(?, '+1 day')
         GROUP BY 1
        UNION ALL
        SELECT COALESCE(whatsapp_erro, 'sem código'), COUNT(*)
          FROM carrinhos
         WHERE whatsapp_status = 'failed' AND whatsapp_enviado_em IS NULL
           AND whatsapp_falhou_em >= ? AND whatsapp_falhou_em < datetime(?, '+1 day')
         GROUP BY 1
      ) GROUP BY codigo ORDER BY total DESC`).bind(inicio, inicio, inicio, inicio).all(),
    // Quem tocou em "Finalizar compra" e preencheu o checkout de novo.
    db.prepare(`
      SELECT origem FROM carrinhos
       WHERE origem LIKE 'utm=whatsapp/lembrete/%'
         AND criado_em >= ? AND criado_em < datetime(?, '+1 day')
       LIMIT 500`).bind(inicio, inicio).all(),
    db.prepare(`
      SELECT COUNT(DISTINCT pago.email) AS total
        FROM carrinhos pago
       WHERE pago.pago_em >= ? AND pago.pago_em < datetime(?, '+1 day')
         AND EXISTS (
           SELECT 1 FROM carrinhos s
             JOIN lembretes_enviados l ON l.carrinho_id = s.id AND l.canal = 'whatsapp'
            WHERE (s.email = pago.email OR s.telefone = pago.telefone) AND l.enviado_em < pago.pago_em
            LIMIT 1
         )
       LIMIT 1`).bind(inicio, inicio).first(),
    db.prepare(`
      SELECT whatsapp_motivo AS motivo, COUNT(*) AS total
        FROM carrinhos
       WHERE whatsapp_encerrado_em >= ? AND whatsapp_encerrado_em < datetime(?, '+1 day')
       GROUP BY 1 ORDER BY 2 DESC`).bind(inicio, inicio).all(),
  ])
  // origem = "utm=whatsapp/lembrete/carrinho/semanaN;cupom=..."
  const cliques = {}
  for (const { origem } of linhas(origens)) {
    const partes = String(origem || '').split(';')[0].slice(4).split('/')
    const conteudo = partes[3] || 'sem marcação'
    cliques[conteudo] = (cliques[conteudo] || 0) + 1
  }
  return {
    porMensagem: linhas(porMensagem),
    recusas: linhas(recusas),
    cliques,
    compraram: Number(compraram?.total || 0),
    encerradas: linhas(encerradas),
  }
}

// ------------------------------------------------ página dos links ----

function pagina(titulo, corpo, status = 200) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(titulo)}</title></head><body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f3f3f1;color:#111"><main style="max-width:480px;margin:48px auto;padding:24px;background:#fff;border:1px solid #ddd;border-radius:8px"><h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(titulo)}</h1>${corpo}</main></body></html>`
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  })
}

const NOMES = { ligar: 'LIGAR', pausar: 'NÃO LIGAR / PAUSAR' }

async function linkValido(db, env, acao, nonce, t) {
  if (!NOMES[acao] || !/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(t) || !env.WA_LINK_SEGREDO) return false
  if (!textoIgual(t, await assinarLink(acao, nonce, env.WA_LINK_SEGREDO))) return false
  const linha = await db.prepare(`
    SELECT 1 AS ok FROM whatsapp_estado
     WHERE id = 1 AND estado = 'teste_enviado' AND link_nonce = ? AND link_expira_em > datetime('now')
     LIMIT 1`).bind(nonce).first()
  return Boolean(linha?.ok)
}

const INVALIDO = () =>
  pagina('Link inválido', '<p>Este link é inválido, expirou ou já foi usado. Para ligar ou pausar o WhatsApp, use a gestão: Recuperação → WhatsApp.</p>', 410)

// GET mostra um botão; só o POST muda o estado. Assim o antivírus do e-mail,
// que abre os links sozinho, não liga nada por engano.
export async function atenderLink(request, env) {
  const db = env.DB
  if (!db) return new Response(null, { status: 503 })

  if (request.method === 'GET') {
    const url = new URL(request.url)
    const acao = url.searchParams.get('acao') || ''
    const nonce = url.searchParams.get('n') || ''
    const t = url.searchParams.get('t') || ''
    if (!(await linkValido(db, env, acao, nonce, t))) return INVALIDO()
    const explicacao = acao === 'ligar'
      ? 'Os clientes que abandonarem o carrinho passam a receber o lembrete pelo WhatsApp (até 10 por dia nos 3 primeiros dias).'
      : 'Nenhum cliente recebe lembrete pelo WhatsApp. Dá para retomar depois pela gestão.'
    return pagina(`Confirmar: ${NOMES[acao]}`, `<p>${explicacao}</p><form method="post"><input type="hidden" name="acao" value="${acao}"><input type="hidden" name="n" value="${nonce}"><input type="hidden" name="t" value="${t}"><button type="submit" style="font-size:16px;padding:12px 20px;border:0;border-radius:6px;background:${acao === 'ligar' ? '#15803d' : '#5c5c5c'};color:#fff;font-weight:600;cursor:pointer">Confirmar ${NOMES[acao]}</button></form>`)
  }

  if (request.method === 'POST') {
    let campos
    try {
      campos = new URLSearchParams(await request.text())
    } catch {
      return INVALIDO()
    }
    const acao = campos.get('acao') || ''
    const nonce = campos.get('n') || ''
    const t = campos.get('t') || ''
    if (!(await linkValido(db, env, acao, nonce, t))) return INVALIDO()
    const novo = acao === 'ligar' ? 'ativo' : 'pausado'
    const feito = await db.prepare(`
      UPDATE whatsapp_estado
         SET estado = ?, link_nonce = NULL, link_expira_em = NULL,
             ligado_em = CASE WHEN ? = 'ativo' THEN datetime('now') ELSE ligado_em END,
             atualizado_em = datetime('now'), atualizado_por = 'link do e-mail'
       WHERE id = 1 AND estado = 'teste_enviado' AND link_nonce = ? AND link_expira_em > datetime('now')`).bind(novo, novo, nonce).run()
    if (!mudou(feito)) return INVALIDO()
    return novo === 'ativo'
      ? pagina('WhatsApp ligado', '<p>Pronto. A partir da próxima rodada (a cada 10 min, das 9h às 20h), os clientes recebem o lembrete. Nos 3 primeiros dias, no máximo 10 por dia. Você recebe um resumo por e-mail todo dia.</p><p>Para pausar: gestão → Recuperação → WhatsApp → Pausar.</p>')
      : pagina('WhatsApp pausado', '<p>Nenhum cliente vai receber lembrete pelo WhatsApp. Para retomar: gestão → Recuperação → WhatsApp → Retomar.</p>')
  }

  return new Response(null, { status: 404 })
}

export const CAMINHO_LINK_WHATSAPP = CAMINHO_LINK
