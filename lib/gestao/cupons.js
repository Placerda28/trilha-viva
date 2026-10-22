import {
  CODIGO_RE,
  calcularPrecoCupom,
  cupomDaLinha,
  isoUtc,
  normalizarCodigoCupom,
  resultados,
} from './cupons-regras.js'

// As regras puras ficam em cupons-regras.js; quem já importava daqui segue
// importando daqui.
export {
  ERRO_CUPOM_PUBLICO,
  normalizarCodigoCupom,
  codigoCupomValido,
  calcularPrecoCupom,
  fimDoDiaBrasiliaUtc,
  validarCriacaoCupom,
  cupomDaLinha,
  vencimentoDoLinkComCupom,
} from './cupons-regras.js'

// `usos` é o que a tela mostra: compras reais e pagas. Já `esgotado` conta todas as
// compras e as reservas: a vaga foi ocupada de verdade, e é isso que o checkout usa.
const CAMPOS_CUPOM = `
  c.id,
  c.codigo,
  c.tipo,
  c.valor,
  c.valido_ate,
  c.limite_usos,
  c.ativo,
  c.criado_por,
  c.criado_em,
  c.desativado_por,
  c.desativado_em,
  (SELECT COUNT(*) FROM compras_reais p WHERE p.cupom = c.codigo AND p.status = 'pago' LIMIT 1) AS usos,
  (SELECT COUNT(*) FROM cupom_reservas r
    WHERE r.cupom_id = c.id AND r.expira_em > datetime('now') LIMIT 1
  ) AS reservas_ativas,
  (SELECT COALESCE(SUM(p.valor_centavos), 0) FROM compras_reais p
    WHERE p.cupom = c.codigo LIMIT 1
  ) AS faturamento_centavos,
  CASE WHEN c.valido_ate < datetime('now') THEN 1 ELSE 0 END AS vencido,
  CASE WHEN
    (SELECT COUNT(*) FROM compras p WHERE p.cupom = c.codigo LIMIT 1) +
    (SELECT COUNT(*) FROM cupom_reservas r
      WHERE r.cupom_id = c.id AND r.expira_em > datetime('now') LIMIT 1
    ) >= c.limite_usos
  THEN 1 ELSE 0 END AS esgotado`

export async function listarCupons(db, { situacao } = {}) {
  const resultado = await db.prepare(`
    SELECT ${CAMPOS_CUPOM}
      FROM cupons c
     ORDER BY c.ativo DESC, c.criado_em DESC, c.id DESC
     LIMIT 200`).all()
  return filtrarCupons(resultados(resultado).map(cupomDaLinha), situacao)
}

const SITUACOES_CUPOM = new Set(['todos', 'ativos', 'vencidos', 'esgotados', 'desativados'])

export function situacaoCupomValida(valor) {
  const situacao = String(valor || 'todos')
  return SITUACOES_CUPOM.has(situacao) ? situacao : 'todos'
}

// Lista já mapeada (no máximo 200): filtrar aqui custa nada e evita SQL duplicado.
export function filtrarCupons(lista, situacao) {
  const filtro = situacaoCupomValida(situacao)
  if (filtro === 'todos') return lista
  if (filtro === 'desativados') return lista.filter((c) => !c.ativo)
  if (filtro === 'vencidos') return lista.filter((c) => c.ativo && c.vencido)
  if (filtro === 'esgotados') return lista.filter((c) => c.ativo && !c.vencido && c.esgotado)
  return lista.filter((c) => c.ativo && !c.vencido && !c.esgotado)
}

export async function buscarCupomPorId(db, id) {
  const linha = await db.prepare(`
    SELECT ${CAMPOS_CUPOM}
      FROM cupons c
     WHERE c.id = ?
     LIMIT 1`).bind(id).first()
  return linha ? cupomDaLinha(linha) : null
}

export async function criarCupom(db, dados, criadoPor) {
  const resultado = await db.prepare(`
    INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(
      dados.codigo,
      dados.tipo,
      dados.valor,
      dados.valido_ate,
      dados.limite_usos,
      criadoPor
    )
    .run()
  const id = Number(resultado?.meta?.last_row_id)
  return Number.isSafeInteger(id) ? buscarCupomPorId(db, id) : null
}

export async function desativarCupom(db, id, desativadoPor) {
  await db.prepare(`
    UPDATE cupons
       SET ativo = 0,
           desativado_por = COALESCE(desativado_por, ?),
           desativado_em = COALESCE(desativado_em, datetime('now'))
     WHERE id = ?`)
    .bind(desativadoPor, id)
    .run()
  return buscarCupomPorId(db, id)
}

export async function consultarCupomValido(db, codigo, precoBaseCentavos) {
  const normalizado = normalizarCodigoCupom(codigo)
  if (!db || !CODIGO_RE.test(normalizado)) return null
  const linha = await db.prepare(`
    SELECT c.id, c.codigo, c.tipo, c.valor, c.valido_ate
      FROM cupons c
     WHERE c.codigo = ?
       AND c.ativo = 1
       AND c.valido_ate >= datetime('now')
       AND (
         (SELECT COUNT(*) FROM compras p WHERE p.cupom = c.codigo LIMIT 1) +
         (SELECT COUNT(*) FROM cupom_reservas r
           WHERE r.cupom_id = c.id AND r.expira_em > datetime('now') LIMIT 1)
       ) < c.limite_usos
     LIMIT 1`).bind(normalizado).first()
  if (!linha) return null
  const precoCentavos = calcularPrecoCupom(precoBaseCentavos, linha.tipo, Number(linha.valor))
  if (precoCentavos === null) return null
  return {
    id: Number(linha.id),
    codigo: linha.codigo,
    preco_centavos: precoCentavos,
    valido_ate: isoUtc(linha.valido_ate),
  }
}

// O INSERT e a contagem pertencem à mesma instrução. O D1 serializa a escrita:
// se duas pessoas disputarem a última vaga, somente a primeira terá changes=1.
export async function reservarCupom(db, { cupomId, referencia, precoCentavos }) {
  const resultado = await db.prepare(`
    INSERT INTO cupom_reservas (referencia, cupom_id, preco_centavos, expira_em)
    SELECT ?, c.id, ?, datetime('now', '+35 minutes')
      FROM cupons c
     WHERE c.id = ?
       AND c.ativo = 1
       AND c.valido_ate >= datetime('now')
       AND (
         (SELECT COUNT(*) FROM compras p WHERE p.cupom = c.codigo LIMIT 1) +
         (SELECT COUNT(*) FROM cupom_reservas r
           WHERE r.cupom_id = c.id AND r.expira_em > datetime('now') LIMIT 1)
       ) < c.limite_usos`)
    .bind(referencia, precoCentavos, cupomId)
    .run()
  return Boolean(resultado?.meta?.changes)
}

// Pagamento pendente (Pix gerado e ainda não pago, ou cartão em análise, que
// o Mercado Pago diz poder levar até dois dias úteis) pode ser aprovado depois
// dos 35 minutos da reserva. Se a vaga vencesse nesse meio-tempo, outra pessoa
// poderia ocupá-la e o cupom passaria do limite. Então, a cada aviso de
// "pendente", a vaga fica guardada por 4 dias.
//
// Só estende vaga que AINDA está valendo: reativar uma vaga já vencida (aviso
// atrasado) poderia passar do limite, se outra pessoa já tiver ocupado o lugar.
// E quem já virou compra não tem mais reserva, então não há o que estender.
export async function estenderReservaCupom(db, referencia, horas = 96) {
  if (!db || !referencia) return false
  const resultado = await db.prepare(`
    UPDATE cupom_reservas
       SET expira_em = MAX(expira_em, datetime('now', ?))
     WHERE referencia = ? AND expira_em > datetime('now')`)
    .bind('+' + Number(horas) + ' hours', referencia)
    .run()
  return Boolean(resultado?.meta?.changes)
}

export async function cancelarReservaCupom(db, referencia) {
  if (!db || !referencia) return
  await db.prepare('DELETE FROM cupom_reservas WHERE referencia = ?')
    .bind(referencia)
    .run()
}

// Núcleo separado para testar a idempotência com um banco local. A função
// pública registrarCompra, em lib/clientes.js, entrega o binding D1 daqui.
export async function registrarCompraNoBanco(db, {
  clienteId,
  sessionId,
  paymentIntent,
  valor,
  moeda,
  forma,
  cupom,
  referencia,
  teste = false,
}) {
  if (!db) return false
  const codigo = normalizarCodigoCupom(cupom) || null
  const resultado = await db.prepare(`
    INSERT OR IGNORE INTO compras
      (cliente_id, stripe_session_id, stripe_payment_intent, valor_centavos, moeda, forma_pagamento, cupom, teste)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      clienteId,
      sessionId,
      paymentIntent || null,
      Number(valor || 0),
      moeda || 'brl',
      forma || null,
      codigo,
      teste ? 1 : 0
    )
    .run()

  // Também limpa numa repetição: se a primeira chamada gravou a compra e caiu
  // antes deste DELETE, a segunda termina o serviço sem contar uso novamente.
  //
  // A limpeza é "melhor esforço" de propósito: se ela falhar, a vaga só fica
  // contada em dobro até vencer sozinha (o lado seguro). O que não pode é o
  // erro subir e impedir o aviso de mandar o e-mail de acesso a quem pagou.
  if (referencia) {
    try {
      await cancelarReservaCupom(db, referencia)
    } catch (erro) {
      console.error('cupom limpar reserva', referencia, erro?.message)
    }
  }
  return Boolean(resultado?.meta?.changes)
}

// O envio do acesso de uma compra sai uma vez só: quem consegue marcar a
// coluna vazia manda. Se nada saiu, desfazer deixa o próximo aviso tentar.
// shortcut: se o Worker cair entre marcar e enviar, o acesso fica sem sair
// (a pessoa usa "Primeiro acesso"); se acontecer, guardar a hora e retomar.
export async function reservarEnvioAcesso(db, sessionId) {
  if (!db || !sessionId) return false
  const resultado = await db.prepare(`
    UPDATE compras SET acesso_enviado_em = datetime('now')
     WHERE stripe_session_id = ? AND acesso_enviado_em IS NULL`)
    .bind(sessionId)
    .run()
  return Number(resultado?.meta?.changes || 0) === 1
}

export async function desfazerEnvioAcesso(db, sessionId) {
  if (!db || !sessionId) return
  await db.prepare('UPDATE compras SET acesso_enviado_em = NULL WHERE stripe_session_id = ?')
    .bind(sessionId)
    .run()
}
