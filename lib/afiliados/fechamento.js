// Fechamento mensal. Idempotente: índice único (afiliado, mês) no fechamento e
// índice único parcial (afiliado, mês) no bônus. Rodar 2 vezes não duplica nada.
import { calcularNivel, niveisDoMes, nivelFixoDe } from './niveis.js'
import { contarVendasDoMes } from './status.js'
import { textoUtc } from './datas.js'

async function contarReembolsadas(db, afiliadoId, mes) {
  const r = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM afiliados_lancamentos l
        WHERE l.afiliado_id = ? AND l.mes_referencia = ? AND l.tipo = 'venda'
          AND (l.status = 'cancelada'
               OR EXISTS (SELECT 1 FROM afiliados_lancamentos e WHERE e.compra_id = l.compra_id AND e.tipo = 'estorno'))`,
    )
    .bind(afiliadoId, mes)
    .first()
  return Number(r?.n || 0)
}

async function fecharAfiliado(db, afiliadoId, mes, niveis, agora) {
  const [vendas, reembolsadas, fixo] = await Promise.all([
    contarVendasDoMes(db, afiliadoId, mes),
    contarReembolsadas(db, afiliadoId, mes),
    nivelFixoDe(db, afiliadoId),
  ])
  const c = calcularNivel(vendas, niveis, fixo)
  const quando = textoUtc(agora)
  const snapshot = JSON.stringify({ niveis, nivel: c.nivel })
  const comandos = [
    db
      .prepare(
        `INSERT OR IGNORE INTO afiliados_fechamentos
           (afiliado_id, mes_referencia, vendas_validas, vendas_reembolsadas, nivel_id, niveis_snapshot,
            base_centavos, bonus_centavos, total_centavos, fechado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(afiliadoId, mes, vendas, reembolsadas, c.nivel?.id ?? null, snapshot, c.base, c.bonus, c.total, quando),
  ]
  if (c.bonus > 0) {
    const [ano, m] = mes.split('-')
    comandos.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO afiliados_lancamentos
             (afiliado_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, descricao, criado_em)
           VALUES (?, 'bonus_nivel', ?, ?, 'pendente', ?, ?, ?)`,
        )
        .bind(afiliadoId, mes, c.bonus, quando, `Bônus de nível de ${m}/${ano} (${c.nivel.nome})`, quando),
    )
  }
  await db.batch(comandos)
  return { afiliadoId, vendas, reembolsadas, nivel: c.nivel?.nome || null, bonus: c.bonus, total: c.total }
}

// Fecha o mês para todo afiliado com venda nele. Quem já foi fechado fica de fora.
export async function fecharMes(db, mes, agora = new Date()) {
  const niveis = await niveisDoMes(db, mes)
  if (niveis.length === 0) return { mes, fechados: [], ja_fechados: 0 }
  const { results } = await db
    .prepare(
      `SELECT DISTINCT l.afiliado_id AS id FROM afiliados_lancamentos l
        WHERE l.mes_referencia = ? AND l.tipo = 'venda'
          AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos f WHERE f.afiliado_id = l.afiliado_id AND f.mes_referencia = l.mes_referencia)
        ORDER BY l.afiliado_id LIMIT 5000`,
    )
    .bind(mes)
    .all()
  const fechados = []
  for (const { id } of results) fechados.push(await fecharAfiliado(db, id, mes, niveis, agora))
  return { mes, fechados }
}
