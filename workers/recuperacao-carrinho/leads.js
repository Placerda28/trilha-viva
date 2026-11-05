import { montarEmailLead } from '../../lib/emails-lead.js'
import { normalizarEmailLembrete } from '../../lib/lembrete-assinatura.js'
import { adiar, cabe } from './orcamento.js'

// Consultas ao D1 por lead: checagem de compra 1 + reserva 1 + conclusão 1.
const CUSTO_LEAD = 3

// 4 e-mails da VS (na hora, +3, +5 e +7 dias do consentimento) e 4 mensais (30 dias depois do envio anterior).
export const TOTAL_EMAILS = 8
// Depois do envio da etapa N: [base, modificador]. 'c' = consentimento (data fixa), 'n' = agora.
const PROXIMO = {
  1: ['c', '+3 days'], 2: ['c', '+5 days'], 3: ['c', '+7 days'],
  4: ['n', '+30 days'], 5: ['n', '+30 days'], 6: ['n', '+30 days'], 7: ['n', '+30 days'],
  8: [null, null],
}

export const COMPRA_REAL = `EXISTS (SELECT 1 FROM compras p JOIN clientes c ON c.id = p.cliente_id
  WHERE c.email = leads.email AND p.status = 'pago' AND p.teste = 0 LIMIT 1)`

export async function executarLeads(env, { fetchImpl = fetch, logger = console } = {}) {
  const db = env.DB
  if (!db || !env.RESEND_API_KEY || !env.EMAIL_FROM || !env.LEMBRETE_SEGREDO) {
    throw new Error('Envio de e-mail de lead não configurado.')
  }
  const resultado = { enviados: 0, compradores: 0, falhas: 0 }
  // Sem nem 1 consulta para ver a fila, não dá para saber quantos esperam: registra 1.
  if (!cabe(db, 1)) {
    adiar(db, 'leads', 1)
    return resultado
  }
  const { results: leads = [] } = await db.prepare(`SELECT id, nome, email, token_hash, etapa_email
    FROM leads WHERE proximo_email_em <= datetime('now')
      AND consentimento = 1 AND descadastrado = 0 AND comprou = 0 AND encerrado_em IS NULL
      AND etapa_email BETWEEN 0 AND ${TOTAL_EMAILS - 1}
    ORDER BY proximo_email_em, id LIMIT 20`).all()
  for (const [i, lead] of leads.entries()) {
    if (env.MODO !== 'ativo' && lead.email !== normalizarEmailLembrete(env.TESTE_PARA)) continue
    if (!cabe(db, CUSTO_LEAD)) {
      adiar(db, 'leads', leads.length - i)
      break
    }
    try {
      const compra = await db.prepare(`UPDATE leads SET comprou = 1,
        comprou_em = COALESCE(comprou_em, datetime('now')), proximo_email_em = NULL, proximo_whatsapp_em = NULL,
        encerrado_motivo = CASE WHEN encerrado_em IS NULL THEN 'comprou' ELSE encerrado_motivo END,
        encerrado_em = COALESCE(encerrado_em, datetime('now'))
        WHERE id = ? AND ${COMPRA_REAL}`).bind(lead.id).run()
      if (compra.meta.changes) {
        resultado.compradores++
        continue
      }
      // Reserva atômica e curta: concorrência não duplica, queda não prende a fila.
      const reserva = await db.prepare(`UPDATE leads SET proximo_email_em = datetime('now', '+10 minutes')
        WHERE id = ? AND token_hash = ? AND etapa_email = ?
          AND proximo_email_em <= datetime('now') AND consentimento = 1
          AND descadastrado = 0 AND comprou = 0 AND encerrado_em IS NULL AND NOT ${COMPRA_REAL}`)
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
      const [base, dias] = PROXIMO[etapa]
      // O token identifica o cadastro: não sobrescreve recadastro durante o envio.
      await db.prepare(`UPDATE leads SET
        etapa_email = CASE WHEN token_hash = ? THEN ? ELSE etapa_email END, envios = envios + 1,
        ultimo_envio_em = datetime('now'), proximo_email_em = CASE
          WHEN token_hash <> ? THEN proximo_email_em
          WHEN consentimento = 1 AND descadastrado = 0 AND comprou = 0 AND encerrado_em IS NULL AND NOT ${COMPRA_REAL}
          THEN datetime(CASE WHEN ? = 'c' THEN consentimento_em ELSE 'now' END, ?) ELSE NULL END,
        comprou = CASE WHEN ${COMPRA_REAL} THEN 1 ELSE comprou END,
        comprou_em = CASE WHEN ${COMPRA_REAL} THEN COALESCE(comprou_em, datetime('now')) ELSE comprou_em END
        WHERE id = ?`)
        .bind(lead.token_hash, etapa, lead.token_hash, base, dias, lead.id).run()
      resultado.enviados++
    } catch (erro) {
      resultado.falhas++
      logger.error(`Falha no e-mail do lead ${lead.id}:`, erro?.message)
    }
  }
  return resultado
}

// Fecha o processo (os dois canais) e guarda o motivo. 1 consulta por rodada:
//  comprou       compra real (confere também a compra que o webhook não marcou);
//  descadastrou  cancelou por e-mail ou pediu para sair no WhatsApp;
//  concluido     os 8 e-mails saíram e o WhatsApp terminou (4 mensagens, falha da pessoa ou resposta).
// "Parado" pela Gestão já sai marcado pela própria rota.
export async function encerrarLeads(db) {
  const r = await db.prepare(`UPDATE leads SET
      comprou = CASE WHEN ${COMPRA_REAL} THEN 1 ELSE comprou END,
      comprou_em = CASE WHEN ${COMPRA_REAL} THEN COALESCE(comprou_em, datetime('now')) ELSE comprou_em END,
      encerrado_motivo = CASE WHEN comprou = 1 OR ${COMPRA_REAL} THEN 'comprou'
        WHEN descadastrado = 1 THEN 'descadastrou' ELSE 'concluido' END,
      encerrado_em = datetime('now'), proximo_email_em = NULL, proximo_whatsapp_em = NULL
    WHERE encerrado_em IS NULL AND (comprou = 1 OR descadastrado = 1 OR ${COMPRA_REAL}
      OR (etapa_email >= ${TOTAL_EMAILS} AND (whatsapp_etapa >= 4 OR whatsapp_encerrado_em IS NOT NULL)))`).run()
  return Number(r?.meta?.changes || 0)
}
