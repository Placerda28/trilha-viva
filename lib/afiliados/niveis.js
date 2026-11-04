// Regra de nível (pura) e leitura da tabela de níveis vigente em um mês.
// Nível retroativo no mês: TODAS as vendas valem o valor do nível atingido.

// Ordena por vendas_minimas. O menor nível define o valor base.
function ordenar(niveis) {
  return [...niveis].sort((a, b) => a.vendas_minimas - b.vendas_minimas)
}

// vendas: nº de vendas válidas no mês. niveis: conjunto vigente. fixo: nível travado (ou null).
export function calcularNivel(vendas, niveis, fixo = null) {
  const lista = ordenar(niveis)
  const n = Math.max(0, Math.floor(Number(vendas) || 0))
  const zero = { nivel: null, proximo: lista[0] || null, faltam: lista[0] ? lista[0].vendas_minimas : 0, base: 0, total: 0, bonus: 0 }
  if (n === 0 || lista.length === 0) return zero

  let nivel = null
  for (const item of lista) if (n >= item.vendas_minimas) nivel = item
  if (fixo) nivel = fixo
  const proximo = fixo ? null : lista.find((x) => x.vendas_minimas > n) || null
  const base = n * lista[0].valor_por_venda_centavos
  const total = n * nivel.valor_por_venda_centavos
  return {
    nivel,
    proximo,
    faltam: proximo ? proximo.vendas_minimas - n : 0,
    base,
    total,
    bonus: total - base,
  }
}

// Conjunto de níveis em vigor no mês: o de maior valido_desde_mes <= mês.
export async function niveisDoMes(db, mes) {
  const { results } = await db
    .prepare(
      `SELECT id, nome, vendas_minimas, valor_por_venda_centavos, cor, ordem, valido_desde_mes
         FROM afiliados_niveis
        WHERE valido_desde_mes = (SELECT MAX(valido_desde_mes) FROM afiliados_niveis WHERE valido_desde_mes <= ?)
        ORDER BY vendas_minimas LIMIT 50`,
    )
    .bind(mes)
    .all()
  return results
}

export async function configuracao(db) {
  return db.prepare('SELECT * FROM afiliados_config WHERE id = 1').first()
}

// Nível fixo do afiliado (ou null). Lê só a linha do próprio afiliado.
export async function nivelFixoDe(db, afiliadoId) {
  return db
    .prepare(
      `SELECT n.id, n.nome, n.vendas_minimas, n.valor_por_venda_centavos, n.cor, n.ordem, n.valido_desde_mes
         FROM afiliados a JOIN afiliados_niveis n ON n.id = a.nivel_fixo_id WHERE a.id = ?`,
    )
    .bind(afiliadoId)
    .first()
}
