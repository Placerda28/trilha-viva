// Fechamento mensal. Idempotente: índice único (afiliado, mês) no fechamento e
// índice único parcial (afiliado, mês) no bônus. Rodar 2 vezes não duplica nada.
import { calcularNivel, configuracao, niveisDoMes, nivelFixoDe } from './niveis.js'
import { SQL_VENDA_VALIDA } from './status.js'
import { mesParaFechar, mesSeguinte, textoUtc } from './datas.js'

const TENTATIVAS = 3
const CONTAGEM = `COUNT(*) AS total, COALESCE(SUM(CASE WHEN ${SQL_VENDA_VALIDA} THEN 1 ELSE 0 END), 0) AS validas`

async function contar(db, afiliadoId, mes) {
  const r = await db
    .prepare(`SELECT ${CONTAGEM} FROM afiliados_lancamentos l WHERE l.afiliado_id = ? AND l.mes_referencia = ? AND l.tipo = 'venda'`)
    .bind(afiliadoId, mes)
    .first()
  return { total: Number(r.total), validas: Number(r.validas) }
}

// As contagens são lidas antes do lote, então o INSERT do fechamento só grava se as vendas do mês
// (válidas e total) continuam iguais DENTRO do lote. Senão recalcula e tenta de novo (até 3 vezes).
async function fecharAfiliado(db, afiliadoId, mes, niveis, agora) {
  const fixo = await nivelFixoDe(db, afiliadoId)
  const quando = textoUtc(agora)
  for (let i = 0; i < TENTATIVAS; i++) {
    const { total, validas } = await contar(db, afiliadoId, mes)
    const c = calcularNivel(validas, niveis, fixo)
    const snapshot = JSON.stringify({ niveis, nivel: c.nivel })
    const [gravou] = await db.batch([
      db
        .prepare(
          `INSERT OR IGNORE INTO afiliados_fechamentos
             (afiliado_id, mes_referencia, vendas_validas, vendas_reembolsadas, nivel_id, niveis_snapshot,
              base_centavos, bonus_centavos, total_centavos, fechado_em)
           SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10
            WHERE (SELECT COUNT(*) FROM afiliados_lancamentos l
                    WHERE l.afiliado_id = ?1 AND l.mes_referencia = ?2 AND ${SQL_VENDA_VALIDA}) = ?3
              AND (SELECT COUNT(*) FROM afiliados_lancamentos l
                    WHERE l.afiliado_id = ?1 AND l.mes_referencia = ?2 AND l.tipo = 'venda') = ?11
           RETURNING id`,
        )
        .bind(afiliadoId, mes, validas, total - validas, c.nivel?.id ?? null, snapshot, c.base, c.bonus, c.total, quando, total),
      // O bônus nasce da linha de fechamento GRAVADA, nunca do cálculo local. Com bonus_centavos = 0, nada.
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
    ])
    if (gravou.results.length > 0) {
      return { afiliadoId, vendas: validas, reembolsadas: total - validas, nivel: c.nivel?.nome || null, bonus: c.bonus, total: c.total }
    }
    const existe = await db
      .prepare('SELECT 1 AS ok FROM afiliados_fechamentos WHERE afiliado_id = ? AND mes_referencia = ?')
      .bind(afiliadoId, mes)
      .first()
    if (existe) return { afiliadoId, ja_fechado: true }
  }
  return { afiliadoId, pendente: true, motivo: 'As vendas do mês mudaram durante o fechamento. Repita o fechamento.' }
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
  const pendentes = []
  let jaFechados = 0
  for (const { id } of results) {
    const r = await fecharAfiliado(db, id, mes, niveis, agora)
    if (r.pendente) pendentes.push({ afiliadoId: id, motivo: r.motivo })
    else if (r.ja_fechado) jaFechados += 1
    else fechados.push(r)
  }
  return { mes, fechados, pendentes, ja_fechados: jaFechados }
}
