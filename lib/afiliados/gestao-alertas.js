// Alertas de afiliados da Gestão (Fase 8A). Calculados na hora, com consultas leves e LIMIT;
// só a chave dos resolvidos fica no banco (afiliados_alertas_resolvidos, migração 0021).
// Sem `@/`. Chave estável: o que se repete todo mês leva o mês na chave ("resolvido" vale só para aquele mês).
import { calcularNivel } from './niveis.js'
import { dataDeTexto, diaDe, mesAnterior, mesDe, mesSeguinte, somarDias, textoUtc } from './datas.js'
import { SQL_VENDA_VALIDA } from './status.js'
import { niveisVigentes } from './gestao-painel-niveis.js'
import { diaMes, linhas, num, reais } from './gestao-periodo.js'

export const CHAVE_VALIDA = /^[a-z_]+(:[A-Za-z0-9_-]+){1,3}$/
const ORDEM = { alta: 0, media: 1, baixa: 2 }
const RESOLVIDA = (chave) => `EXISTS (SELECT 1 FROM afiliados_alertas_resolvidos r WHERE r.chave = ${chave})`

// Meses com venda de afiliado já liberados para fechar (1 dia de folga depois do dia de fechamento) e sem fechamento.
// ?1 = agora (UTC). Também usado para o contador do menu.
const PENDENTES_SQL = `
  SELECT l.mes_referencia AS mes, COUNT(DISTINCT l.afiliado_id) AS n
    FROM afiliados_lancamentos l
   WHERE l.tipo = 'venda'
     AND l.mes_referencia <= strftime('%Y-%m', date(datetime(?1, '-3 hours'), 'start of month',
           CASE WHEN CAST(strftime('%d', datetime(?1, '-3 hours')) AS INTEGER) > (SELECT dia_fechamento FROM afiliados_config WHERE id = 1)
                THEN '-1 month' ELSE '-2 months' END))
     AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos f WHERE f.afiliado_id = l.afiliado_id AND f.mes_referencia = l.mes_referencia)
     AND NOT ${RESOLVIDA("'fechamento_pendente:' || l.mes_referencia")}
   GROUP BY l.mes_referencia LIMIT 12`

// Contador do menu: só os 3 alertas mais baratos, numa consulta (1 statement). ?1 agora, ?2 há 3 dias, ?3 há 30 dias.
export function prepararContagemAlertas(db, agora) {
  return db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM afiliados_saques s WHERE s.status = 'solicitado' AND s.pedido_em <= ?2
            AND NOT ${RESOLVIDA("'saque_atrasado:' || s.id")}) AS saques,
         (SELECT COUNT(*) FROM (SELECT DISTINCT e.afiliado_id AS aid, substr(datetime(e.criado_em, '-3 hours'), 1, 7) AS mes
                                  FROM afiliados_eventos e WHERE e.evento = 'codigo_recusado_proprio' AND e.criado_em >= ?3) x
           WHERE NOT ${RESOLVIDA("'codigo_proprio:' || x.aid || ':' || x.mes")}) AS proprio,
         (SELECT COUNT(*) FROM (${PENDENTES_SQL})) AS fechamento`,
    )
    .bind(textoUtc(agora), textoUtc(somarDias(agora, -3)), textoUtc(somarDias(agora, -30)))
}

export const contagemDeAlertas = (resultado) => {
  const r = linhas(resultado)[0] || {}
  return num(r.saques) + num(r.proprio) + num(r.fechamento)
}

const linkAfiliado = (id) => `/gestao/afiliados/lista?afiliado=${id}`
const plural = (n, um, varios) => (n === 1 ? `1 ${um}` : `${n} ${varios}`)
const limiteFimDeMes = (mes) => textoUtc(somarDias(dataDeTexto(`${mesSeguinte(mes)}-01 03:00:00`), -2))

const alerta = (chave, tipo, gravidade, texto, link, afiliadoId = null) => ({ chave, tipo, gravidade, texto, link, afiliado_id: afiliadoId })

export async function calcularAlertas(db, agora = new Date()) {
  const t = textoUtc(agora)
  const ha3 = textoUtc(somarDias(agora, -3))
  const ha30 = textoUtc(somarDias(agora, -30))
  const ha90 = textoUtc(somarDias(agora, -90))
  const mes = mesDe(agora)
  const mesPrev = mesAnterior(mes)
  const [saques, taxa, proprio, pico, duplicados, fimMes, cliques, ativos, pendentes, niveis] = await db.batch([
    db.prepare(`SELECT s.id, s.valor_centavos, s.pedido_em, a.id AS aid, a.nome FROM afiliados_saques s JOIN afiliados a ON a.id = s.afiliado_id
                 WHERE s.status = 'solicitado' AND s.pedido_em <= ?1 ORDER BY s.pedido_em, s.id LIMIT 50`).bind(ha3),
    db.prepare(`SELECT l.afiliado_id AS aid, a.nome, COUNT(*) AS vendas,
                       SUM(CASE WHEN l.status = 'cancelada' OR EXISTS (SELECT 1 FROM afiliados_lancamentos e WHERE e.compra_id = l.compra_id AND e.tipo = 'estorno') THEN 1 ELSE 0 END) AS estornadas
                  FROM afiliados_lancamentos l JOIN afiliados a ON a.id = l.afiliado_id
                 WHERE l.tipo = 'venda' AND l.criado_em >= ?1 GROUP BY l.afiliado_id
                HAVING COUNT(*) >= 5 AND estornadas * 5 > COUNT(*) LIMIT 50`).bind(ha90),
    db.prepare(`SELECT e.afiliado_id AS aid, a.nome, substr(datetime(e.criado_em, '-3 hours'), 1, 7) AS mes, COUNT(*) AS n
                  FROM afiliados_eventos e JOIN afiliados a ON a.id = e.afiliado_id
                 WHERE e.evento = 'codigo_recusado_proprio' AND e.criado_em >= ?1 GROUP BY e.afiliado_id, mes LIMIT 50`).bind(ha30),
    db.prepare(`SELECT x.aid, x.t, x.n, a.nome FROM (
                  SELECT p.afiliado_id AS aid, p.criado_em AS t, COUNT(*) AS n
                    FROM afiliados_lancamentos p
                    JOIN afiliados_lancamentos q ON q.afiliado_id = p.afiliado_id AND q.tipo = 'venda'
                     AND q.criado_em >= p.criado_em AND q.criado_em < datetime(p.criado_em, '+1 hour')
                   WHERE p.tipo = 'venda' AND p.criado_em >= ?1 GROUP BY p.id HAVING COUNT(*) >= 5 ORDER BY p.criado_em DESC LIMIT 100) x
                  JOIN afiliados a ON a.id = x.aid`).bind(ha30),
    db.prepare(`SELECT 'cpf' AS campo, GROUP_CONCAT(id) AS ids, GROUP_CONCAT(nome, ' / ') AS nomes FROM afiliados WHERE cpf != '' GROUP BY cpf HAVING COUNT(*) > 1
                UNION ALL
                SELECT 'celular', GROUP_CONCAT(id), GROUP_CONCAT(nome, ' / ') FROM afiliados WHERE telefone IS NOT NULL AND telefone != '' GROUP BY telefone HAVING COUNT(*) > 1
                UNION ALL
                SELECT 'pix', GROUP_CONCAT(p.afiliado_id), GROUP_CONCAT(a.nome, ' / ') FROM afiliados_pix p JOIN afiliados a ON a.id = p.afiliado_id
                 GROUP BY p.chave HAVING COUNT(*) > 1 LIMIT 50`),
    db.prepare(`SELECT l.afiliado_id AS aid, a.nome, l.mes_referencia AS mes, COUNT(*) AS n,
                       SUM(CASE WHEN l.criado_em >= (CASE l.mes_referencia WHEN ?1 THEN ?3 ELSE ?4 END) THEN 1 ELSE 0 END) AS ultimos
                  FROM afiliados_lancamentos l JOIN afiliados a ON a.id = l.afiliado_id
                 WHERE l.mes_referencia IN (?1, ?2) AND a.nivel_fixo_id IS NULL AND ${SQL_VENDA_VALIDA}
                 GROUP BY l.afiliado_id, l.mes_referencia HAVING ultimos > 0 LIMIT 200`).bind(mesPrev, mes, limiteFimDeMes(mesPrev), limiteFimDeMes(mes)),
    db.prepare(`SELECT a.id AS aid, a.nome, COUNT(*) AS cliques FROM afiliados_cliques c JOIN afiliados a ON a.id = c.afiliado_id
                 WHERE c.criado_em >= ?1 AND a.status = 'ativo'
                   AND NOT EXISTS (SELECT 1 FROM afiliados_lancamentos l WHERE l.afiliado_id = a.id AND l.tipo = 'venda' AND l.status != 'cancelada' AND l.criado_em >= ?1)
                 GROUP BY a.id HAVING COUNT(*) >= 50 LIMIT 50`).bind(ha30),
    // Última venda de todos num GROUP BY só (um MAX correlacionado por afiliado varria a tabela de compras inteira).
    db.prepare(`SELECT a.id AS aid, a.nome, u.ult AS venda FROM afiliados a
                  LEFT JOIN (SELECT afiliado_id, MAX(criado_em) AS ult FROM compras_reais WHERE status = 'pago' AND afiliado_id IS NOT NULL GROUP BY afiliado_id) u
                    ON u.afiliado_id = a.id
                 WHERE a.status = 'ativo' AND COALESCE(u.ult, a.criado_em) < ?1 ORDER BY COALESCE(u.ult, a.criado_em) LIMIT 50`).bind(ha30),
    db.prepare(PENDENTES_SQL).bind(t),
    db.prepare('SELECT nome, vendas_minimas, valor_por_venda_centavos, valido_desde_mes FROM afiliados_niveis ORDER BY valido_desde_mes, vendas_minimas LIMIT 200'),
  ])

  const lista = []
  for (const s of linhas(saques)) {
    const dias = Math.floor((agora - dataDeTexto(s.pedido_em)) / 86400000)
    lista.push(alerta(`saque_atrasado:${s.id}`, 'saque_atrasado', dias >= 7 ? 'alta' : 'media',
      `${s.nome} espera há ${plural(dias, 'dia', 'dias')} por um saque de ${reais(s.valor_centavos)}.`, '/gestao/afiliados/saques', Number(s.aid)))
  }
  for (const r of linhas(taxa)) {
    lista.push(alerta(`taxa_estorno:${r.aid}:${mes}`, 'taxa_estorno', 'alta',
      `${r.nome}: ${num(r.estornadas)} de ${num(r.vendas)} vendas dos últimos 90 dias foram reembolsadas (${Math.round((num(r.estornadas) / num(r.vendas)) * 100)}%).`,
      linkAfiliado(r.aid), Number(r.aid)))
  }
  for (const r of linhas(proprio)) {
    lista.push(alerta(`codigo_proprio:${r.aid}:${r.mes}`, 'codigo_proprio', 'media',
      `${r.nome} tentou usar o próprio código ${plural(num(r.n), 'vez', 'vezes')} em ${r.mes.slice(5)}/${r.mes.slice(0, 4)}.`, linkAfiliado(r.aid), Number(r.aid)))
  }
  const picos = new Map()
  for (const r of linhas(pico)) {
    const chave = `pico_vendas:${r.aid}:${diaDe(r.t)}`
    if (!picos.has(chave) || picos.get(chave).n < num(r.n)) picos.set(chave, { aid: r.aid, nome: r.nome, n: num(r.n), dia: diaDe(r.t) })
  }
  for (const [chave, r] of picos) {
    lista.push(alerta(chave, 'pico_vendas', 'alta', `${r.nome} teve ${r.n} vendas em 1 hora no dia ${diaMes(r.dia)}.`, linkAfiliado(r.aid), Number(r.aid)))
  }
  const quemUsa = { cpf: 'o mesmo CPF', celular: 'o mesmo celular', pix: 'a mesma chave Pix' }
  for (const r of linhas(duplicados)) {
    const ids = String(r.ids).split(',').map(Number).sort((a, b) => a - b)
    lista.push(alerta(`duplicado:${r.campo}:${ids.join('-')}`, 'duplicado', 'alta', `Estes afiliados usam ${quemUsa[r.campo]}: ${r.nomes}.`, linkAfiliado(ids[0]), ids[0]))
  }
  const todosNiveis = linhas(niveis)
  for (const r of linhas(fimMes)) {
    const lista2 = niveisVigentes(todosNiveis, r.mes)
    const n = num(r.n)
    const k = num(r.ultimos)
    if (lista2.length < 2) continue
    const cheio = calcularNivel(n, lista2, null)
    const sem = calcularNivel(n - k, lista2, null)
    const subiu = cheio.nivel && cheio.nivel.vendas_minimas > lista2[0].vendas_minimas && (!sem.nivel || sem.nivel.vendas_minimas < cheio.nivel.vendas_minimas)
    if (!subiu || k * 10 < n * 3) continue
    lista.push(alerta(`fim_mes:${r.aid}:${r.mes}`, 'fim_de_mes', 'media',
      `${r.nome} chegou ao nível ${cheio.nivel.nome} em ${r.mes.slice(5)}/${r.mes.slice(0, 4)} com ${k} de ${n} vendas nos 2 últimos dias do mês.`, linkAfiliado(r.aid), Number(r.aid)))
  }
  for (const r of linhas(cliques)) {
    lista.push(alerta(`cliques_sem_venda:${r.aid}:${mes}`, 'cliques_sem_venda', 'media',
      `${r.nome} teve ${num(r.cliques)} cliques em 30 dias e nenhuma venda.`, linkAfiliado(r.aid), Number(r.aid)))
  }
  for (const r of linhas(ativos)) {
    lista.push(alerta(`ativo_sem_venda:${r.aid}:${mes}`, 'ativo_sem_venda', 'baixa',
      r.venda ? `${r.nome} não vende desde ${diaMes(diaDe(r.venda))}.` : `${r.nome} está ativo há mais de 30 dias e ainda não vendeu.`, linkAfiliado(r.aid), Number(r.aid)))
  }
  for (const r of linhas(pendentes)) {
    lista.push(alerta(`fechamento_pendente:${r.mes}`, 'fechamento_pendente', 'alta',
      `O fechamento de ${r.mes.slice(5)}/${r.mes.slice(0, 4)} ainda não rodou para ${plural(num(r.n), 'afiliado', 'afiliados')}.`, `/gestao/afiliados/metas?mes=${r.mes}`))
  }

  // Resolvidos (consulta em blocos de 80 chaves: o D1 aceita poucos parâmetros por consulta).
  const resolvidas = new Set()
  const blocos = []
  for (let i = 0; i < lista.length; i += 80) blocos.push(lista.slice(i, i + 80).map((a) => a.chave))
  if (blocos.length) {
    const resp = await db.batch(blocos.map((b) => db.prepare(`SELECT chave FROM afiliados_alertas_resolvidos WHERE chave IN (${b.map(() => '?').join(',')})`).bind(...b)))
    for (const r of resp) for (const l of linhas(r)) resolvidas.add(l.chave)
  }
  const abertos = lista.filter((a) => !resolvidas.has(a.chave)).sort((a, b) => ORDEM[a.gravidade] - ORDEM[b.gravidade] || (a.chave < b.chave ? -1 : 1))
  const por_gravidade = { alta: 0, media: 0, baixa: 0 }
  for (const a of abertos) por_gravidade[a.gravidade] += 1
  return { gerado_em: agora.toISOString(), total: abertos.length, por_gravidade, alertas: abertos }
}

// Marca como resolvido. Só vale para um alerta aberto agora (não grava chave solta). Idempotente.
export async function resolverAlerta(db, chave, quem, agora = new Date()) {
  if (!CHAVE_VALIDA.test(chave) || chave.length > 80) return { ok: false, motivo: 'invalida' }
  const { alertas } = await calcularAlertas(db, agora)
  if (!alertas.some((a) => a.chave === chave)) return { ok: false, motivo: 'nao_encontrado' }
  await db
    .prepare('INSERT OR IGNORE INTO afiliados_alertas_resolvidos (chave, resolvido_em, resolvido_por) VALUES (?, ?, ?)')
    .bind(chave, textoUtc(agora), String(quem || '').slice(0, 254))
    .run()
  return { ok: true }
}
