import { isoUtc } from './clientes.js'

// Etapa 6: quanto do que a IA sugere o Paulo aproveita. Últimos 30 dias, por
// situação do roteiro, e os 10 últimos rascunhos editados (sugestão x enviado).
// 3 consultas num lote, todas com LIMIT.

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

const n = (v) => Number(v || 0)
const CAMPOS = ['gerados', 'enviados_sem_mudanca', 'editados', 'descartados', 'falhas_cota']

function somar(situacoes) {
  const total = Object.fromEntries(CAMPOS.map((c) => [c, 0]))
  for (const s of situacoes) for (const c of CAMPOS) total[c] += s[c]
  return total
}

export async function consultarQualidade(db) {
  const [porSituacao, modelos, editados] = await db.batch([
    db.prepare(`
      SELECT COALESCE(situacao, 'sem_situacao') AS situacao,
             COUNT(*) AS gerados,
             SUM(status = 'enviado') AS enviados_sem_mudanca,
             SUM(status = 'editado') AS editados,
             SUM(status = 'descartado') AS descartados,
             SUM(status = 'falhou' AND erro LIKE 'cota%') AS falhas_cota
        FROM instagram_rascunhos
       WHERE criado_em >= datetime('now', '-30 days')
       GROUP BY COALESCE(situacao, 'sem_situacao')
       ORDER BY gerados DESC
       LIMIT 30`),
    db.prepare(`
      SELECT COALESCE(provedor, '?') AS provedor, COALESCE(modelo, '?') AS modelo, COUNT(*) AS total
        FROM instagram_rascunhos
       WHERE criado_em >= datetime('now', '-30 days')
       GROUP BY provedor, modelo ORDER BY total DESC LIMIT 10`),
    db.prepare(`
      SELECT id, situacao, texto, texto_enviado, decidido_em
        FROM instagram_rascunhos
       WHERE status = 'editado'
       ORDER BY decidido_em DESC, id DESC LIMIT 10`),
  ])
  const situacoes = linhas(porSituacao).map((s) => ({
    situacao: s.situacao,
    ...Object.fromEntries(CAMPOS.map((c) => [c, n(s[c])])),
  }))
  return {
    dias: 30,
    situacoes,
    total: somar(situacoes),
    modelos: linhas(modelos).map((m) => ({ provedor: m.provedor, modelo: m.modelo, total: n(m.total) })),
    ultimos_editados: linhas(editados).map((e) => ({
      id: e.id,
      situacao: e.situacao || null,
      sugestao: e.texto || '',
      enviado: e.texto_enviado || '',
      em: isoUtc(e.decidido_em),
    })),
  }
}
