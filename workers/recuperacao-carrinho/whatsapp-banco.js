import { SQL_MENSAGENS, TOTAL_MENSAGENS, diasDeEmail } from '../../lib/whatsapp-sequencia.js'

// As consultas e reservas da sequência de WhatsApp no D1 (fila, impedimentos,
// a vaga de cada mensagem) e o telefone mascarado dos logs. Quem roda é o
// executarWhatsapp, em whatsapp.js, que reexporta mascararTelefone.

const POR_RODADA = 20
const DIAS_SEM_NOVA_SEQUENCIA = 60

export function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

export function mudancas(resultado) {
  return Number(resultado?.meta?.changes ?? resultado?.changes ?? 0)
}

export function mascararTelefone(telefone) {
  const numero = String(telefone || '')
  return `${numero.slice(0, 2)}*****${numero.slice(-4)}`
}

// ---------------------------------------------------------------- envio ----
// As datas do envio usam o relógio da rodada (agora), gravado como texto UTC.

export async function contarEnviosHoje(db, agoraSql) {
  const linha = await db.prepare(`
    SELECT COUNT(*) AS total
      FROM lembretes_enviados
     WHERE canal = 'whatsapp'
       AND enviado_em >= datetime(?, 'start of day')
     LIMIT 1`).bind(agoraSql).first()
  return Number(linha?.total || 0)
}

// Carrinhos esperando a 1ª mensagem: 3 h a 48 h de idade, ainda sem compra.
export async function buscarPrimeiras(db, soTelefone, agoraSql) {
  const resultado = await db.prepare(`
    SELECT id, email, nome, telefone, datetime(criado_em, '+3 hours') AS vez_em
      FROM carrinhos
     WHERE teste = 0 AND whatsapp_encerrado_em IS NULL AND telefone IS NOT NULL
       AND whatsapp_enviado_em IS NULL
       AND whatsapp_falhou_em IS NULL
       AND status <> 'pago'
       AND criado_em <= datetime(?, '-3 hours')
       AND criado_em >= datetime(?, '-48 hours')
       AND (? IS NULL OR telefone = ?)
     ORDER BY criado_em ASC, id ASC
     LIMIT ${POR_RODADA}`).bind(agoraSql, agoraSql, soTelefone, soTelefone).all()
  return linhas(resultado)
}

// Sequências com a próxima mensagem vencida, já com tudo o que a decisão
// precisa numa consulta só: compra, descadastro, as mensagens enviadas e os
// dias de e-mail da pessoa.
export async function buscarSeguintes(db, soTelefone, agoraSql) {
  const resultado = await db.prepare(`
    SELECT c.id, c.email, c.nome, c.telefone, c.whatsapp_etapa, c.whatsapp_enviado_em,
           c.proximo_whatsapp_em AS vez_em,
           EXISTS (
             SELECT 1 FROM compras p JOIN clientes cl ON cl.id = p.cliente_id
              WHERE p.status = 'pago' AND cl.email = c.email LIMIT 1
           ) OR EXISTS (
             SELECT 1 FROM carrinhos pago
              WHERE pago.status = 'pago' AND (pago.email = c.email OR pago.telefone = c.telefone) LIMIT 1
           ) AS tem_compra,
           EXISTS (
             SELECT 1 FROM descadastros d
              WHERE d.email IN (SELECT o.email FROM carrinhos o WHERE o.telefone = c.telefone OR o.email = c.email)
              LIMIT 1
           ) AS descadastrado,
           (SELECT ${SQL_MENSAGENS} FROM lembretes_enviados l
             WHERE l.carrinho_id = c.id AND l.canal = 'whatsapp') AS mensagens,
           (SELECT group_concat(l.enviado_em, ';') FROM lembretes_enviados l
              JOIN carrinhos o ON o.id = l.carrinho_id
             WHERE l.canal = 'email' AND o.email = c.email) AS emails_enviados,
           (SELECT group_concat(o.proximo_email_em, ';') FROM carrinhos o
             WHERE o.email = c.email AND o.status = 'lembrado' AND o.finalizado_em IS NULL
               AND o.etapa_email < 4) AS emails_previstos
      FROM carrinhos c
     WHERE c.teste = 0 AND c.whatsapp_enviado_em IS NOT NULL
       AND c.whatsapp_encerrado_em IS NULL
       AND c.whatsapp_etapa BETWEEN 1 AND ${TOTAL_MENSAGENS - 1}
       AND c.proximo_whatsapp_em <= ?
       AND (? IS NULL OR c.telefone = ?)
     ORDER BY c.proximo_whatsapp_em ASC, c.id ASC
     LIMIT ${POR_RODADA}`).bind(agoraSql, soTelefone, soTelefone).all()
  return linhas(resultado)
}

export function diasDeEmailDaLinha(linha) {
  const datas = [
    ...String(linha.emails_enviados || '').split(';'),
    ...String(linha.emails_previstos || '').split(';'),
  ].filter(Boolean)
  return diasDeEmail(datas)
}

// Compra, descadastro ou sequência deste telefone/e-mail nos últimos 60 dias
// (rodando ou encerrada) impedem a 1ª mensagem. `id` é o próprio carrinho: a
// reserva dele feita por outra rodada (que pode devolver a vaga) não conta.
export async function impedimentos(db, email, telefone, agoraSql, id = '') {
  const linha = await db.prepare(`
    SELECT
      EXISTS(SELECT 1 FROM contatos_teste
        WHERE (tipo = 'email' AND valor = ?) OR (tipo = 'telefone' AND valor = ?) LIMIT 1) AS teste,
      EXISTS(
        SELECT 1 FROM compras p JOIN clientes c ON c.id = p.cliente_id
         WHERE p.status = 'pago' AND c.email = ? LIMIT 1
      ) AS tem_compra,
      EXISTS(SELECT 1 FROM descadastros d WHERE d.email = ? LIMIT 1) AS descadastrado,
      EXISTS(
        SELECT 1 FROM carrinhos outro
         WHERE (outro.telefone = ? OR outro.email = ?)
           AND outro.id <> ?
           AND outro.whatsapp_enviado_em IS NOT NULL
           AND (outro.whatsapp_encerrado_em IS NULL
                OR outro.whatsapp_encerrado_em > datetime(?, '-${DIAS_SEM_NOVA_SEQUENCIA} days'))
         LIMIT 1
      ) AS ja_enviado
    LIMIT 1`).bind(email, telefone, email, email, telefone, email, id, agoraSql).first()
  return {
    teste: Boolean(Number(linha?.teste || 0)),
    temCompra: Boolean(Number(linha?.tem_compra || 0)),
    descadastrado: Boolean(Number(linha?.descadastrado || 0)),
    jaEnviado: Boolean(Number(linha?.ja_enviado || 0)),
  }
}

// Marca para nunca mais tentar a 1ª deste carrinho (bloqueado ou falhou).
export async function naoTentarDeNovo(db, id) {
  await db.prepare(`
    UPDATE carrinhos SET whatsapp_falhou_em = datetime('now')
     WHERE id = ? AND teste = 0 AND whatsapp_encerrado_em IS NULL AND whatsapp_enviado_em IS NULL AND whatsapp_falhou_em IS NULL`).bind(id).run()
}

// Reserva atômica da 1ª: a linha em lembretes_enviados é a vaga. O teto do
// dia e a regra de uma sequência por telefone/e-mail ficam no próprio INSERT,
// então duas rodadas ao mesmo tempo não mandam duas vezes nem passam do teto.
export async function reservarPrimeira(db, carrinho, modelo, tetoDia, agoraSql) {
  const reserva = await db.prepare(`
    INSERT OR IGNORE INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em, modelo)
    SELECT c.id, 'whatsapp', 1, ?, ?
      FROM carrinhos c
     WHERE c.id = ? AND c.teste = 0
       AND c.whatsapp_encerrado_em IS NULL
       AND NOT EXISTS (SELECT 1 FROM contatos_teste t WHERE t.valor = c.email OR t.valor = c.telefone LIMIT 1)
       AND c.whatsapp_enviado_em IS NULL
       AND c.whatsapp_falhou_em IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM lembretes_enviados l JOIN carrinhos outro ON outro.id = l.carrinho_id
          WHERE l.canal = 'whatsapp' AND l.etapa = 1
            AND (outro.telefone = ? OR outro.email = ?)
            AND (outro.whatsapp_encerrado_em IS NULL
                 OR outro.whatsapp_encerrado_em > datetime(?, '-${DIAS_SEM_NOVA_SEQUENCIA} days'))
          LIMIT 1
       )
       AND (
         SELECT COUNT(*) FROM lembretes_enviados
          WHERE canal = 'whatsapp' AND enviado_em >= datetime(?, 'start of day')
       ) < ?`).bind(agoraSql, modelo, carrinho.id, carrinho.telefone, carrinho.email, agoraSql, agoraSql, tetoDia).run()
  if (mudancas(reserva) !== 1) return false

  // A 2ª fica para uma semana depois (a gestão e a rodada ajustam o horário
  // e o dia de e-mail quando chegar a vez).
  const marcado = await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_enviado_em = ?, whatsapp_etapa = 1,
           proximo_whatsapp_em = datetime(?, '+7 days'),
           whatsapp_encerrado_em = NULL, whatsapp_motivo = NULL
     WHERE id = ? AND teste = 0 AND whatsapp_encerrado_em IS NULL AND whatsapp_enviado_em IS NULL`).bind(agoraSql, agoraSql, carrinho.id).run()
  if (mudancas(marcado) === 1) return true

  await apagarReserva(db, carrinho.id, 1)
  return false
}

async function apagarReserva(db, id, etapa) {
  await db.prepare(`
    DELETE FROM lembretes_enviados WHERE carrinho_id = ? AND canal = 'whatsapp' AND etapa = ?`).bind(id, etapa).run()
}

// Token ou acesso recusado na 1ª: desfaz a vaga e o carrinho volta para a
// fila (a busca já respeita as 48 h e o horário).
export async function devolverPrimeira(db, id) {
  await apagarReserva(db, id, 1)
  await db.prepare(`
    UPDATE carrinhos SET whatsapp_enviado_em = NULL, whatsapp_etapa = 0, proximo_whatsapp_em = NULL
     WHERE id = ? AND whatsapp_etapa = 1`).bind(id).run()
}

// A 1ª não saiu: o carrinho não entra na sequência e não tenta de novo.
export async function registrarFalhaDaPrimeira(db, id, codigo) {
  await apagarReserva(db, id, 1)
  await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_enviado_em = NULL,
           whatsapp_etapa = 0,
           proximo_whatsapp_em = NULL,
           whatsapp_falhou_em = datetime('now'),
           whatsapp_status = 'failed',
           whatsapp_erro = ?
     WHERE id = ?`).bind(codigo == null ? null : String(codigo), id).run()
}

export async function encerrar(db, id, motivo, agoraSql) {
  const feito = await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_encerrado_em = ?, whatsapp_motivo = ?, proximo_whatsapp_em = NULL
     WHERE id = ? AND whatsapp_encerrado_em IS NULL`).bind(agoraSql, motivo, id).run()
  return mudancas(feito) === 1
}

// Varredura barata a cada rodada: quem comprou ou pediu para sair (por
// e-mail ou WhatsApp) para na hora, mesmo sem a próxima ter vencido.
export async function encerrarPorCompraOuSaida(db, agoraSql, logger) {
  const testes = await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_encerrado_em = ?, whatsapp_motivo = 'teste', proximo_whatsapp_em = NULL
     WHERE whatsapp_encerrado_em IS NULL
       AND (teste = 1 OR EXISTS(SELECT 1 FROM contatos_teste t
         WHERE (t.tipo = 'email' AND t.valor = carrinhos.email)
            OR (t.tipo = 'telefone' AND t.valor = carrinhos.telefone) LIMIT 1))`).bind(agoraSql).run()
  if (mudancas(testes)) logger.log(`whatsapp pulado (teste) ${mudancas(testes)} carrinhos`)

  const compra = await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_encerrado_em = ?, whatsapp_motivo = 'comprou', proximo_whatsapp_em = NULL
     WHERE whatsapp_enviado_em IS NOT NULL AND whatsapp_encerrado_em IS NULL
       AND (
         EXISTS (SELECT 1 FROM compras p JOIN clientes cl ON cl.id = p.cliente_id
                  WHERE p.status = 'pago' AND cl.email = carrinhos.email LIMIT 1)
         OR EXISTS (SELECT 1 FROM carrinhos pago
                     WHERE pago.status = 'pago'
                       AND (pago.email = carrinhos.email OR pago.telefone = carrinhos.telefone) LIMIT 1)
       )`).bind(agoraSql).run()
  const saida = await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_encerrado_em = ?, whatsapp_motivo = 'descadastro', proximo_whatsapp_em = NULL
     WHERE whatsapp_enviado_em IS NOT NULL AND whatsapp_encerrado_em IS NULL
       AND EXISTS (
         SELECT 1 FROM descadastros d
          WHERE d.email IN (SELECT o.email FROM carrinhos o
                             WHERE o.telefone = carrinhos.telefone OR o.email = carrinhos.email)
          LIMIT 1
       )`).bind(agoraSql).run()
  return mudancas(compra) + mudancas(saida)
}

// Reserva atômica da mensagem `etapa` (2 a 9) de uma sequência.
export async function reservarSeguinte(db, carrinho, etapa, modelo, proximaEm, tetoDia, agoraSql) {
  const reserva = await db.prepare(`
    INSERT OR IGNORE INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em, modelo)
    SELECT c.id, 'whatsapp', ?, ?, ?
      FROM carrinhos c
     WHERE c.id = ? AND c.teste = 0
       AND c.whatsapp_encerrado_em IS NULL
       AND NOT EXISTS (SELECT 1 FROM contatos_teste t WHERE t.valor = c.email OR t.valor = c.telefone LIMIT 1)
       AND c.whatsapp_etapa = ?
       AND c.proximo_whatsapp_em <= ?
       AND (
         SELECT COUNT(*) FROM lembretes_enviados
          WHERE canal = 'whatsapp' AND enviado_em >= datetime(?, 'start of day')
       ) < ?`).bind(etapa, agoraSql, modelo, carrinho.id, etapa - 1, agoraSql, agoraSql, tetoDia).run()
  if (mudancas(reserva) !== 1) return false

  const fim = etapa >= TOTAL_MENSAGENS
  const marcado = await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_etapa = ?,
           proximo_whatsapp_em = ?,
           whatsapp_encerrado_em = CASE WHEN ? THEN ? ELSE NULL END,
           whatsapp_motivo = CASE WHEN ? THEN 'fim' ELSE NULL END
     WHERE id = ? AND whatsapp_etapa = ? AND whatsapp_encerrado_em IS NULL`).bind(
    etapa,
    fim ? null : proximaEm,
    fim ? 1 : 0,
    agoraSql,
    fim ? 1 : 0,
    carrinho.id,
    etapa - 1
  ).run()
  if (mudancas(marcado) === 1) return true

  await apagarReserva(db, carrinho.id, etapa)
  return false
}

// Erro da conta (não da pessoa): desfaz a vaga e a mensagem fica para amanhã.
// O 'fim' foi gravado pela própria reserva da última; outro motivo (SAIR,
// compra, teste) continua valendo.
export async function adiarSeguinte(db, carrinho, etapa, novaVez) {
  await apagarReserva(db, carrinho.id, etapa)
  await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_etapa = ?, proximo_whatsapp_em = ?, whatsapp_encerrado_em = NULL, whatsapp_motivo = NULL
     WHERE id = ? AND whatsapp_etapa = ? AND teste = 0
       AND (whatsapp_motivo IS NULL OR whatsapp_motivo = 'fim')`).bind(etapa - 1, novaVez, carrinho.id, etapa).run()
}

export async function gravarEnvio(db, carrinhoId, etapa, msgId, agoraSql) {
  await db.prepare(`
    UPDATE lembretes_enviados SET wa_msg_id = ?, wa_status = 'sent', wa_status_em = ?
     WHERE carrinho_id = ? AND canal = 'whatsapp' AND etapa = ?`).bind(msgId, agoraSql, carrinhoId, etapa).run()
}

export async function gravarFalha(db, carrinhoId, etapa, codigo, agoraSql) {
  await db.prepare(`
    UPDATE lembretes_enviados SET wa_status = 'failed', wa_status_em = ?, wa_erro = ?
     WHERE carrinho_id = ? AND canal = 'whatsapp' AND etapa = ?`).bind(
    agoraSql,
    codigo == null ? null : String(codigo),
    carrinhoId,
    etapa
  ).run()
}
