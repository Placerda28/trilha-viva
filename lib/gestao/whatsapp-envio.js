import {
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

// O que a gestão manda pelo WhatsApp: resposta em texto, anexo e "chamar de
// novo", com a janela de 24 h conferida no servidor. As consultas ficam em
// whatsapp.js, que reexporta tudo daqui.

const TAMANHO_RESPOSTA = 1000

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
