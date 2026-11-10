import { adiar, cabe } from './orcamento.js'

// Etapa "instagram" do cron: gera rascunho das conversas que ficaram sem (webhook falhou, IA estava
// desligada, rascunho "falhou"). Roda por último e só com o que sobrou do orçamento de consultas.
// NUNCA envia mensagem no Instagram.

const POR_RODADA = 3

// `opcoes.rascunho` troca o módulo da IA (testes); em produção ele só é carregado com a IA ligada.
async function modulo(opcoes) {
  return opcoes.rascunho || import('../../lib/instagram-ia/rascunho.js')
}

export async function executarInstagram(env, opcoes = {}) {
  const resultado = { gerados: 0, adiados: 0 }
  // Sem a conta configurada (Etapa 0 do Paulo ainda não feita): etapa desligada, 0 consultas.
  if (!env.IG_ACCOUNT_ID || !env.DB) return resultado
  const logger = opcoes.logger || console
  // 1 consulta leve: IA desligada = não importa o módulo e não gasta mais nada.
  if (!cabe(env.DB, 1)) { adiar(env.DB, 'instagram', 1); resultado.adiados = 1; return resultado }
  const estado = await env.DB.prepare('SELECT ia_ligada FROM instagram_estado WHERE id = 1').first()
  if (!estado?.ia_ligada) return resultado
  const m = await modulo(opcoes)
  if (!cabe(env.DB, m.CUSTO_FILA + m.CUSTO_RASCUNHO)) {
    adiar(env.DB, 'instagram', 1)
    resultado.adiados = 1
    return resultado
  }
  const fila = await m.buscarFilaRascunhos(env.DB, POR_RODADA)
  for (const [i, igsid] of fila.entries()) {
    if (!cabe(env.DB, m.CUSTO_RASCUNHO)) {
      resultado.adiados = fila.length - i
      adiar(env.DB, 'instagram', resultado.adiados)
      break
    }
    try {
      await m.gerarRascunho(env, igsid, { fetchImpl: opcoes.fetchImpl, ai: opcoes.ai, logger, agora: opcoes.agora })
      resultado.gerados += 1
    } catch (erro) {
      logger.error(`Instagram rascunho …${String(igsid).slice(-4)} falhou:`, erro?.message || erro)
    }
  }
  return resultado
}
