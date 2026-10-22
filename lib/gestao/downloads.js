import { inicioDoDiaBrasilia, montarSerie } from './datas.js'

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

// Painel do acervo: o que mais sai e quem usa a cota. Sem IP em lugar nenhum.
// `limiteDia` é POR_DIA de lib/cota.js (a rota passa o valor). "Hoje" é o dia de
// Brasília. Nota: não existe índice em downloads(criado_em); as consultas por
// período varrem a tabela (hoje poucas centenas de linhas).
export async function consultarDownloads(db, periodo, { agrupar = 'dia', limiteDia = 30, agora = new Date() } = {}) {
  const { inicioUtc, fimUtc } = periodo
  const hoje = inicioDoDiaBrasilia(agora)
  const noPeriodo = 'criado_em >= ? AND criado_em < ?'
  const [totais, naCota, porDia, musicas, clientes] = await db.batch([
    db.prepare(`
      SELECT COUNT(*) AS downloads, COUNT(DISTINCT cliente_id) AS clientes
        FROM downloads WHERE ${noPeriodo} LIMIT 1`).bind(inicioUtc, fimUtc),
    db.prepare(`
      SELECT COUNT(*) AS n FROM (
        SELECT cliente_id FROM downloads WHERE criado_em >= ?
         GROUP BY cliente_id HAVING COUNT(*) >= ?
      )`).bind(hoje, limiteDia),
    db.prepare(`
      SELECT date(criado_em, '-3 hours') AS chave, COUNT(*) AS compras, 0 AS centavos
        FROM downloads WHERE ${noPeriodo}
       GROUP BY date(criado_em, '-3 hours') ORDER BY chave LIMIT 732`).bind(inicioUtc, fimUtc),
    db.prepare(`
      SELECT slug, COUNT(*) AS downloads, COUNT(DISTINCT cliente_id) AS clientes
        FROM downloads WHERE ${noPeriodo} AND COALESCE(slug, '') <> ''
       GROUP BY slug ORDER BY downloads DESC, slug LIMIT 50`).bind(inicioUtc, fimUtc),
    db.prepare(`
      SELECT d.cliente_id AS id, c.nome, c.email, COUNT(*) AS downloads,
             (SELECT COUNT(*) FROM downloads t WHERE t.cliente_id = d.cliente_id AND t.criado_em >= ?) AS hoje
        FROM downloads d JOIN clientes c ON c.id = d.cliente_id
       WHERE d.criado_em >= ? AND d.criado_em < ?
       GROUP BY d.cliente_id ORDER BY downloads DESC, d.cliente_id LIMIT 20`).bind(hoje, inicioUtc, fimUtc),
  ])

  const t = linhas(totais)[0]
  const baixados = Number(t?.downloads || 0)
  const pessoas = Number(t?.clientes || 0)
  return {
    totais: {
      downloads: baixados,
      clientes: pessoas,
      media: pessoas ? Math.round((baixados / pessoas) * 100) / 100 : 0,
      na_cota_hoje: Number(linhas(naCota)[0]?.n || 0),
      limite_dia: limiteDia,
    },
    serie: montarSerie({ de: periodo.de, ate: periodo.ate, agrupar, linhas: linhas(porDia) })
      .map((p) => ({ chave: p.chave, rotulo: p.rotulo, downloads: p.compras })),
    top_musicas: linhas(musicas).map((m) => ({
      slug: m.slug,
      downloads: Number(m.downloads),
      clientes: Number(m.clientes),
    })),
    top_clientes: linhas(clientes).map((c) => ({
      id: Number(c.id),
      nome: c.nome || null,
      email: c.email,
      downloads: Number(c.downloads),
      hoje: Number(c.hoje || 0),
    })),
  }
}
