// Pedido de saque atômico (substitui a RPC request_payout do prompt).
// Trava dupla: conferência prévia (mensagem legível) + INSERT condicional dentro de db.batch,
// com índice único parcial (1 saque 'solicitado' por afiliado) como última barreira.
// Regra do dono (05/11): 1 pedido por CICLO (do dia_fechamento até o dia anterior do mês seguinte, em Brasília), sempre do saldo disponível inteiro.
import { configuracao } from './niveis.js'
import { saldosDoAfiliado } from './status.js'
import { SQL_DISPONIVEL } from './status.js'
import { cicloDe, diaDoFechamento, diaMesBr, diaMesDe, mesAnterior, mesDe, textoUtc } from './datas.js'

const reais = (c) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`

// Devolve o motivo do bloqueio (e `abreEm`, 'AAAA-MM-DD', quando há data para tentar de novo), ou motivo null
// se pode sacar. Também devolve o saldo e o Pix. Só leitura: o painel usa a mesma conferência (exportada).
export async function conferir(db, afiliadoId, agora) {
  const afiliado = await db.prepare('SELECT status FROM afiliados WHERE id = ?').bind(afiliadoId).first()
  if (!afiliado || afiliado.status !== 'ativo') return { motivo: 'Sua conta de afiliado não está ativa' }

  const pix = await db.prepare('SELECT * FROM afiliados_pix WHERE afiliado_id = ?').bind(afiliadoId).first()
  if (!pix) return { motivo: 'Cadastre sua chave Pix para sacar' }

  const aberto = await db
    .prepare("SELECT pedido_em FROM afiliados_saques WHERE afiliado_id = ? AND status = 'solicitado'")
    .bind(afiliadoId)
    .first()
  const cfg = await configuracao(db)
  // abreEm no saque em análise: quando abre o próximo saque se este for pago (recusado, o afiliado pede de novo já).
  if (aberto) {
    return {
      motivo: `Você já tem um saque em análise (pedido em ${diaMesBr(aberto.pedido_em)})`,
      abreEm: cicloDe(aberto.pedido_em, cfg.dia_fechamento).proximo,
    }
  }
  const mes = mesDe(agora)
  const anterior = mesAnterior(mes)
  const dia = Number(new Date(agora.getTime() - 3 * 3600000).toISOString().slice(8, 10))
  const ciclo = cicloDe(agora, cfg.dia_fechamento)
  // Pedido recusado não conta: o afiliado não é punido por erro de Pix e pode pedir de novo no mesmo ciclo.
  const doCiclo = await db
    .prepare("SELECT MIN(pedido_em) AS em FROM afiliados_saques WHERE afiliado_id = ? AND status != 'recusado' AND pedido_em >= ?")
    .bind(afiliadoId, `${ciclo.inicio} 03:00:00`)
    .first()
  if (doCiclo?.em) {
    return { motivo: `Você já pediu o saque deste ciclo (em ${diaMesBr(doCiclo.em)}). O próximo abre em ${diaMesDe(ciclo.proximo)}`, abreEm: ciclo.proximo }
  }

  const [{ disponivel, liberando }, ant] = await Promise.all([
    saldosDoAfiliado(db, afiliadoId, agora),
    // Vendas do mês anterior que ainda não fecharam (só existe entre o dia 1 e o fechamento).
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM afiliados_lancamentos l
          WHERE l.afiliado_id = ? AND l.mes_referencia = ? AND l.tipo = 'venda' AND l.status = 'pendente'
            AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos zf WHERE zf.afiliado_id = l.afiliado_id AND zf.mes_referencia = l.mes_referencia)`,
      )
      .bind(afiliadoId, anterior)
      .first(),
  ])
  const abre = diaDoFechamento(anterior, cfg.dia_fechamento) // dia 8 deste mês
  if (dia < cfg.dia_fechamento) {
    // Antes do dia 8 o ciclo é o que começou no mês passado: com saldo já fechado, pede na hora.
    if (disponivel <= 0 && Number(ant.n) > 0) return { motivo: `O saque abre em ${diaMesDe(abre)}`, abreEm: abre }
  } else if (Number(ant.n) > 0) {
    return { motivo: 'O fechamento do mês anterior está sendo feito. Tente de novo em alguns minutos.', abreEm: abre }
  }
  if (disponivel <= 0) {
    if (liberando > 0) {
      const fecha = diaDoFechamento(mes, cfg.dia_fechamento)
      return { motivo: `Seu saldo deste mês ainda não fechou: libera em ${diaMesDe(fecha)}`, abreEm: fecha }
    }
    return { motivo: 'Ainda não há valor disponível' }
  }
  if (disponivel <= cfg.saque_minimo_centavos) {
    return { motivo: `O valor mínimo para sacar é ${reais(cfg.saque_minimo_centavos)}` }
  }
  return { motivo: null, cfg, pix }
}

export async function pedirSaque(db, afiliadoId, agora = new Date()) {
  const c = await conferir(db, afiliadoId, agora)
  if (c.motivo) return { ok: false, motivo: c.motivo }

  // O Pix gravado no saque é lido dentro do INSERT (não da conferência acima): troca de Pix simultânea não deixa cópia velha.
  const chave = crypto.randomUUID()
  const t = textoUtc(agora)
  const inicioCiclo = `${cicloDe(agora, c.cfg.dia_fechamento).inicio} 03:00:00`
  // Valor = saldo disponível inteiro, calculado no mesmo lote que prende os lançamentos.
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO afiliados_saques (afiliado_id, chave, valor_centavos, status, pix_snapshot, pedido_em)
         SELECT ?1, ?2, total, 'solicitado',
                (SELECT json_object('tipo_chave', p.tipo_chave, 'chave', p.chave, 'titular_nome', p.titular_nome, 'titular_cpf', p.titular_cpf)
                   FROM afiliados_pix p WHERE p.afiliado_id = ?1), ?3
           FROM (SELECT SUM(l.valor_centavos) AS total FROM afiliados_lancamentos l
                  WHERE l.afiliado_id = ?1 AND ${SQL_DISPONIVEL('l', '?3')})
          WHERE total > ?4
            AND EXISTS (SELECT 1 FROM afiliados WHERE id = ?1 AND status = 'ativo')
            AND EXISTS (SELECT 1 FROM afiliados_pix WHERE afiliado_id = ?1)
            AND NOT EXISTS (SELECT 1 FROM afiliados_saques WHERE afiliado_id = ?1 AND status = 'solicitado')
            AND NOT EXISTS (SELECT 1 FROM afiliados_saques WHERE afiliado_id = ?1 AND status != 'recusado' AND pedido_em >= ?5)`,
      )
      .bind(afiliadoId, chave, t, c.cfg.saque_minimo_centavos, inicioCiclo),
    db
      .prepare(
        `UPDATE afiliados_lancamentos AS l
            SET status = 'em_saque', saque_id = (SELECT id FROM afiliados_saques WHERE chave = ?2)
          WHERE l.afiliado_id = ?1 AND ${SQL_DISPONIVEL('l', '?3')}
            AND EXISTS (SELECT 1 FROM afiliados_saques WHERE chave = ?2)`,
      )
      .bind(afiliadoId, chave, t),
  ])

  const saque = await db
    .prepare('SELECT id, valor_centavos, pedido_em FROM afiliados_saques WHERE chave = ? AND afiliado_id = ?')
    .bind(chave, afiliadoId)
    .first()
  if (saque) return { ok: true, saqueId: saque.id, valor_centavos: saque.valor_centavos, pedido_em: saque.pedido_em }

  // Perdeu a corrida (clique duplo ou outro pedido simultâneo): explica pelo estado atual.
  const depois = await conferir(db, afiliadoId, agora)
  return { ok: false, motivo: depois.motivo || 'Não foi possível pedir o saque agora. Tente de novo em instantes.' }
}

// Saques do próprio afiliado, do mais novo ao mais antigo.
export async function saquesDoAfiliado(db, afiliadoId, limite = 50) {
  const { results } = await db
    .prepare(
      `SELECT id, valor_centavos, status, pedido_em, pago_em, nota, (comprovante_caminho IS NOT NULL) AS temComprovante FROM afiliados_saques
        WHERE afiliado_id = ? ORDER BY pedido_em DESC, id DESC LIMIT ?`,
    )
    .bind(afiliadoId, limite)
    .all()
  return results.map((r) => ({ ...r, temComprovante: Boolean(r.temComprovante) }))
}

// Extrato do próprio afiliado.
export async function lancamentosDoAfiliado(db, afiliadoId, limite = 100) {
  const { results } = await db
    .prepare(
      `SELECT id, compra_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, saque_id, descricao, criado_em
         FROM afiliados_lancamentos WHERE afiliado_id = ? ORDER BY id DESC LIMIT ?`,
    )
    .bind(afiliadoId, limite)
    .all()
  return results
}

// Ajustes e estornos do próprio afiliado (devolução de compra, correção manual). Só o que mexe no saldo fora do
// total do mês: o que vem de vendas e do nível aparece no histórico mensal, nunca como linha de base ou bônus.
export async function ajustesDoAfiliado(db, afiliadoId, limite = 100) {
  const { results } = await db
    .prepare(
      `SELECT id, compra_id, tipo, mes_referencia, valor_centavos, descricao, criado_em
         FROM afiliados_lancamentos WHERE afiliado_id = ? AND tipo IN ('estorno', 'ajuste') ORDER BY id DESC LIMIT ?`,
    )
    .bind(afiliadoId, limite)
    .all()
  return results
}
