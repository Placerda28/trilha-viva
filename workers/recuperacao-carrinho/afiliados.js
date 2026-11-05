// Etapa dos afiliados no cron: fechamento mensal, resumo por e-mail e "faltam X vendas".
//
// ORÇAMENTO DE CONSULTAS: o plano grátis do D1 dá 50 consultas por invocação do Worker e o robô divide
// isso com e-mail, leads e WhatsApp. Esta etapa gasta no máximo ORCAMENTO (16) por rodada. Cada statement
// preparado conta 1, inclusive os de um db.batch. Contas (custo por unidade):
//   - checagem do fechamento: 1; fecharMes: 3 fixas + 4 por afiliado (fixo, contagem, 2 do lote) -> 3 afiliados = 16
//   - resumo: 1 de lista + por e-mail 4 na 1ª tentativa (saldo, reserva, aviso, marcar) ou 2 nas repetições
//   - "faltam": só nos 5 últimos dias; 2 (níveis e candidatos) + 1 por aviso novo + 1 de fila + 2 por e-mail
// O teto de 16 ainda é reduzido pelo que as etapas anteriores da rodada já gastaram (orcamento.js): afiliados
// roda por último e usa min(16, 50 - gasto - 4).
// A ordem é fechamento, resumo, faltam; cada parte só começa se o orçamento restante comporta uma unidade.
// Cron a cada 10 min = até 18 fechamentos por hora; o que sobrar fica para a rodada seguinte.
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { calcularNivel, niveisDoMes } from '../../lib/afiliados/niveis.js'
import { saldosDoAfiliado, SQL_VENDA_VALIDA } from '../../lib/afiliados/status.js'
import { mesDe, mesParaFechar, somarDias, textoUtc } from '../../lib/afiliados/datas.js'
import { montarFaltamVendas, montarResumoFechamento, nomeDoMes, reais } from '../../lib/emails-afiliado.js'
import { normalizarEmailLembrete } from '../../lib/lembrete-assinatura.js'
import { LIMITE_D1, MARGEM, consultasGastas } from './orcamento.js'

export const ORCAMENTO = 16
const FECHAMENTOS = 3
const RESUMOS = 5
const FALTAM = 5
const CONSULTAS_FECHAR_FIXAS = 3
const CONSULTAS_POR_AFILIADO = 4
const TENTATIVAS = 3
const JANELA_HORAS = 20 // a chave do Resend vale 24 h
const DIAS_FINAIS = 5
const FALTAM_MAXIMO = 5

// Conta cada prepare (= 1 statement) e recusa passar do orçamento.
export function comOrcamento(db, total = ORCAMENTO) {
  const o = { restante: total, usadas: 0 }
  o.db = {
    prepare(sql) {
      if (o.restante <= 0) throw new Error('Orçamento de consultas dos afiliados esgotado.')
      o.restante -= 1
      o.usadas += 1
      return db.prepare(sql)
    },
    batch: (lista) => db.batch(lista),
  }
  return o
}

// UMA consulta: o mês MAIS ANTIGO com afiliado com venda e sem fechamento. Só vale se já foi liberado.
export async function fecharPendentes(env, o, agora, logger = console) {
  const linha = await o.db
    .prepare(
      `SELECT c.dia_fechamento AS dia,
         (SELECT MIN(l.mes_referencia) FROM afiliados_lancamentos l
           WHERE l.tipo = 'venda' AND l.mes_referencia <= ?1
             AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos f WHERE f.afiliado_id = l.afiliado_id AND f.mes_referencia = l.mes_referencia)) AS mes
         FROM afiliados_config c WHERE c.id = 1`,
    )
    .bind(mesDe(agora))
    .first()
  if (!linha || !linha.mes) return { mes: null, fechados: 0 }
  // O mais antigo pendente ainda não liberado => nenhum mês liberado tem pendência.
  if (linha.mes > mesParaFechar(agora, Number(linha.dia))) return { mes: linha.mes, fechados: 0 }
  const n = Math.min(FECHAMENTOS, Math.floor((o.restante - CONSULTAS_FECHAR_FIXAS) / CONSULTAS_POR_AFILIADO))
  if (n < 1) return { mes: linha.mes, fechados: 0, adiado: true }
  const r = await fecharMes(o.db, linha.mes, agora, { limite: n })
  if (r.pendentes?.length) logger.log(`afiliados: ${r.pendentes.length} fechamento(s) ficam para a próxima rodada (${linha.mes})`)
  return { mes: linha.mes, fechados: r.fechados?.length || 0, restam: Boolean(r.restam), pendentes: r.pendentes?.length || 0 }
}

// Modo teste: só o e-mail de teste. Contato de teste nunca recebe em modo ativo.
function filtroEmail(env) {
  return {
    sql: `AND ((?1 = 1 AND NOT EXISTS (SELECT 1 FROM contatos_teste t WHERE t.valor = c.email LIMIT 1))
               OR (?1 = 0 AND lower(c.email) = ?2))`,
    args: [env.MODO === 'ativo' ? 1 : 0, normalizarEmailLembrete(env.TESTE_PARA) || ''],
  }
}

// true = o Resend aceitou, ou respondeu 409 para a mesma chave (já recebeu esse envio).
async function enviarResend(env, fetchImpl, corpo, chave, logger) {
  const envio = { ...corpo }
  delete envio.titulo
  const resposta = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': chave },
    body: JSON.stringify(envio),
    signal: AbortSignal.timeout(10000),
  })
  if (resposta.status === 409) {
    logger.log(`afiliados: Resend respondeu 409 para ${chave}; tratado como já enviado.`)
    return true
  }
  if (!resposta.ok) throw new Error(`Resend respondeu com HTTP ${resposta.status}`)
  return true
}

const gravarAviso = (o, afiliadoId, tipo, titulo, texto, dados = null) =>
  o.db
    .prepare(
      `INSERT INTO afiliados_avisos (afiliado_id, tipo, titulo, texto, link, email_dados)
       SELECT ?1, ?2, ?3, ?4, '/minha-conta/afiliado', ?5
        WHERE NOT EXISTS (SELECT 1 FROM afiliados_avisos WHERE afiliado_id = ?1 AND tipo = ?2)`,
    )
    .bind(afiliadoId, tipo, titulo, texto, dados)
    .run()

const expirou = (primeira, agora) => Boolean(primeira) && primeira < textoUtc(new Date(agora.getTime() - JANELA_HORAS * 3600000))

export async function enviarResumos(env, o, agora, fetchImpl, logger = console) {
  const r = { enviados: 0, falhas: 0, desistiu: 0 }
  if (o.restante < 2) return r
  const f = filtroEmail(env)
  const { results } = await o.db
    .prepare(
      `SELECT f.id, f.afiliado_id, f.mes_referencia, f.vendas_validas, f.niveis_snapshot, f.base_centavos, f.bonus_centavos,
              f.total_centavos, f.resumo_tentativas, f.resumo_primeira_tentativa_em, f.resumo_saldo_centavos, a.nome, c.email
         FROM afiliados_fechamentos f JOIN afiliados a ON a.id = f.afiliado_id JOIN clientes c ON c.id = a.cliente_id
        WHERE f.resumo_enviado_em IS NULL AND f.resumo_tentativas < ${TENTATIVAS}
          AND f.fechado_em >= ?3 AND a.status = 'ativo' ${f.sql}
        ORDER BY f.id LIMIT ${RESUMOS}`,
    )
    .bind(...f.args, textoUtc(somarDias(agora, -10)))
    .all()
  const agoraTxt = textoUtc(agora)
  for (const x of results) {
    try {
      if (expirou(x.resumo_primeira_tentativa_em, agora)) {
        if (o.restante < 1) break
        await o.db.prepare('UPDATE afiliados_fechamentos SET resumo_tentativas = ? WHERE id = ? AND resumo_enviado_em IS NULL').bind(TENTATIVAS, x.id).run()
        logger.error(`afiliados: resumo do fechamento ${x.id} desistido (passou de ${JANELA_HORAS} h da 1ª tentativa; a chave do Resend expira).`)
        r.desistiu += 1
        continue
      }
      const primeira = x.resumo_tentativas === 0
      if (o.restante < (primeira ? 4 : 2)) break
      // Saldo congelado na 1ª tentativa: o corpo do e-mail não muda entre tentativas.
      const saldo = x.resumo_saldo_centavos ?? (await saldosDoAfiliado(o.db, x.afiliado_id, agora)).disponivel
      // Reserva atômica: a tentativa é contada antes do envio, então duas rodadas não mandam em dobro.
      const reserva = await o.db
        .prepare(
          `UPDATE afiliados_fechamentos SET resumo_tentativas = resumo_tentativas + 1,
                 resumo_primeira_tentativa_em = COALESCE(resumo_primeira_tentativa_em, ?3),
                 resumo_saldo_centavos = COALESCE(resumo_saldo_centavos, ?4)
            WHERE id = ?1 AND resumo_enviado_em IS NULL AND resumo_tentativas = ?2`,
        )
        .bind(x.id, x.resumo_tentativas, agoraTxt, saldo)
        .run()
      if (!reserva.meta.changes) continue
      const nivel = JSON.parse(x.niveis_snapshot).nivel?.nome || null
      const corpo = montarResumoFechamento(
        { para: x.email, nome: x.nome, mes: x.mes_referencia, vendas: x.vendas_validas, nivel, base: x.base_centavos,
          bonus: x.bonus_centavos, total: x.total_centavos, disponivel: saldo },
        env,
      )
      if (primeira) {
        await gravarAviso(o, x.afiliado_id, `fechamento:${x.mes_referencia}`, corpo.titulo,
          `Vendas válidas: ${x.vendas_validas}. Total do mês: ${reais(x.total_centavos)}.`)
      }
      await enviarResend(env, fetchImpl, corpo, `afiliado-resumo:${x.id}`, logger)
      await o.db.prepare('UPDATE afiliados_fechamentos SET resumo_enviado_em = ? WHERE id = ?').bind(agoraTxt, x.id).run()
      r.enviados += 1
    } catch (erro) {
      r.falhas += 1
      logger.error(`Falha no resumo do fechamento ${x.id}:`, erro?.message)
    }
  }
  return r
}

// Últimos 5 dias do mês de Brasília. O aviso do painel é 1 só por afiliado e mês; o e-mail tem entrega
// própria (até 3 tentativas, dentro de 20 h da 1ª, só enquanto o mês não virar) com os dados congelados.
export async function avisarFaltam(env, o, agora, fetchImpl, logger = console) {
  const mes = mesDe(agora)
  const [ano, m] = mes.split('-').map(Number)
  const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const dia = Number(new Date(agora.getTime() - 3 * 3600000).toISOString().slice(8, 10))
  const r = { enviados: 0, falhas: 0, avisos: 0, desistiu: 0 }
  if (dia < ultimo - DIAS_FINAIS + 1) return r
  const f = filtroEmail(env)
  const tipo = `faltam:${mes}`
  const agoraTxt = textoUtc(agora)

  // 1) Avisos novos (dados congelados na criação).
  if (o.restante >= 6) {
    const niveis = await niveisDoMes(o.db, mes)
    // Faixas de vendas a até 5 do limiar de cada nível acima do menor (o menor já vale com 1 venda).
    const faixas = niveis.slice(1).map((n) => [Math.max(1, n.vendas_minimas - FALTAM_MAXIMO), n.vendas_minimas - 1])
    if (faixas.length) {
      const { results } = await o.db
        .prepare(
          `SELECT a.id, COUNT(*) AS n
             FROM afiliados_lancamentos l JOIN afiliados a ON a.id = l.afiliado_id JOIN clientes c ON c.id = a.cliente_id
            WHERE l.mes_referencia = ?3 AND ${SQL_VENDA_VALIDA} AND a.status = 'ativo' AND a.nivel_fixo_id IS NULL ${f.sql}
              AND NOT EXISTS (SELECT 1 FROM afiliados_avisos v WHERE v.afiliado_id = a.id AND v.tipo = 'faltam:' || ?3)
              AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos z WHERE z.afiliado_id = a.id AND z.mes_referencia = ?3)
            GROUP BY a.id HAVING ${faixas.map(() => '(COUNT(*) BETWEEN ? AND ?)').join(' OR ')}
            ORDER BY a.id LIMIT ${FALTAM}`,
        )
        .bind(...f.args, mes, ...faixas.flat())
        .all()
      for (const x of results) {
        if (o.restante < 4) break // 1 do aviso + 1 de fila + 2 de um envio
        try {
          const c = calcularNivel(x.n, niveis, null)
          if (!c.proximo || c.faltam < 1 || c.faltam > FALTAM_MAXIMO) continue
          const dados = { vendas: x.n, faltam: c.faltam, proximo: c.proximo.nome }
          const titulo = `Faltam ${c.faltam} ${c.faltam === 1 ? 'venda' : 'vendas'} para o nível ${c.proximo.nome}`
          const g = await gravarAviso(o, x.id, tipo, titulo,
            `Você tem ${x.n} vendas em ${nomeDoMes(mes)}. Todas passam a valer o nível ${c.proximo.nome} se você chegar lá.`,
            JSON.stringify(dados))
          r.avisos += g.meta.changes
        } catch (erro) {
          r.falhas += 1
          logger.error(`Falha ao criar o aviso "faltam" do afiliado ${x.id}:`, erro?.message)
        }
      }
    }
  }

  // 2) Fila de e-mails dos avisos do mês (novos e repetições).
  if (o.restante < 3) return r
  const { results: fila } = await o.db
    .prepare(
      `SELECT v.id, v.email_dados, v.email_tentativas, v.email_primeira_tentativa_em, a.id AS afiliado_id, a.nome, c.email
         FROM afiliados_avisos v JOIN afiliados a ON a.id = v.afiliado_id JOIN clientes c ON c.id = a.cliente_id
        WHERE v.tipo = ?3 AND v.email_dados IS NOT NULL AND v.email_enviado_em IS NULL AND v.email_tentativas < ${TENTATIVAS}
          AND a.status = 'ativo' ${f.sql}
        ORDER BY v.id LIMIT ${FALTAM}`,
    )
    .bind(...f.args, tipo)
    .all()
  for (const v of fila) {
    try {
      if (expirou(v.email_primeira_tentativa_em, agora)) {
        if (o.restante < 1) break
        await o.db.prepare('UPDATE afiliados_avisos SET email_tentativas = ? WHERE id = ? AND email_enviado_em IS NULL').bind(TENTATIVAS, v.id).run()
        logger.error(`afiliados: e-mail "faltam" do aviso ${v.id} desistido (passou de ${JANELA_HORAS} h da 1ª tentativa).`)
        r.desistiu += 1
        continue
      }
      if (o.restante < 2) break
      const reserva = await o.db
        .prepare(
          `UPDATE afiliados_avisos SET email_tentativas = email_tentativas + 1,
                 email_primeira_tentativa_em = COALESCE(email_primeira_tentativa_em, ?3)
            WHERE id = ?1 AND email_enviado_em IS NULL AND email_tentativas = ?2`,
        )
        .bind(v.id, v.email_tentativas, agoraTxt)
        .run()
      if (!reserva.meta.changes) continue
      const d = JSON.parse(v.email_dados)
      const corpo = montarFaltamVendas({ para: v.email, nome: v.nome, mes, vendas: d.vendas, faltam: d.faltam, proximo: d.proximo }, env)
      await enviarResend(env, fetchImpl, corpo, `afiliado-faltam:${v.afiliado_id}:${mes}`, logger)
      await o.db.prepare('UPDATE afiliados_avisos SET email_enviado_em = ? WHERE id = ?').bind(agoraTxt, v.id).run()
      r.enviados += 1
    } catch (erro) {
      r.falhas += 1
      logger.error(`Falha no e-mail "faltam" do aviso ${v.id}:`, erro?.message)
    }
  }
  return r
}

export async function executarAfiliados(env, { fetchImpl = globalThis.fetch, logger = console, agora = new Date() } = {}) {
  if (!env.DB) throw new Error('Binding DB não configurado.')
  // Só o que sobrou: min(16, 50 - já gasto pelas outras etapas - margem). Sem sobra, espera a próxima rodada.
  const total = Math.min(ORCAMENTO, LIMITE_D1 - consultasGastas(env.DB) - MARGEM)
  if (total < 1) return { fechamento: null, resumos: null, faltam: null, adiado: true, consultas: 0 }
  const o = comOrcamento(env.DB, total)
  const resultado = { fechamento: null, resumos: null, faltam: null }
  const etapas = [
    ['fechamento', () => fecharPendentes(env, o, agora, logger)],
    ['resumos', () => enviarResumos(env, o, agora, fetchImpl, logger)],
    ['faltam', () => avisarFaltam(env, o, agora, fetchImpl, logger)],
  ]
  for (const [nome, fn] of etapas) {
    // Sem e-mail configurado, só o fechamento roda. Sem orçamento, a etapa espera a próxima rodada.
    if (nome !== 'fechamento' && !(env.RESEND_API_KEY && env.EMAIL_FROM)) continue
    if (o.restante <= 0) break
    try {
      resultado[nome] = await fn()
    } catch (erro) {
      logger.error(`Falha na etapa de afiliados (${nome}):`, erro)
    }
  }
  resultado.consultas = o.usadas
  return resultado
}
