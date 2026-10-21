// As consultas e reservas da sequência de e-mails no D1 (quem recebe, o que
// impede, a reserva de cada envio). Quem roda é o executarRodadaEmail, no
// index.js.

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

function mudancas(resultado) {
  return Number(resultado?.meta?.changes ?? resultado?.changes ?? 0)
}

export async function contarEnvios(db) {
  const [dia, mes] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) AS total
        FROM lembretes_enviados
       WHERE canal = 'email'
         AND enviado_em >= datetime('now', 'start of day')
       LIMIT 1`).first(),
    db.prepare(`
      SELECT COUNT(*) AS total
        FROM lembretes_enviados
       WHERE canal = 'email'
         AND enviado_em >= datetime('now', 'start of month')
       LIMIT 1`).first(),
  ])
  return { dia: Number(dia?.total || 0), mes: Number(mes?.total || 0) }
}

export async function buscarCandidatosIniciais(db) {
  const resultado = await db.prepare(`
    SELECT id, email, nome, telefone
      FROM carrinhos
     WHERE teste = 0 AND status = 'aberto'
       AND criado_em >= datetime('now', '-48 hours')
       AND criado_em <= datetime('now', '-1 hour')
     ORDER BY criado_em ASC, id ASC
     LIMIT 20`).all()
  return linhas(resultado)
}

export async function buscarSeguimentos(db) {
  const resultado = await db.prepare(`
    SELECT id, email, nome, telefone, etapa_email
      FROM carrinhos
     WHERE teste = 0 AND status = 'lembrado'
       AND finalizado_em IS NULL
       AND proximo_email_em <= datetime('now')
     ORDER BY proximo_email_em ASC, criado_em ASC, id ASC
     LIMIT 20`).all()
  return linhas(resultado)
}

export async function impedimentosIniciais(db, email, telefone, id) {
  const resultado = await db.prepare(`
    SELECT
      EXISTS(SELECT 1 FROM contatos_teste
        WHERE (tipo = 'email' AND valor = ?) OR (tipo = 'telefone' AND valor = ?) LIMIT 1)
      OR EXISTS(SELECT 1 FROM carrinhos WHERE id = ? AND teste = 1 LIMIT 1) AS teste,
      EXISTS(
        SELECT 1
          FROM compras p
          JOIN clientes c ON c.id = p.cliente_id
         WHERE p.status = 'pago' AND c.email = ?
         LIMIT 1
      ) AS tem_compra,
      (
        EXISTS(
          SELECT 1
            FROM lembretes_enviados l
            JOIN carrinhos enviado ON enviado.id = l.carrinho_id
           WHERE l.canal = 'email' AND enviado.email = ?
           LIMIT 1
        )
        OR EXISTS(
          SELECT 1
            FROM carrinhos enviado
           WHERE enviado.email = ? AND enviado.email_enviado_em IS NOT NULL
           LIMIT 1
        )
      ) AS ja_lembrado,
      EXISTS(
        SELECT 1
          FROM descadastros d
         WHERE d.email = ?
         LIMIT 1
      ) AS descadastrado
    LIMIT 1`).bind(email, telefone || '', id, email, email, email, email).first()
  return {
    teste: Boolean(Number(resultado?.teste || 0)),
    temCompra: Boolean(Number(resultado?.tem_compra || 0)),
    jaLembrado: Boolean(Number(resultado?.ja_lembrado || 0)),
    descadastrado: Boolean(Number(resultado?.descadastrado || 0)),
  }
}

export async function impedimentosSeguimento(db, email, telefone, id) {
  const resultado = await db.prepare(`
    SELECT
      EXISTS(SELECT 1 FROM contatos_teste
        WHERE (tipo = 'email' AND valor = ?) OR (tipo = 'telefone' AND valor = ?) LIMIT 1)
      OR EXISTS(SELECT 1 FROM carrinhos WHERE id = ? AND teste = 1 LIMIT 1) AS teste,
      EXISTS(
        SELECT 1
          FROM compras p
          JOIN clientes c ON c.id = p.cliente_id
         WHERE p.status = 'pago' AND c.email = ?
         LIMIT 1
      ) AS tem_compra,
      EXISTS(
        SELECT 1
          FROM descadastros d
         WHERE d.email = ?
         LIMIT 1
      ) AS descadastrado
    LIMIT 1`).bind(email, telefone || '', id, email, email).first()
  return {
    teste: Boolean(Number(resultado?.teste || 0)),
    temCompra: Boolean(Number(resultado?.tem_compra || 0)),
    descadastrado: Boolean(Number(resultado?.descadastrado || 0)),
  }
}

export async function ignorar(db, id) {
  await db.prepare(`
    UPDATE carrinhos
       SET status = 'ignorado'
     WHERE id = ? AND teste = 0 AND status = 'aberto'`).bind(id).run()
}

export async function reservarPrimeiro(db, id, email, tetoDia, tetoMes) {
  // A linha do lembrete é a reserva. Os tetos e a exclusividade por e-mail
  // ficam no mesmo INSERT para duas rodadas concorrentes não ultrapassarem a regra.
  const resultado = await db.prepare(`
    INSERT OR IGNORE INTO lembretes_enviados
      (carrinho_id, canal, etapa, enviado_em)
    SELECT c.id, 'email', 1, datetime('now')
      FROM carrinhos c
     WHERE c.id = ? AND c.teste = 0 AND c.status = 'aberto'
       AND NOT EXISTS (SELECT 1 FROM contatos_teste t WHERE t.valor = c.email OR t.valor = c.telefone LIMIT 1)
       AND NOT EXISTS (
         SELECT 1
           FROM lembretes_enviados anterior
           JOIN carrinhos outro ON outro.id = anterior.carrinho_id
          WHERE anterior.canal = 'email' AND outro.email = ?
          LIMIT 1
       )
       AND NOT EXISTS (
         SELECT 1
           FROM carrinhos outro
          WHERE outro.email = ? AND outro.email_enviado_em IS NOT NULL
          LIMIT 1
       )
       AND (
         SELECT COUNT(*) FROM lembretes_enviados
          WHERE canal = 'email' AND enviado_em >= datetime('now', 'start of day')
       ) < ?
       AND (
         SELECT COUNT(*) FROM lembretes_enviados
          WHERE canal = 'email' AND enviado_em >= datetime('now', 'start of month')
       ) < ?`).bind(id, email, email, tetoDia, tetoMes).run()
  if (mudancas(resultado) !== 1) return false

  const atualizado = await db.prepare(`
    UPDATE carrinhos
       SET status = 'lembrado',
           email_enviado_em = datetime('now'),
           etapa_email = 1,
           proximo_email_em = datetime('now', '+7 days')
     WHERE id = ? AND teste = 0 AND status = 'aberto'`).bind(id).run()
  if (mudancas(atualizado) === 1) return true

  await apagarReserva(db, id, 1)
  return false
}

export async function reservarSeguimento(db, id, etapaAnterior, etapa, tetoDia, tetoMes) {
  const resultado = await db.prepare(`
    INSERT OR IGNORE INTO lembretes_enviados
      (carrinho_id, canal, etapa, enviado_em)
    SELECT id, 'email', ?, datetime('now')
      FROM carrinhos
     WHERE id = ? AND teste = 0
       AND NOT EXISTS (SELECT 1 FROM contatos_teste t WHERE t.valor = carrinhos.email OR t.valor = carrinhos.telefone LIMIT 1)
       AND status = 'lembrado'
       AND finalizado_em IS NULL
       AND etapa_email = ?
       AND proximo_email_em <= datetime('now')
       AND (
         SELECT COUNT(*) FROM lembretes_enviados
          WHERE canal = 'email' AND enviado_em >= datetime('now', 'start of day')
       ) < ?
       AND (
         SELECT COUNT(*) FROM lembretes_enviados
          WHERE canal = 'email' AND enviado_em >= datetime('now', 'start of month')
       ) < ?`).bind(etapa, id, etapaAnterior, tetoDia, tetoMes).run()
  return mudancas(resultado) === 1
}

async function apagarReserva(db, id, etapa) {
  await db.prepare(`
    DELETE FROM lembretes_enviados
     WHERE carrinho_id = ? AND canal = 'email' AND etapa = ?`).bind(id, etapa).run()
}

export async function registrarFalhaInicial(db, id) {
  await apagarReserva(db, id, 1)
  // Se o webhook marcar a compra durante o envio, preservamos o estado pago.
  await db.prepare(`
    UPDATE carrinhos
       SET status = CASE WHEN status = 'pago' THEN 'pago' ELSE 'ignorado' END,
           email_enviado_em = NULL,
           etapa_email = 0,
           proximo_email_em = NULL
     WHERE id = ?`).bind(id).run()
}

export async function registrarFalhaSeguimento(db, id, etapaAnterior, etapa) {
  await apagarReserva(db, id, etapa)
  await db.prepare(`
    UPDATE carrinhos
       SET proximo_email_em = datetime('now', '+1 day')
     WHERE id = ?
       AND status = 'lembrado'
       AND finalizado_em IS NULL
       AND etapa_email = ?`).bind(id, etapaAnterior).run()
}

export async function concluirSeguimento(db, id, etapaAnterior, etapa) {
  const dias = etapa === 2 ? 15 : 30
  await db.prepare(`
    UPDATE carrinhos
       SET etapa_email = ?, proximo_email_em = datetime('now', ?)
     WHERE id = ?
       AND status = 'lembrado'
       AND finalizado_em IS NULL
       AND etapa_email = ?`).bind(etapa, `+${dias} days`, id, etapaAnterior).run()
}

export async function finalizar(db, id, motivo) {
  await db.prepare(`
    UPDATE carrinhos
       SET finalizado_em = datetime('now'), finalizado_motivo = ?
     WHERE id = ? AND status = 'lembrado' AND finalizado_em IS NULL`).bind(motivo, id).run()
}
