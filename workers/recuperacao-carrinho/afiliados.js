// Etapa dos afiliados no cron: fechamento mensal, resumo por e-mail e "faltam X vendas".
// Cada parte tem teto por rodada (CPU do cron). Idempotente: repetir a rodada não duplica nada.
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { calcularNivel, niveisDoMes } from '../../lib/afiliados/niveis.js'
import { saldosDoAfiliado, SQL_VENDA_VALIDA } from '../../lib/afiliados/status.js'
import { mesAnterior, mesDe, mesParaFechar } from '../../lib/afiliados/datas.js'
import { montarFaltamVendas, montarResumoFechamento, nomeDoMes, reais } from '../../lib/emails-afiliado.js'
import { normalizarEmailLembrete } from '../../lib/lembrete-assinatura.js'

const POR_RODADA = 25
const TENTATIVAS_RESUMO = 3
const DIAS_FINAIS = 5
const FALTAM_MAXIMO = 5
const SEM_FECHAMENTO = `NOT EXISTS (SELECT 1 FROM afiliados_fechamentos f WHERE f.afiliado_id = l.afiliado_id AND f.mes_referencia = l.mes_referencia)`

// UMA consulta: dia de fechamento + se há afiliado sem fechamento nos dois meses possíveis.
export async function fecharPendentes(env, agora, logger = console) {
  const db = env.DB
  const m1 = mesAnterior(mesDe(agora))
  const m2 = mesAnterior(m1)
  const linha = await db
    .prepare(
      `SELECT c.dia_fechamento AS dia,
         EXISTS (SELECT 1 FROM afiliados_lancamentos l WHERE l.mes_referencia = ?1 AND l.tipo = 'venda' AND ${SEM_FECHAMENTO}) AS a,
         EXISTS (SELECT 1 FROM afiliados_lancamentos l WHERE l.mes_referencia = ?2 AND l.tipo = 'venda' AND ${SEM_FECHAMENTO}) AS b
       FROM afiliados_config c WHERE c.id = 1`,
    )
    .bind(m1, m2)
    .first()
  if (!linha) return { mes: null, fechados: 0 }
  const mes = mesParaFechar(agora, Number(linha.dia))
  if (!Number(mes === m1 ? linha.a : linha.b)) return { mes, fechados: 0 }
  const r = await fecharMes(db, mes, agora, { limite: POR_RODADA })
  if (r.pendentes?.length) logger.log(`afiliados: ${r.pendentes.length} fechamento(s) ficam para a próxima rodada (${mes})`)
  return { mes, fechados: r.fechados?.length || 0, restam: Boolean(r.restam), pendentes: r.pendentes?.length || 0 }
}

// Modo teste: só o e-mail de teste. Contato de teste nunca recebe em modo ativo.
function filtroEmail(env) {
  return {
    sql: `AND ((?1 = 1 AND NOT EXISTS (SELECT 1 FROM contatos_teste t WHERE t.valor = c.email LIMIT 1))
               OR (?1 = 0 AND lower(c.email) = ?2))`,
    args: [env.MODO === 'ativo' ? 1 : 0, normalizarEmailLembrete(env.TESTE_PARA) || ''],
  }
}

async function enviarResend(env, fetchImpl, corpo, chave) {
  const envio = { ...corpo }
  delete envio.titulo
  const resposta = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': chave },
    body: JSON.stringify(envio),
    signal: AbortSignal.timeout(10000),
  })
  if (!resposta.ok) throw new Error(`Resend respondeu com HTTP ${resposta.status}`)
}

const gravarAviso = (db, afiliadoId, tipo, titulo, texto) =>
  db
    .prepare(
      `INSERT INTO afiliados_avisos (afiliado_id, tipo, titulo, texto, link)
       SELECT ?1, ?2, ?3, ?4, '/minha-conta/afiliado'
        WHERE NOT EXISTS (SELECT 1 FROM afiliados_avisos WHERE afiliado_id = ?1 AND tipo = ?2)`,
    )
    .bind(afiliadoId, tipo, titulo, texto)
    .run()

export async function enviarResumos(env, agora, fetchImpl, logger = console) {
  const db = env.DB
  const f = filtroEmail(env)
  const { results } = await db
    .prepare(
      `SELECT f.id, f.afiliado_id, f.mes_referencia, f.vendas_validas, f.niveis_snapshot,
              f.base_centavos, f.bonus_centavos, f.total_centavos, f.resumo_tentativas, a.nome, c.email
         FROM afiliados_fechamentos f JOIN afiliados a ON a.id = f.afiliado_id JOIN clientes c ON c.id = a.cliente_id
        WHERE f.resumo_enviado_em IS NULL AND f.resumo_tentativas < ${TENTATIVAS_RESUMO}
          AND f.fechado_em >= datetime('now', '-10 days') AND a.status = 'ativo' ${f.sql}
        ORDER BY f.id LIMIT ${POR_RODADA}`,
    )
    .bind(...f.args)
    .all()
  const r = { enviados: 0, falhas: 0 }
  for (const x of results) {
    try {
      // Reserva atômica: a tentativa é contada antes do envio, então duas rodadas não mandam em dobro.
      const reserva = await db
        .prepare(
          `UPDATE afiliados_fechamentos SET resumo_tentativas = resumo_tentativas + 1
            WHERE id = ? AND resumo_enviado_em IS NULL AND resumo_tentativas = ?`,
        )
        .bind(x.id, x.resumo_tentativas)
        .run()
      if (!reserva.meta.changes) continue
      const saldos = await saldosDoAfiliado(db, x.afiliado_id, agora)
      const nivel = JSON.parse(x.niveis_snapshot).nivel?.nome || null
      const corpo = montarResumoFechamento(
        {
          para: x.email, nome: x.nome, mes: x.mes_referencia, vendas: x.vendas_validas, nivel,
          base: x.base_centavos, bonus: x.bonus_centavos, total: x.total_centavos, disponivel: saldos.disponivel,
        },
        env,
      )
      await gravarAviso(db, x.afiliado_id, `fechamento:${x.mes_referencia}`, corpo.titulo,
        `Vendas válidas: ${x.vendas_validas}. Total do mês: ${reais(x.total_centavos)}.`)
      await enviarResend(env, fetchImpl, corpo, `afiliado-resumo:${x.id}`)
      await db.prepare(`UPDATE afiliados_fechamentos SET resumo_enviado_em = datetime('now') WHERE id = ?`).bind(x.id).run()
      r.enviados += 1
    } catch (erro) {
      r.falhas += 1
      logger.error(`Falha no resumo do fechamento ${x.id}:`, erro?.message)
    }
  }
  return r
}

// Últimos 5 dias do mês de Brasília. No máximo 1 aviso e 1 e-mail por afiliado por mês
// (o aviso é gravado ANTES do e-mail; se o e-mail falhar, não repete).
export async function avisarFaltam(env, agora, fetchImpl, logger = console) {
  const mes = mesDe(agora)
  const [ano, m] = mes.split('-').map(Number)
  const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const dia = Number(new Date(agora.getTime() - 3 * 3600000).toISOString().slice(8, 10))
  const r = { enviados: 0, falhas: 0 }
  if (dia < ultimo - DIAS_FINAIS + 1) return r
  const db = env.DB
  const niveis = await niveisDoMes(db, mes)
  // Faixas de vendas a até 5 do limiar de cada nível acima do menor (o menor já vale com 1 venda).
  const faixas = niveis.slice(1).map((n) => [Math.max(1, n.vendas_minimas - FALTAM_MAXIMO), n.vendas_minimas - 1])
  if (!faixas.length) return r
  const f = filtroEmail(env)
  const { results } = await db
    .prepare(
      `SELECT a.id, a.nome, c.email, COUNT(*) AS n
         FROM afiliados_lancamentos l JOIN afiliados a ON a.id = l.afiliado_id JOIN clientes c ON c.id = a.cliente_id
        WHERE l.mes_referencia = ?3 AND ${SQL_VENDA_VALIDA} AND a.status = 'ativo' AND a.nivel_fixo_id IS NULL ${f.sql}
          AND NOT EXISTS (SELECT 1 FROM afiliados_avisos v WHERE v.afiliado_id = a.id AND v.tipo = 'faltam:' || ?3)
          AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos z WHERE z.afiliado_id = a.id AND z.mes_referencia = ?3)
        GROUP BY a.id HAVING ${faixas.map(() => '(COUNT(*) BETWEEN ? AND ?)').join(' OR ')}
        ORDER BY a.id LIMIT ${POR_RODADA}`,
    )
    .bind(...f.args, mes, ...faixas.flat())
    .all()
  for (const x of results) {
    try {
      const c = calcularNivel(x.n, niveis, null)
      if (!c.proximo || c.faltam < 1 || c.faltam > FALTAM_MAXIMO) continue
      const corpo = montarFaltamVendas({ para: x.email, nome: x.nome, mes, vendas: x.n, faltam: c.faltam, proximo: c.proximo.nome }, env)
      const g = await gravarAviso(db, x.id, `faltam:${mes}`, corpo.titulo,
        `Você tem ${x.n} vendas em ${nomeDoMes(mes)}. Todas passam a valer o nível ${c.proximo.nome} se você chegar lá.`)
      if (!g.meta.changes) continue
      await enviarResend(env, fetchImpl, corpo, `afiliado-faltam:${x.id}:${mes}`)
      r.enviados += 1
    } catch (erro) {
      r.falhas += 1
      logger.error(`Falha no aviso "faltam" do afiliado ${x.id}:`, erro?.message)
    }
  }
  return r
}

export async function executarAfiliados(env, { fetchImpl = globalThis.fetch, logger = console, agora = new Date() } = {}) {
  if (!env.DB) throw new Error('Binding DB não configurado.')
  const resultado = { fechamento: null, resumos: null, faltam: null }
  const etapas = [
    ['fechamento', () => fecharPendentes(env, agora, logger)],
    ['resumos', () => enviarResumos(env, agora, fetchImpl, logger)],
    ['faltam', () => avisarFaltam(env, agora, fetchImpl, logger)],
  ]
  for (const [nome, fn] of etapas) {
    // Sem e-mail configurado, só o fechamento roda.
    if (nome !== 'fechamento' && !(env.RESEND_API_KEY && env.EMAIL_FROM)) continue
    try {
      resultado[nome] = await fn()
    } catch (erro) {
      logger.error(`Falha na etapa de afiliados (${nome}):`, erro)
    }
  }
  return resultado
}
