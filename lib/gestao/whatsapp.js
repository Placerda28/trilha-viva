import { isoUtc } from './clientes.js'
import {
  CUSTO_MENSAGEM_CENTAVOS,
  MODELO_RETOMAR,
  baixarMidia,
  chamarMeta,
  configuracaoMeta,
  nomeDoArquivo,
  pedidoMidia,
  pedidoRetomar,
  pedidoTexto,
  subirMidia,
  telefoneSemPais,
  textoRetomar,
  tipoDaMidia,
} from '../whatsapp-meta.js'
import {
  SQL_MENSAGENS,
  TOTAL_MENSAGENS,
  baseDaSeguinte,
  deSql,
  diasDeEmail,
  lerMensagens,
  paraSql,
  resumoDaSequencia,
} from '../whatsapp-sequencia.js'

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

// Totais de todas as mensagens da sequência. "Compraram depois" conta
// pessoas (sequências), não mensagens.
export async function totaisWhatsapp(db) {
  const linha = await db.prepare(`
    SELECT
      COUNT(*) AS enviados,
      SUM(CASE WHEN l.wa_status IN ('delivered', 'read') THEN 1 ELSE 0 END) AS entregues,
      SUM(CASE WHEN l.wa_status = 'read' THEN 1 ELSE 0 END) AS lidos,
      SUM(CASE WHEN l.wa_status = 'failed' THEN 1 ELSE 0 END) AS falharam,
      (SELECT COUNT(*) FROM carrinhos WHERE whatsapp_enviado_em IS NOT NULL) AS pessoas,
      (SELECT COUNT(*) FROM carrinhos c
        WHERE c.whatsapp_enviado_em IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM carrinhos pago
             WHERE (pago.email = c.email OR pago.telefone = c.telefone) AND pago.pago_em > c.whatsapp_enviado_em
             LIMIT 1
          )) AS recuperados
      FROM lembretes_enviados l
     WHERE l.canal = 'whatsapp'
     LIMIT 1`).first()
  const enviados = Number(linha?.enviados || 0)
  const retomadas = await db.prepare(`
    SELECT COUNT(*) AS total FROM whatsapp_mensagens WHERE direcao = 'saida' AND modelo IS NOT NULL LIMIT 1`).first()
  const chamadas = Number(retomadas?.total || 0)
  return {
    enviados,
    retomadas: chamadas,
    pessoas: Number(linha?.pessoas || 0),
    entregues: Number(linha?.entregues || 0),
    lidos: Number(linha?.lidos || 0),
    falharam: Number(linha?.falharam || 0),
    recuperados: Number(linha?.recuperados || 0),
    custo_estimado_centavos: (enviados + chamadas) * CUSTO_MENSAGEM_CENTAVOS,
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
      SELECT id, telefone, direcao, texto, nome_perfil, enviado_por, criado_em, midia_tipo, midia_nome, midia_mime, modelo
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
      id: m.id,
      direcao: m.direcao,
      texto: m.texto,
      enviado_por: m.enviado_por || null,
      em: isoUtc(m.criado_em),
      midia: m.midia_tipo ? { tipo: m.midia_tipo, nome: m.midia_nome || null, mime: m.midia_mime || null } : null,
      modelo: m.modelo || null,
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

// O que a Meta respondeu, em português e com o código, para a tela da
// gestão. Nunca leva o token: só o código e a frase curta da própria Meta.
const ERROS_META = [
  [[190], 'o token do WhatsApp expirou ou foi trocado. Gere um token novo e grave no Cloudflare.'],
  [[200, 10, 3], 'a Meta bloqueou o acesso à API. Confira restrições do app e da conta no Meta Business (Central de suporte do negócio).'],
  [[368, 131031], 'a conta do WhatsApp está restrita pela Meta. Veja a Central de suporte do negócio.'],
  [[131042], 'problema na forma de pagamento da conta do WhatsApp.'],
  [[131047], 'passaram 24 h desde a última mensagem do cliente. Ele precisa escrever de novo.'],
  [[131026], 'esse número não recebe mensagens do WhatsApp.'],
  [[132001], 'o modelo "Chamar de novo" ainda não foi aprovado pela Meta.'],
  [[131052, 131053], 'a Meta não conseguiu usar esse arquivo. Confira o formato e o tamanho.'],
  [[131030], 'esse número não está na lista de teste da Meta.'],
  [[4, 80007, 130429, 131048, 131056], 'limite de envio da Meta atingido. Espere alguns minutos e tente de novo.'],
]

export function explicarErroMeta(erro) {
  if (erro?.name === 'AbortError') return 'A Meta não respondeu a tempo. Tente de novo em instantes.'
  const codigo = Number(erro?.codigo)
  if (!Number.isFinite(codigo)) return 'A Meta não aceitou a mensagem agora. Tente de novo em instantes.'
  const conhecido = ERROS_META.find(([codigos]) => codigos.includes(codigo))
  const original = String(erro?.message || '').split(': ').slice(1).join(': ').slice(0, 120)
  const motivo = conhecido ? conhecido[1] : 'tente de novo em instantes.'
  return 'A Meta recusou (código ' + codigo + (original ? ', "' + original + '"' : '') + '): ' + motivo
}

async function janelaAberta(db, telefone) {
  const janela = await db.prepare(`
    SELECT MAX(criado_em) > datetime('now', '-24 hours') AS aberta
      FROM whatsapp_mensagens
     WHERE telefone = ? AND direcao = 'entrada'
     LIMIT 1`).bind(telefone).first()
  return Boolean(Number(janela?.aberta || 0))
}

const JANELA_FECHADA = {
  ok: false,
  erro: 'Janela de 24 h fechada — o cliente precisa escrever de novo.',
  status: 409,
}

// Resposta pela gestão. A janela de 24 h é conferida AQUI (no servidor), não
// só na tela: fora dela a Meta recusaria e cobraria a tentativa.
export async function responderConversa(db, env, { telefone, texto, quem }, fetchImpl = globalThis.fetch) {
  if (!configuracaoMeta(env).ok) return { ok: false, erro: 'O WhatsApp ainda não está configurado.', status: 503 }

  if (!(await janelaAberta(db, telefone))) return JANELA_FECHADA

  let id
  try {
    id = await chamarMeta(env, pedidoTexto(telefone, texto), fetchImpl)
  } catch (erro) {
    console.error('Resposta pelo WhatsApp não enviada:', erro?.message || erro)
    return { ok: false, erro: explicarErroMeta(erro), codigo: erro?.codigo ?? null, status: 502 }
  }

  await db.prepare(`
    INSERT OR IGNORE INTO whatsapp_mensagens (wa_msg_id, telefone, direcao, texto, enviado_por)
    VALUES (?, ?, 'saida', ?, ?)`).bind(id, telefone, texto, quem || null).run()
  return { ok: true }
}

// ------------------------------------------------------- anexos ----

const TAMANHO_LEGENDA = 1000

// Confere o arquivo antes de gastar a ida até a Meta.
export function validarAnexo({ telefone, mime, tamanho, legenda }) {
  const numero = telefoneDaConversa(telefone)
  if (!numero) return { ok: false, erro: 'Conversa inválida.' }
  const midia = tipoDaMidia(mime)
  if (!midia) {
    return { ok: false, erro: 'Esse tipo de arquivo não vai pelo WhatsApp. Use foto (JPG ou PNG), PDF, documento do Office, áudio ou vídeo MP4.' }
  }
  const bytes = Number(tamanho) || 0
  if (bytes <= 0) return { ok: false, erro: 'O arquivo está vazio.' }
  if (bytes > midia.limite) {
    return { ok: false, erro: `Arquivo grande demais: o limite para esse tipo é ${Math.round(midia.limite / 1048576)} MB.` }
  }
  const texto = String(legenda || '').trim()
  if (texto.length > TAMANHO_LEGENDA) return { ok: false, erro: `A legenda pode ter até ${TAMANHO_LEGENDA} caracteres.` }
  return { ok: true, telefone: numero, midia, legenda: texto }
}

// Envia um arquivo (com legenda opcional) dentro da janela de 24 h.
export async function responderComAnexo(db, env, { telefone, midia, legenda, arquivo, nome, quem }, fetchImpl = globalThis.fetch) {
  if (!configuracaoMeta(env).ok) return { ok: false, erro: 'O WhatsApp ainda não está configurado.', status: 503 }
  if (!(await janelaAberta(db, telefone))) return JANELA_FECHADA

  const nomeLimpo = nomeDoArquivo(nome)
  let midiaId
  let id
  try {
    midiaId = await subirMidia(env, { arquivo, mime: midia.mime, nome: nomeLimpo }, fetchImpl)
    id = await chamarMeta(env, pedidoMidia(telefone, { tipo: midia.tipo, midiaId, legenda, nome: nomeLimpo }), fetchImpl)
  } catch (erro) {
    console.error('Anexo pelo WhatsApp não enviado:', erro?.message || erro)
    return { ok: false, erro: explicarErroMeta(erro), codigo: erro?.codigo ?? null, status: 502 }
  }

  await db.prepare(`
    INSERT OR IGNORE INTO whatsapp_mensagens (wa_msg_id, telefone, direcao, texto, enviado_por, midia_tipo, midia_id, midia_nome, midia_mime)
    VALUES (?, ?, 'saida', ?, ?, ?, ?, ?, ?)`).bind(id, telefone, legenda || '', quem || null, midia.tipo, midiaId, nomeLimpo, midia.mime).run()
  return { ok: true }
}

// O arquivo de uma mensagem da conversa, buscado na Meta na hora.
export async function midiaDaMensagemGuardada(db, env, id, fetchImpl = globalThis.fetch) {
  const numero = Number(id)
  if (!Number.isInteger(numero) || numero <= 0) return { ok: false, status: 404 }
  const linha = await db.prepare(`
    SELECT midia_id, midia_nome, midia_mime FROM whatsapp_mensagens WHERE id = ? AND midia_id IS NOT NULL LIMIT 1`).bind(numero).first()
  if (!linha) return { ok: false, status: 404 }
  try {
    const { resposta, mime } = await baixarMidia(env, linha.midia_id, fetchImpl)
    return { ok: true, resposta, mime: linha.midia_mime || mime, nome: linha.midia_nome || null }
  } catch (erro) {
    console.error('Mídia do WhatsApp não baixada:', erro?.message || erro)
    // A Meta guarda o arquivo por uns 30 dias; depois, 404.
    return { ok: false, status: 410 }
  }
}

// --------------------------------------------------- chamar de novo ----

// Fora da janela, só um modelo aprovado reabre a conversa (pago, ~R$ 0,32).
// Uma vez a cada 24 h por pessoa, e nunca para quem pediu para sair.
export async function retomarConversa(db, env, { telefone, quem }, fetchImpl = globalThis.fetch) {
  if (!configuracaoMeta(env).ok) return { ok: false, erro: 'O WhatsApp ainda não está configurado.', status: 503 }
  if (await janelaAberta(db, telefone)) {
    return { ok: false, erro: 'A janela está aberta: responda normalmente, sem custo.', status: 409 }
  }

  const [recente, descadastro, pessoa] = await Promise.all([
    db.prepare(`
      SELECT 1 AS sim FROM whatsapp_mensagens
       WHERE telefone = ? AND direcao = 'saida' AND modelo IS NOT NULL AND criado_em > datetime('now', '-24 hours')
       LIMIT 1`).bind(telefone).first(),
    db.prepare(`
      SELECT 1 AS sim FROM descadastros
       WHERE email IN (SELECT email FROM carrinhos WHERE telefone = ?)
       LIMIT 1`).bind(telefone).first(),
    db.prepare(`
      SELECT COALESCE(
        (SELECT nome FROM carrinhos WHERE telefone = ? AND nome IS NOT NULL ORDER BY criado_em DESC LIMIT 1),
        (SELECT nome_perfil FROM whatsapp_mensagens WHERE telefone = ? AND nome_perfil IS NOT NULL ORDER BY criado_em DESC LIMIT 1)
      ) AS nome`).bind(telefone, telefone).first(),
  ])
  if (recente) {
    return { ok: false, erro: 'Você já chamou essa pessoa nas últimas 24 h. Espere ela responder.', status: 409 }
  }
  if (descadastro) {
    return { ok: false, erro: 'Essa pessoa pediu para não receber mais mensagens.', status: 409 }
  }

  const nome = pessoa?.nome || ''
  let id
  try {
    id = await chamarMeta(env, pedidoRetomar(telefone, nome, env), fetchImpl)
  } catch (erro) {
    console.error('Chamar de novo pelo WhatsApp não enviado:', erro?.message || erro)
    return { ok: false, erro: explicarErroMeta(erro), codigo: erro?.codigo ?? null, status: 502 }
  }

  await db.prepare(`
    INSERT OR IGNORE INTO whatsapp_mensagens (wa_msg_id, telefone, direcao, texto, enviado_por, modelo)
    VALUES (?, ?, 'saida', ?, ?, ?)`).bind(id, telefone, textoRetomar(nome), quem || null, String(env.WA_TEMPLATE_RETOMAR || MODELO_RETOMAR)).run()
  return { ok: true }
}

// --------------------------------------------------- sequências ----

const SEQUENCIAS = 100
const ENTREGA = { sent: 'enviado', delivered: 'entregue', read: 'lido', failed: 'falhou' }

function iso(data) {
  return data ? new Date(data).toISOString().slice(0, 19) + 'Z' : null
}

// Uma linha por sequência (rodando primeiro, pela próxima data; depois as
// encerradas, as mais recentes em cima). Tudo numa consulta só.
export async function consultarSequencias(db, agora = new Date()) {
  const resultado = await db.prepare(`
    SELECT c.id, c.nome, c.email, c.telefone, c.whatsapp_enviado_em, c.whatsapp_etapa,
           c.proximo_whatsapp_em, c.whatsapp_encerrado_em, c.whatsapp_motivo,
           (SELECT ${SQL_MENSAGENS} FROM lembretes_enviados l
             WHERE l.carrinho_id = c.id AND l.canal = 'whatsapp') AS mensagens,
           EXISTS (SELECT 1 FROM carrinhos pago
                    WHERE pago.status = 'pago' AND (pago.email = c.email OR pago.telefone = c.telefone)
                    LIMIT 1) AS comprou,
           EXISTS (SELECT 1 FROM descadastros d
                    WHERE d.email IN (SELECT o.email FROM carrinhos o WHERE o.telefone = c.telefone OR o.email = c.email)
                    LIMIT 1) AS descadastrado,
           (SELECT group_concat(l.enviado_em, ';') FROM lembretes_enviados l
              JOIN carrinhos o ON o.id = l.carrinho_id
             WHERE l.canal = 'email' AND o.email = c.email) AS emails_enviados,
           (SELECT group_concat(o.proximo_email_em, ';') FROM carrinhos o
             WHERE o.email = c.email AND o.status = 'lembrado' AND o.finalizado_em IS NULL
               AND o.etapa_email < 4) AS emails_previstos
      FROM carrinhos c
     WHERE c.whatsapp_enviado_em IS NOT NULL
     ORDER BY (c.whatsapp_encerrado_em IS NULL) DESC, c.proximo_whatsapp_em ASC,
              c.whatsapp_encerrado_em DESC, c.id ASC
     LIMIT ${SEQUENCIAS}`).all()

  const lista = linhas(resultado).map((s) => {
    const mensagens = lerMensagens(s.mensagens)
    const datasEmail = [
      ...String(s.emails_enviados || '').split(';'),
      ...String(s.emails_previstos || '').split(';'),
    ].filter(Boolean)
    const resumo = resumoDaSequencia({
      etapa: s.whatsapp_etapa,
      proximoEm: deSql(s.proximo_whatsapp_em),
      motivo: s.whatsapp_motivo,
      mensagens,
      comprou: Boolean(Number(s.comprou || 0)),
      descadastrado: Boolean(Number(s.descadastrado || 0)),
      diasComEmail: diasDeEmail(datasEmail),
    }, agora)
    return {
      telefone: s.telefone,
      nome: s.nome || null,
      email: s.email,
      total: TOTAL_MENSAGENS,
      enviadas: resumo.enviadas,
      mensagens: mensagens.map((m) => ({
        numero: m.numero,
        enviado_em: iso(m.enviado_em),
        situacao: ENTREGA[m.status] || 'enviado',
        situacao_em: iso(m.status_em),
        erro: m.erro,
      })),
      proximo_numero: resumo.proximo_numero,
      proximo_em: iso(resumo.proximo_em),
      motivo: resumo.motivo,
      encerrado_em: isoUtc(s.whatsapp_encerrado_em),
      // Parar: só a que está rodando. Retomar: só a pausada por resposta.
      pode_parar: !s.whatsapp_encerrado_em && !resumo.motivo,
      pode_retomar: s.whatsapp_motivo === 'respondeu' && resumo.enviadas < TOTAL_MENSAGENS &&
        !Number(s.comprou || 0) && !Number(s.descadastrado || 0),
    }
  })
  // As que pararam só pela regra de entrega (a rodada ainda não gravou)
  // descem junto com as encerradas; a ordem dentro de cada grupo se mantém.
  return [...lista.filter((s) => !s.motivo), ...lista.filter((s) => s.motivo)]
}

const ACOES_SEQUENCIA = new Set(['parar', 'retomar'])

export function validarAcaoSequencia(corpo) {
  const telefone = telefoneDaConversa(corpo?.telefone)
  const acao = String(corpo?.acao || '')
  if (!telefone || !ACOES_SEQUENCIA.has(acao)) return { ok: false, erro: 'Pedido inválido.' }
  return { ok: true, telefone, acao }
}

// Parar: encerra a sequência que está rodando ('gestao'). Retomar: só a que
// pausou porque a pessoa respondeu; a próxima vai para a semana dela (pelo
// menos 6 dias depois da última) e a rodada ajusta horário e dia de e-mail.
export async function mudarSequencia(db, { telefone, acao }, agora = new Date()) {
  if (acao === 'parar') {
    const feito = await db.prepare(`
      UPDATE carrinhos
         SET whatsapp_encerrado_em = datetime('now'), whatsapp_motivo = 'gestao', proximo_whatsapp_em = NULL
       WHERE telefone = ? AND whatsapp_enviado_em IS NOT NULL AND whatsapp_encerrado_em IS NULL`).bind(telefone).run()
    if (Number(feito?.meta?.changes ?? 0) < 1) {
      return { ok: false, erro: 'Essa sequência já não está rodando. Atualize a página.', status: 409 }
    }
    return { ok: true }
  }

  const linha = await db.prepare(`
    SELECT c.id, c.whatsapp_enviado_em, c.whatsapp_etapa,
           (SELECT MAX(l.enviado_em) FROM lembretes_enviados l
             WHERE l.carrinho_id = c.id AND l.canal = 'whatsapp') AS ultima_em
      FROM carrinhos c
     WHERE c.telefone = ? AND c.whatsapp_motivo = 'respondeu' AND c.whatsapp_etapa < ?
     ORDER BY c.whatsapp_encerrado_em DESC
     LIMIT 1`).bind(telefone, TOTAL_MENSAGENS).first()
  if (!linha) return { ok: false, erro: 'Essa sequência não está pausada por resposta. Atualize a página.', status: 409 }
  const base = baseDaSeguinte(deSql(linha.whatsapp_enviado_em), Number(linha.whatsapp_etapa), deSql(linha.ultima_em))
  const vez = new Date(Math.max(base.getTime(), new Date(agora).getTime()))
  const feito = await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_encerrado_em = NULL, whatsapp_motivo = NULL, proximo_whatsapp_em = ?
     WHERE id = ? AND whatsapp_motivo = 'respondeu'`).bind(paraSql(vez), linha.id).run()
  if (Number(feito?.meta?.changes ?? 0) !== 1) {
    return { ok: false, erro: 'Essa sequência mudou. Atualize a página.', status: 409 }
  }
  return { ok: true }
}

// ------------------------------------------------ ligado / pausado ----

// O estado mora no banco (tabela whatsapp_estado, migração 0009). O robô
// passa de aguardando_modelo para teste_enviado sozinho; daqui a gestão liga,
// pausa e retoma sem deploy.
export async function lerEstadoWhatsapp(db) {
  const linha = await db.prepare(`
    SELECT estado, modelo_status, ligado_em, atualizado_em, atualizado_por
      FROM whatsapp_estado WHERE id = 1 LIMIT 1`).first()
  return {
    estado: linha?.estado || 'aguardando_modelo',
    modelo_status: linha?.modelo_status || null,
    ligado_em: isoUtc(linha?.ligado_em),
    atualizado_em: isoUtc(linha?.atualizado_em),
    atualizado_por: linha?.atualizado_por || null,
  }
}

// Ação → de onde pode sair e para onde vai.
const MUDANCAS = {
  pausar: { de: ['ativo', 'teste_enviado'], para: 'pausado' },
  retomar: { de: ['pausado'], para: 'ativo' },
  ligar: { de: ['teste_enviado'], para: 'ativo' },
}

export function acaoDeEstadoValida(valor) {
  return Object.hasOwn(MUDANCAS, String(valor || '')) ? String(valor) : null
}

export async function mudarEstadoWhatsapp(db, acao, quem) {
  const regra = MUDANCAS[acao]
  if (!regra) return { ok: false, erro: 'Ação inválida.', status: 400 }
  const marcadores = regra.de.map(() => '?').join(', ')
  const resultado = await db.prepare(`
    UPDATE whatsapp_estado
       SET estado = ?, link_nonce = NULL, link_expira_em = NULL,
           ligado_em = CASE WHEN ? = 'ativo' THEN COALESCE(ligado_em, datetime('now')) ELSE ligado_em END,
           atualizado_em = datetime('now'), atualizado_por = ?
     WHERE id = 1 AND estado IN (${marcadores})`)
    .bind(regra.para, regra.para, quem || null, ...regra.de)
    .run()
  if (Number(resultado?.meta?.changes ?? 0) !== 1) {
    return { ok: false, erro: 'O estado do WhatsApp mudou. Atualize a página.', status: 409 }
  }
  return { ok: true, estado: await lerEstadoWhatsapp(db) }
}
