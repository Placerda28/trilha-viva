// Uma consulta por cliente. O índice por cliente e data limita a leitura.
export async function downloadsDoCliente(db, clienteId) {
  const { results } = await db.prepare(`
    SELECT slug, COUNT(*) AS vezes, MAX(criado_em) AS ultimo
    FROM downloads INDEXED BY idx_downloads_cliente
    WHERE cliente_id = ? AND slug IS NOT NULL
    GROUP BY slug
    ORDER BY ultimo DESC
    LIMIT 2000
  `).bind(clienteId).all()
  return results
}
