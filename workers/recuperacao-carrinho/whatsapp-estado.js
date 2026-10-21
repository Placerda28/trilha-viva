import { escapeHtml } from '../../lib/safe.js'
import {
  chamarMeta,
  configuracaoMeta,
  pedidoModelo,
  telefoneSemPais,
  textoIgual,
} from '../../lib/whatsapp-meta.js'
import { MODELOS } from '../../lib/whatsapp-sequencia.js'
import {
  CAMINHO_LINK,
  assinarLink,
  emailAoSuporte,
  explicarErro,
  hojeBrasilia,
  linhas,
  montarLink,
  mudou,
  novoNonce,
  paragrafos,
} from './whatsapp-suporte.js'

// E-mail ao suporte, erros da Meta e links assinados ficam em
// whatsapp-suporte.js; o resumo do dia, em whatsapp-resumo.js. Quem já
// importava daqui segue importando daqui.
export { emailAoSuporte, erroDeAcesso, explicarErro, hojeBrasilia } from './whatsapp-suporte.js'
export { resumoDoDia, numerosDoDia } from './whatsapp-resumo.js'

// Ligar o WhatsApp sem deploy. O estado fica no banco (tabela whatsapp_estado):
//   aguardando_modelo → a Meta aprova o modelo → teste vai para o celular do
//   Paulo → teste_enviado → LIGAR (ativo) ou NÃO LIGAR (pausado).
// O WA_MODO continua sendo a trava geral: fora de teste/ativo nada roda.

const CONFERIR_MODELO_MIN = 30
const TESTE_A_CADA_HORAS = 6
const LINK_VALIDO_HORAS = 72
const DIAS_DE_FREIO = 3
const TETO_DO_FREIO = 10

export async function lerEstado(db) {
  const linha = await db.prepare(`
    SELECT *, COALESCE(ligado_em > datetime('now', '-${DIAS_DE_FREIO} days'), 0) AS no_freio
      FROM whatsapp_estado WHERE id = 1 LIMIT 1`).first()
  return linha || { estado: 'aguardando_modelo' }
}

// Nos 3 primeiros dias depois de ligar, no máximo 10 por dia (a conta dos
// dias é feita no banco, com o mesmo relógio das outras datas).
export function tetoDoDia(estado, tetoNormal) {
  return Number(estado?.no_freio || 0) ? Math.min(TETO_DO_FREIO, tetoNormal) : tetoNormal
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

// ------------------------------------------ token/acesso recusado ----

// O WhatsApp para para todo mundo até o Paulo resolver. No máximo 1 e-mail
// por dia de Brasília; se o e-mail não sair, a próxima rodada tenta de novo.
export async function avisarAcessoRecusado(db, env, codigo, agora, fetchImpl, logger) {
  const dia = hojeBrasilia(agora)
  const vez = await db.prepare(`
    UPDATE whatsapp_estado SET acesso_avisado_em = ?
     WHERE id = 1 AND COALESCE(acesso_avisado_em, '') <> ?`).bind(dia, dia).run()
  if (!mudou(vez)) return false
  const texto = `O robô tentou mandar um WhatsApp e a Meta recusou o token ou o acesso.\n\n${explicarErro(codigo)}\n\nNenhum carrinho foi prejudicado: quem estava na vez continua na fila, e o robô tenta de novo a cada rodada (dentro das 48 h do carrinho, das 9h às 20h). Este aviso vem no máximo 1 vez por dia.`
  try {
    await emailAoSuporte(env, {
      assunto: `WhatsApp parado: token/acesso recusado pela Meta (código ${codigo})`,
      texto,
      html: paragrafos(texto),
      chave: `whatsapp-parado-${dia}`,
    }, fetchImpl)
    return true
  } catch (erro) {
    logger.error('Aviso de WhatsApp parado não enviado:', erro?.message || erro)
    await db.prepare(`
      UPDATE whatsapp_estado SET acesso_avisado_em = NULL WHERE id = 1 AND acesso_avisado_em = ?`).bind(dia).run()
    return false
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
