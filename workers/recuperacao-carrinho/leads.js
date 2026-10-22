import { montarEmailLead } from '../../lib/emails-lead.js'
import { normalizarEmailLembrete } from '../../lib/lembrete-assinatura.js'

const COMPRA_REAL = `EXISTS (SELECT 1 FROM compras p JOIN clientes c ON c.id = p.cliente_id
  WHERE c.email = leads.email AND p.status = 'pago' AND p.teste = 0 LIMIT 1)`

export async function executarLeads(env, { fetchImpl = fetch, logger = console } = {}) {
  const db = env.DB
  if (!db || !env.RESEND_API_KEY || !env.EMAIL_FROM || !env.LEMBRETE_SEGREDO) {
    throw new Error('Envio de e-mail de lead não configurado.')
  }
  const resultado = { enviados: 0, compradores: 0, falhas: 0 }
  const { results: leads = [] } = await db.prepare(`SELECT id, nome, email, token_hash, etapa_email
    FROM leads WHERE proximo_email_em <= datetime('now')
      AND consentimento = 1 AND descadastrado = 0 AND comprou = 0 AND etapa_email BETWEEN 0 AND 3
    ORDER BY proximo_email_em, id LIMIT 20`).all()
  for (const lead of leads) {
    if (env.MODO !== 'ativo' && lead.email !== normalizarEmailLembrete(env.TESTE_PARA)) continue
    try {
      const compra = await db.prepare(`UPDATE leads SET comprou = 1,
        comprou_em = COALESCE(comprou_em, datetime('now')), proximo_email_em = NULL
        WHERE id = ? AND ${COMPRA_REAL}`).bind(lead.id).run()
      if (compra.meta.changes) {
        resultado.compradores++
        continue
      }
      // Reserva atômica e curta: concorrência não duplica, queda não prende a fila.
      const reserva = await db.prepare(`UPDATE leads SET proximo_email_em = datetime('now', '+10 minutes')
        WHERE id = ? AND token_hash = ? AND etapa_email = ?
          AND proximo_email_em <= datetime('now') AND consentimento = 1
          AND descadastrado = 0 AND comprou = 0 AND NOT ${COMPRA_REAL}`)
        .bind(lead.id, lead.token_hash, lead.etapa_email).run()
      if (!reserva.meta.changes) continue
      const etapa = lead.etapa_email + 1
      const corpo = await montarEmailLead(lead, env, etapa)
      const resposta = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json',
          'Idempotency-Key': `lead:${lead.token_hash}:robo:${etapa}`,
        },
        body: JSON.stringify(corpo), signal: AbortSignal.timeout(10000),
      })
      if (!resposta.ok) throw new Error(`Resend respondeu com HTTP ${resposta.status}`)
      const dias = { 1: '+2 days', 2: '+4 days', 3: '+7 days', 4: null }
      // O token identifica o cadastro: não sobrescreve recadastro durante o envio.
      await db.prepare(`UPDATE leads SET
        etapa_email = CASE WHEN token_hash = ? THEN ? ELSE etapa_email END, envios = envios + 1,
        ultimo_envio_em = datetime('now'), proximo_email_em = CASE
          WHEN token_hash <> ? THEN proximo_email_em
          WHEN consentimento = 1 AND descadastrado = 0 AND comprou = 0 AND NOT ${COMPRA_REAL}
          THEN datetime(consentimento_em, ?) ELSE NULL END,
        comprou = CASE WHEN ${COMPRA_REAL} THEN 1 ELSE comprou END,
        comprou_em = CASE WHEN ${COMPRA_REAL} THEN COALESCE(comprou_em, datetime('now')) ELSE comprou_em END
        WHERE id = ?`)
        .bind(lead.token_hash, etapa, lead.token_hash, dias[etapa], lead.id).run()
      resultado.enviados++
    } catch (erro) {
      resultado.falhas++
      logger.error(`Falha no e-mail do lead ${lead.id}:`, erro?.message)
    }
  }
  return resultado
}
