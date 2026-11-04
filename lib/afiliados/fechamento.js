// Fechamento mensal. Idempotente: índice único (afiliado, mês) no fechamento e
// índice único parcial (afiliado, mês) no bônus. Rodar 2 vezes não duplica nada.
import { calcularNivel, configuracao, niveisDoMes, nivelFixoDe } from './niveis.js'
import { contarVendasDoMes } from './status.js'
import { mesParaFechar, mesSeguinte, textoUtc } from './datas.js'

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
  // O bônus nasce da linha de fechamento GRAVADA (a de uma rodada concorrente, se ela chegou antes),
  // nunca do cálculo local. Com bonus_centavos = 0 nada é inserido.
  comandos.push(
    db
      .prepare(
        `INSERT OR IGNORE INTO afiliados_lancamentos
           (afiliado_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, descricao, criado_em)
         SELECT f.afiliado_id, 'bonus_nivel', f.mes_referencia, f.bonus_centavos, 'pendente', ?3,
                'Bônus de nível de ' || substr(f.mes_referencia, 6, 2) || '/' || substr(f.mes_referencia, 1, 4)
                  || ' (' || COALESCE(json_extract(f.niveis_snapshot, '$.nivel.nome'), '-') || ')', ?3
           FROM afiliados_fechamentos f
          WHERE f.afiliado_id = ?1 AND f.mes_referencia = ?2 AND f.bonus_centavos > 0`,
      )
      .bind(afiliadoId, mes, quando),
  )
  await db.batch(comandos)
  return { afiliadoId, vendas, reembolsadas, nivel: c.nivel?.nome || null, bonus: c.bonus, total: c.total }
}

// Fecha o mês para todo afiliado com venda nele. Quem já foi fechado fica de fora.
export async function fecharMes(db, mes, agora = new Date()) {
  const cfg = await configuracao(db)
  if (mes > mesParaFechar(agora, cfg.dia_fechamento)) {
    const [ano, m] = mesSeguinte(mes).split('-')
    return {
      mes,
      fechados: [],
      erro: `O fechamento de ${mes.slice(5)}/${mes.slice(0, 4)} só pode ser feito a partir de ${String(cfg.dia_fechamento).padStart(2, '0')}/${m}/${ano}.`,
    }
  }
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
