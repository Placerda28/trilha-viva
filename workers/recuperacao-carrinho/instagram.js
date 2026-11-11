import { adiar, cabe } from './orcamento.js'

// Etapas "instagram" e "whatsapp-ia" do cron: geram rascunho das conversas que ficaram sem (webhook falhou,
// IA estava desligada, rascunho "falhou" ou o admin pediu outro). Rodam por último e só com o que sobrou do
// orçamento de consultas. NUNCA enviam mensagem.

const POR_RODADA = 3
const ESTADO = { instagram: 'instagram_estado', whatsapp: 'whatsapp_ia_estado' }

// `opcoes.rascunho` troca o módulo da IA (testes); em produção ele só é carregado com a IA ligada.
async function modulo(opcoes) {
  return opcoes.rascunho || import('../../lib/instagram-ia/rascunho.js')
}

async function executarRascunhos(env, opcoes, canal, etapa) {
  const resultado = { gerados: 0, adiados: 0 }
  const logger = opcoes.logger || console
  // 1 consulta leve: IA desligada = não importa o módulo e não gasta mais nada.
  if (!cabe(env.DB, 1)) { adiar(env.DB, etapa, 1); resultado.adiados = 1; return resultado }
  const estado = await env.DB.prepare(`SELECT ia_ligada FROM ${ESTADO[canal]} WHERE id = 1`).first()
  if (!estado?.ia_ligada) return resultado
  const m = await modulo(opcoes)
  if (!cabe(env.DB, m.CUSTO_FILA + m.CUSTO_RASCUNHO)) {
    adiar(env.DB, etapa, 1)
    resultado.adiados = 1
    return resultado
  }
  const fila = await m.buscarFilaRascunhos(env.DB, POR_RODADA, canal)
  for (const [i, conversa] of fila.entries()) {
    if (!cabe(env.DB, m.CUSTO_RASCUNHO)) {
      resultado.adiados = fila.length - i
      adiar(env.DB, etapa, resultado.adiados)
      break
    }
    try {
      await m.gerarRascunho(env, conversa, { canal, fetchImpl: opcoes.fetchImpl, ai: opcoes.ai, logger, agora: opcoes.agora })
      resultado.gerados += 1
    } catch (erro) {
      logger.error(`${etapa} rascunho …${String(conversa).slice(-4)} falhou:`, erro?.message || erro)
    }
  }
  return resultado
}

export async function executarInstagram(env, opcoes = {}) {
  // Sem a conta configurada (Etapa 0 do Paulo ainda não feita): etapa desligada, 0 consultas.
  if (!env.IG_ACCOUNT_ID || !env.DB) return { gerados: 0, adiados: 0 }
  return executarRascunhos(env, opcoes, 'instagram', 'instagram')
}

export async function executarWhatsappIa(env, opcoes = {}) {
  if (!env.WA_PHONE_NUMBER_ID || !env.DB) return { gerados: 0, adiados: 0 }
  return executarRascunhos(env, opcoes, 'whatsapp', 'whatsapp-ia')
}
