// Pedido de saque atômico (substitui a RPC request_payout do prompt).
// Trava dupla: conferência prévia (mensagem legível) + INSERT condicional dentro de db.batch,
// com índice único parcial (1 saque 'solicitado' por afiliado) como última barreira.
import { configuracao } from './niveis.js'
import { saldosDoAfiliado } from './status.js'
import { diaMesBr, somarDias, textoUtc } from './datas.js'

const DIA_MS = 86400000
const reais = (c) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`

// Devolve o motivo do bloqueio, ou null se pode sacar. Também devolve o saldo e o Pix.
// Só leitura: o painel usa a mesma conferência (exportada) para não duplicar regra.
export async function conferir(db, afiliadoId, agora) {
  const afiliado = await db.prepare('SELECT status FROM afiliados WHERE id = ?').bind(afiliadoId).first()
  if (!afiliado || afiliado.status !== 'ativo') return { motivo: 'Sua conta de afiliado não está ativa' }

  const pix = await db.prepare('SELECT * FROM afiliados_pix WHERE afiliado_id = ?').bind(afiliadoId).first()
  if (!pix) return { motivo: 'Cadastre sua chave Pix para sacar' }

  const aberto = await db
    .prepare("SELECT pedido_em FROM afiliados_saques WHERE afiliado_id = ? AND status = 'solicitado'")
    .bind(afiliadoId)
    .first()
  if (aberto) return { motivo: `Você já tem um saque em análise (pedido em ${diaMesBr(aberto.pedido_em)})` }

  const cfg = await configuracao(db)
  // Pedido recusado não conta para o intervalo: o afiliado não é punido por erro de Pix.
  const ultimo = await db
    .prepare("SELECT MAX(pedido_em) AS em FROM afiliados_saques WHERE afiliado_id = ? AND status != 'recusado'")
    .bind(afiliadoId)
    .first()
  if (ultimo?.em) {
    const libera = somarDias(ultimo.em, cfg.intervalo_saque_dias)
    if (agora < libera) {
      const dias = Math.ceil((libera - agora) / DIA_MS)
      return { motivo: `Próximo saque liberado em ${dias} ${dias === 1 ? 'dia' : 'dias'} (${diaMesBr(libera)})` }
    }
  }

  const { disponivel } = await saldosDoAfiliado(db, afiliadoId, agora)
  if (disponivel <= 0) return { motivo: 'Ainda não há valor disponível' }
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
  const corte = textoUtc(somarDias(agora, -c.cfg.intervalo_saque_dias))
  // Valor = saldo disponível inteiro, calculado no mesmo lote que prende os lançamentos.
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO afiliados_saques (afiliado_id, chave, valor_centavos, status, pix_snapshot, pedido_em)
         SELECT ?1, ?2, total, 'solicitado',
                (SELECT json_object('tipo_chave', p.tipo_chave, 'chave', p.chave, 'titular_nome', p.titular_nome, 'titular_cpf', p.titular_cpf)
                   FROM afiliados_pix p WHERE p.afiliado_id = ?1), ?3
           FROM (SELECT SUM(valor_centavos) AS total FROM afiliados_lancamentos
                  WHERE afiliado_id = ?1 AND status = 'pendente' AND saque_id IS NULL AND disponivel_em <= ?3)
          WHERE total > ?4
            AND EXISTS (SELECT 1 FROM afiliados WHERE id = ?1 AND status = 'ativo')
            AND EXISTS (SELECT 1 FROM afiliados_pix WHERE afiliado_id = ?1)
            AND NOT EXISTS (SELECT 1 FROM afiliados_saques WHERE afiliado_id = ?1 AND status = 'solicitado')
            AND NOT EXISTS (SELECT 1 FROM afiliados_saques WHERE afiliado_id = ?1 AND status != 'recusado' AND pedido_em > ?5)`,
      )
      .bind(afiliadoId, chave, t, c.cfg.saque_minimo_centavos, corte),
    db
      .prepare(
        `UPDATE afiliados_lancamentos
            SET status = 'em_saque', saque_id = (SELECT id FROM afiliados_saques WHERE chave = ?2)
          WHERE afiliado_id = ?1 AND status = 'pendente' AND saque_id IS NULL AND disponivel_em <= ?3
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
