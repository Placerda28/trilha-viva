import { chamarMeta, configuracaoMeta, telefoneSemPais } from '../../lib/whatsapp-meta.js'
import { MODELO_ACESSO, pedidoAcesso } from '../../lib/whatsapp-acesso.js'
import { emailAoSuporte } from './whatsapp-estado.js'
import { escapeHtml } from '../../lib/safe.js'

// Acompanha na Meta o modelo "acesso_liberado" (WhatsApp de acesso depois do
// pagamento). Só o robô tem a chave da Meta, por isso a conferência mora aqui:
//   - no máximo 1 consulta a cada 30 min, só deste modelo;
//   - o status fica em whatsapp_modelos (nome 'acesso_liberado'), com o
//     motivo junto quando a Meta recusa;
//   - mudou o status: e-mail para o suporte;
//   - aprovado: UMA mensagem de teste para o celular do Paulo (WA_TESTE_PARA),
//     com um link de criar senha de verdade, de uma compra de teste. A marca
//     de "teste enviado" fica em whatsapp_modelos (nome 'acesso_liberado_teste').
// Nada aqui decide envio para cliente: quem liga isso é o WA_ACESSO do site.

const CONFERIR_MIN = 30
const NOME_TESTE = MODELO_ACESSO + '_teste'
const VALIDADE_HORAS = 72

function mudou(resultado) {
  return Number(resultado?.meta?.changes ?? resultado?.changes ?? 0) === 1
}

// Mesmo formato do site (lib/sessao.js): 32 bytes aleatórios em base64url, e
// no banco só o resumo SHA-256 em hexadecimal.
function novoToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).split('+').join('-').split('/').join('_').split('=').join('')
}

async function resumo(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(texto)))
  let hex = ''
  for (const b of new Uint8Array(buf)) hex += b.toString(16).padStart(2, '0')
  return hex
}

async function consultarNaMeta(env, fetchImpl) {
  const { versao, token } = configuracaoMeta(env)
  const url = `https://graph.facebook.com/${versao}/${env.WA_WABA_ID}/message_templates?name=${encodeURIComponent(MODELO_ACESSO)}&fields=name,status,language,rejected_reason`
  const resposta = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } })
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} (código ${dados?.error?.code ?? '-'})`)
  const doNome = (Array.isArray(dados?.data) ? dados.data : []).filter((m) => m?.name === MODELO_ACESSO)
  const modelo = doNome.find((m) => m.language === 'pt_BR') || doNome[0]
  const status = String(modelo?.status || 'NAO_ENCONTRADO').toUpperCase()
  const motivo = String(modelo?.rejected_reason || '').trim()
  // O motivo vai junto no texto: assim a tabela não precisa de coluna nova.
  return status === 'REJECTED' && motivo && motivo !== 'NONE' ? `${status}: ${motivo}` : status
}

// Link de criar senha de uma compra de TESTE (contato da lista de testes, com
// compra paga). Nunca de cliente real.
async function linkDeTeste(db) {
  const cliente = await db.prepare(`
    SELECT c.id, c.nome FROM clientes c
     WHERE c.email IN (SELECT valor FROM contatos_teste WHERE tipo = 'email')
       AND EXISTS (SELECT 1 FROM compras p WHERE p.cliente_id = c.id AND p.status = 'pago' AND p.teste = 1 LIMIT 1)
     ORDER BY c.supabase_id IS NULL DESC, c.id DESC
     LIMIT 1`).first()
  if (!cliente) return null
  const token = novoToken()
  await db.prepare(`
    INSERT INTO tokens (cliente_id, token_hash, tipo, expira_em)
    VALUES (?, ?, 'criar_senha', datetime('now', '+${VALIDADE_HORAS} hours'))`).bind(cliente.id, await resumo(token)).run()
  return { token, nome: cliente.nome || 'Paulo' }
}

async function enviarTeste(db, env, fetchImpl, logger) {
  // Marca antes de enviar: dois ciclos ao mesmo tempo não mandam dois testes.
  const vez = await db.prepare(`
    INSERT OR IGNORE INTO whatsapp_modelos (nome, status, conferido_em) VALUES (?, 'ENVIANDO', datetime('now'))`).bind(NOME_TESTE).run()
  if (!mudou(vez)) return null

  let situacao
  try {
    const telefone = telefoneSemPais(env.WA_TESTE_PARA)
    const link = await linkDeTeste(db)
    if (!telefone || !link) throw new Error('sem celular de teste ou sem compra de teste')
    const id = await chamarMeta(env, pedidoAcesso({ telefone, nome: link.nome, token: link.token }, env), fetchImpl)
    situacao = 'ENVIADO ' + String(id).slice(0, 60)
    logger.log(`acesso_liberado: teste enviado ao celular de teste (${id})`)
  } catch (erro) {
    situacao = 'FALHOU: ' + String(erro?.message || erro).slice(0, 150)
    logger.error('acesso_liberado: teste não saiu:', erro?.message || erro)
  }
  await db.prepare(`UPDATE whatsapp_modelos SET status = ?, conferido_em = datetime('now') WHERE nome = ?`).bind(situacao, NOME_TESTE).run()
  return situacao
}

export async function acompanharAcessoLiberado(env, { db, fetchImpl = globalThis.fetch, logger = console } = {}) {
  if (!db || !env.WA_WABA_ID || !configuracaoMeta(env).ok) return null

  const anterior = await db.prepare(`
    SELECT status, conferido_em <= datetime('now', '-${CONFERIR_MIN} minutes') AS na_hora
      FROM whatsapp_modelos WHERE nome = ? LIMIT 1`).bind(MODELO_ACESSO).first()
  if (anterior && !Number(anterior.na_hora || 0)) return null

  let status
  try {
    status = await consultarNaMeta(env, fetchImpl)
  } catch (erro) {
    logger.error('acesso_liberado: consulta na Meta falhou:', erro?.message || erro)
    return null
  }
  await db.prepare(`
    INSERT INTO whatsapp_modelos (nome, status, conferido_em) VALUES (?, ?, datetime('now'))
    ON CONFLICT(nome) DO UPDATE SET status = excluded.status, conferido_em = excluded.conferido_em`).bind(MODELO_ACESSO, status).run()
  logger.log(`acesso_liberado: status na Meta ${status}`)

  if (anterior?.status !== status && (status === 'APPROVED' || status.startsWith('REJECTED'))) {
    const aprovado = status === 'APPROVED'
    const texto = aprovado
      ? 'A Meta aprovou o modelo "acesso_liberado". O robô manda agora uma mensagem de teste para o seu celular, com um link de criar senha de uma compra de teste. Para valer para os clientes, falta ligar WA_ACESSO=ativo no site (Worker www) e fazer o Promote version.'
      : `A Meta recusou o modelo "acesso_liberado". Status: ${status}. Nenhum cliente é afetado: o e-mail de acesso continua saindo normalmente.`
    try {
      await emailAoSuporte(env, { assunto: aprovado ? 'WhatsApp: modelo acesso_liberado APROVADO' : 'WhatsApp: modelo acesso_liberado recusado', texto, html: '<p>' + escapeHtml(texto) + '</p>' }, fetchImpl)
    } catch (erro) {
      logger.error('acesso_liberado: aviso por e-mail falhou:', erro?.message || erro)
    }
  }

  if (status === 'APPROVED') await enviarTeste(db, env, fetchImpl, logger)
  return status
}
