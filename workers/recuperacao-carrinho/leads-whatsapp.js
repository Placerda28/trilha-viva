import { chamarMeta, configuracaoMeta, pedidoModelo, telefoneSemPais } from '../../lib/whatsapp-meta.js'
import { MODELOS_LEAD, deSql, dentroDoHorario, paraSql } from '../../lib/whatsapp-sequencia.js'
import { avisarAcessoRecusado, erroDeAcesso, lerEstado, modelosDaSequencia, tetoDoDia } from './whatsapp-estado.js'
import { linhas, mascararTelefone, mudancas } from './whatsapp-banco.js'
import { COMPRA_REAL } from './leads.js'
import { adiar, cabe } from './orcamento.js'

// WhatsApp da VS grátis (05/11/2026): 4 mensagens por modelo da Meta, contadas do consentimento
// (+5 min, +3, +5 e +7 dias). Fila separada da do carrinho; o orçamento de consultas da rodada, o
// WA_MODO, o botão LIGAR/PAUSAR (whatsapp_estado) e o freio dos 3 primeiros dias são os mesmos.
// Só envia com o modelo APROVADO na Meta e só das 9h às 19h59 de Brasília.
// O consentimento do formulário precisa cobrir oferta por WhatsApp (pendência do Paulo).

export const TOTAL_WHATSAPP_LEADS = 4
const HORA = 3600000
const DIA = 24 * HORA
// Depois da mensagem N, a N+1 sai em inicio + DEPOIS[N]. A 1ª sai em consentimento + 5 min.
const DEPOIS = { 1: 3 * DIA, 2: 5 * DIA, 3: 7 * DIA }
// Quem se cadastrou há mais de 1 dia e só agora recebe a 1ª (leads antigos, WhatsApp desligado) conta
// as próximas a partir desse primeiro envio, não do consentimento antigo.
const ATRASO_MAXIMO_MS = DIA

// Consultas ao D1: fixas (estado, contagem do dia, fila) e por mensagem (reserva, marca no lead, id da Meta).
const FIXO = 3
const CUSTO_MODELOS = 3 // conferência dos modelos na Meta (no máx. a cada 30 min): trava + 1 gravação + leitura
const CUSTO_MENSAGEM = 4 // 3 + 1 de folga para uma falha

// Erros da Meta sobre o número da pessoa (sem WhatsApp, não aceita marketing...): o canal para.
const ERROS_DA_PESSOA = new Set([131026, 131049, 131050, 131021])

// Botão "Visitar site" dos 4 modelos: URL dinâmica https://trilhaviva.org/{{1}}. O sufixo leva só o destino e a
// origem (nunca e-mail, nome ou telefone): msg 1 abre o acervo (/musicas), msgs 2 a 4 abrem a compra (/assinar).
export function sufixoDoBotaoLead(etapa) {
  const destino = etapa === 1 ? 'musicas' : 'assinar'
  return `${destino}?utm_source=whatsapp&utm_medium=lead&utm_campaign=${MODELOS_LEAD[etapa - 1]}`
}

function limite(valor, padrao) {
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : padrao
}

async function contarHoje(db, agoraSql) {
  const linha = await db.prepare(`SELECT COUNT(*) AS total FROM leads_whatsapp
    WHERE enviado_em >= datetime(?, 'start of day') LIMIT 1`).bind(agoraSql).first()
  return Number(linha?.total || 0)
}

export async function buscarFilaLeads(db, soTelefone, agoraSql) {
  const resultado = await db.prepare(`SELECT id, nome, whatsapp, consentimento_em, whatsapp_etapa, whatsapp_inicio_em, vez_em
    FROM (
      SELECT id, nome, whatsapp, consentimento_em, whatsapp_etapa, whatsapp_inicio_em,
        COALESCE(proximo_whatsapp_em, CASE WHEN whatsapp_etapa = 0 THEN datetime(consentimento_em, '+5 minutes') END) AS vez_em
      FROM leads
      WHERE consentimento = 1 AND descadastrado = 0 AND comprou = 0 AND encerrado_em IS NULL
        AND whatsapp_encerrado_em IS NULL AND whatsapp_etapa BETWEEN 0 AND ${TOTAL_WHATSAPP_LEADS - 1}
        AND whatsapp <> '' AND NOT ${COMPRA_REAL}
        AND (? IS NULL OR whatsapp = ?)
    ) WHERE vez_em <= ? ORDER BY vez_em, id LIMIT 20`).bind(soTelefone, soTelefone, agoraSql).all()
  return linhas(resultado)
}

// Reserva atômica da mensagem `etapa`: a linha em leads_whatsapp é a vaga (chave lead + etapa), e o teto do
// dia e o estado do lead ficam no próprio INSERT. Rodadas simultâneas não mandam duas vezes.
// A vaga e o avanço do lead saem no MESMO db.batch (uma transação): nunca sobra reserva sem avanço.
// A compra real é conferida de novo aqui dentro, pois pode ter entrado depois da leitura da fila.
// Depois que a Meta aceita, a reserva NUNCA é apagada (só quando ela recusa antes de aceitar).
async function reservar(db, lead, etapa, modelo, tetoDia, agoraSql, inicioSql, proximaSql) {
  const insere = db.prepare(`INSERT OR IGNORE INTO leads_whatsapp (lead_id, etapa, enviado_em, modelo)
    SELECT l.id, ?, ?, ? FROM leads l
     WHERE l.id = ? AND l.consentimento = 1 AND l.descadastrado = 0 AND l.comprou = 0
       AND l.encerrado_em IS NULL AND l.whatsapp_encerrado_em IS NULL AND l.whatsapp_etapa = ?
       AND NOT ${COMPRA_REAL.replaceAll('leads.email', 'l.email')}
       AND (SELECT COUNT(*) FROM leads_whatsapp WHERE enviado_em >= datetime(?, 'start of day')) < ?`)
    .bind(etapa, agoraSql, modelo, lead.id, etapa - 1, agoraSql, tetoDia)
  // Só avança se a vaga acabou de ser criada por esta rodada (sem id da Meta nem status).
  const avanca = db.prepare(`UPDATE leads SET whatsapp_etapa = ?, whatsapp_enviado_em = ?,
      whatsapp_inicio_em = COALESCE(whatsapp_inicio_em, ?), proximo_whatsapp_em = ?
    WHERE id = ? AND whatsapp_etapa = ? AND encerrado_em IS NULL AND whatsapp_encerrado_em IS NULL
      AND NOT ${COMPRA_REAL}
      AND EXISTS (SELECT 1 FROM leads_whatsapp w WHERE w.lead_id = leads.id AND w.etapa = ?
        AND w.enviado_em = ? AND w.wa_msg_id IS NULL AND w.wa_status IS NULL)`)
    .bind(etapa, agoraSql, inicioSql, proximaSql, lead.id, etapa - 1, etapa, agoraSql)
  const [a, b] = await db.batch([insere, avanca])
  if (mudancas(a) === 1 && mudancas(b) === 1) return true
  // Outra rodada, compra ou teto mudaram o quadro: nada foi enviado, então a vaga pode sair.
  if (mudancas(a) === 1) await desfazer(db, lead.id, etapa)
  return false
}

const desfazer = (db, id, etapa) => db.prepare('DELETE FROM leads_whatsapp WHERE lead_id = ? AND etapa = ?').bind(id, etapa).run()

// Erro da conta (token, cartão, modelo): desfaz a vaga e o lead volta para a fila, na mesma etapa.
async function devolver(db, lead, etapa, novaVez) {
  await desfazer(db, lead.id, etapa)
  await db.prepare(`UPDATE leads SET whatsapp_etapa = ?, proximo_whatsapp_em = ?
    WHERE id = ? AND whatsapp_etapa = ?`).bind(etapa - 1, novaVez, lead.id, etapa).run()
}

export async function executarLeadsWhatsapp(env, opcoes = {}) {
  const resultado = { enviados: 0, ignorados: 0, falhas: 0 }
  const modo = String(env.WA_MODO || 'teste').toLowerCase()
  if (modo !== 'teste' && modo !== 'ativo') return resultado
  if (!configuracaoMeta(env).ok) return resultado
  const db = env.DB
  if (!db) throw new Error('Binding DB não configurado.')
  const logger = opcoes.logger || console
  const agora = new Date(opcoes.agora || new Date())
  if (!dentroDoHorario(agora)) return resultado
  if (!cabe(db, FIXO)) {
    adiar(db, 'leads_whatsapp', 1)
    return resultado
  }
  const fetchImpl = opcoes.fetchImpl || globalThis.fetch
  const agoraSql = paraSql(agora)

  // Até o Paulo ligar o WhatsApp (botão da Gestão), ninguém recebe.
  const estado = await lerEstado(db)
  if (estado.estado !== 'ativo') return resultado
  const tetoDia = tetoDoDia(estado, limite(env.WA_LEADS_TETO_DIA, 10))
  let enviadosHoje = await contarHoje(db, agoraSql)
  if (enviadosHoje >= tetoDia) return resultado

  const soTelefone = modo === 'teste' ? telefoneSemPais(env.WA_TESTE_PARA) || '-' : null
  const fila = await buscarFilaLeads(db, soTelefone, agoraSql)
  if (!fila.length) return resultado
  if (!cabe(db, CUSTO_MODELOS)) {
    adiar(db, 'leads_whatsapp', fila.length)
    return resultado
  }
  const modelos = await modelosDaSequencia(db, env, fetchImpl, logger)
  const semAprovacao = new Set()

  for (const [i, lead] of fila.entries()) {
    if (enviadosHoje >= tetoDia) break
    const etapa = Number(lead.whatsapp_etapa) + 1
    const modelo = MODELOS_LEAD[etapa - 1]
    if (modelos.get(modelo)?.status !== 'APPROVED') {
      // Modelo ainda não aprovado na Meta: ninguém recebe, nada é gasto, a vez continua valendo.
      if (!semAprovacao.has(modelo)) logger.log(`whatsapp de lead: modelo ${modelo} sem aprovação na Meta; não envia`)
      semAprovacao.add(modelo)
      resultado.ignorados += 1
      continue
    }
    if (!cabe(db, CUSTO_MENSAGEM)) {
      adiar(db, 'leads_whatsapp', fila.length - i)
      break
    }

    const consentimento = deSql(lead.consentimento_em) || agora
    const inicio = etapa === 1
      ? (agora.getTime() - consentimento.getTime() > ATRASO_MAXIMO_MS ? agora : consentimento)
      : deSql(lead.whatsapp_inicio_em) || agora
    // A próxima (se houver) sai na data fixa a partir do início, nunca no mesmo dia da que está saindo.
    const proxima = etapa < TOTAL_WHATSAPP_LEADS
      ? paraSql(new Date(Math.max(inicio.getTime() + DEPOIS[etapa], agora.getTime() + DIA)))
      : null
    if (!(await reservar(db, lead, etapa, modelo, tetoDia, agoraSql, paraSql(inicio), proxima))) {
      enviadosHoje = await contarHoje(db, agoraSql)
      continue
    }

    try {
      const id = await chamarMeta(env, pedidoModelo({
        telefone: lead.whatsapp,
        nome: lead.nome,
        sufixo: sufixoDoBotaoLead(etapa),
        modelo,
        botaoUrl: modelos.get(modelo)?.botaoUrl,
      }, env), fetchImpl)
      // A Meta já aceitou: gravar o id é melhor esforço. Se falhar, só log; a mensagem NÃO sai de novo.
      try {
        await db.prepare(`UPDATE leads_whatsapp SET wa_msg_id = ?, wa_status = 'sent', wa_status_em = ?
          WHERE lead_id = ? AND etapa = ?`).bind(id, agoraSql, lead.id, etapa).run()
      } catch (erroBanco) {
        logger.error(`WhatsApp ${etapa}/4 do lead ${lead.id} enviado (${id}), mas o id não foi gravado:`, erroBanco?.message || erroBanco)
      }
      enviadosHoje += 1
      resultado.enviados += 1
    } catch (erro) {
      const codigo = Number(erro?.codigo)
      // Sem código da Meta (tempo esgotado, rede): ela pode ter aceitado. Mantém a vaga e o avanço, sem reenviar.
      if (!Number.isFinite(codigo)) {
        logger.error(`WhatsApp ${etapa}/4 do lead ${lead.id}: resposta incerta, não reenvia:`, erro?.message || erro)
        enviadosHoje += 1
        resultado.falhas += 1
        continue
      }
      logger.error(`WhatsApp ${etapa}/4 de lead não enviado para ${mascararTelefone(lead.whatsapp)} (lead ${lead.id}):`,
        erro?.message || erro)
      try {
        if (ERROS_DA_PESSOA.has(codigo)) {
          // O número não recebe: guarda o motivo e o canal para (o e-mail segue).
          await db.prepare(`UPDATE leads_whatsapp SET wa_status = 'failed', wa_status_em = ?, wa_erro = ?
            WHERE lead_id = ? AND etapa = ?`).bind(agoraSql, String(erro?.codigo), lead.id, etapa).run()
          await db.prepare(`UPDATE leads SET whatsapp_encerrado_em = ?, whatsapp_motivo = 'falhou',
            proximo_whatsapp_em = NULL WHERE id = ? AND whatsapp_encerrado_em IS NULL`).bind(agoraSql, lead.id).run()
          enviadosHoje += 1
          resultado.falhas += 1
          continue
        }
        // Erro da conta: as outras também falhariam. Devolve o lead e para a rodada.
        const acesso = erroDeAcesso(erro?.codigo)
        await devolver(db, lead, etapa, acesso ? lead.vez_em : paraSql(new Date(agora.getTime() + DIA)))
        if (acesso) await avisarAcessoRecusado(db, env, erro.codigo, agora, fetchImpl, logger)
      } catch (erroBanco) {
        logger.error(`Falha ao registrar o erro do WhatsApp do lead ${lead.id}:`, erroBanco)
      }
      resultado.falhas += 1
      break
    }
  }
  return resultado
}
