import { escapeHtml } from '../../lib/safe.js'
import { normalizarEmailLembrete } from '../../lib/lembrete-assinatura.js'
import {
  assinaturaValida,
  chamarMeta,
  configuracaoMeta,
  pedidoDeSaida,
  pedidoModelo,
  pedidoTexto,
  telefoneSemPais,
  textoIgual,
} from '../../lib/whatsapp-meta.js'
import {
  SQL_MENSAGENS,
  TOTAL_MENSAGENS,
  ajustarHorario,
  baseDaSeguinte,
  conteudoDoLink,
  deSql,
  dentroDoHorario,
  diasDeEmail,
  escolherModelo,
  lerMensagens,
  paradaPelaEntrega,
  paraSql,
} from '../../lib/whatsapp-sequencia.js'
import {
  CAMINHO_LINK_WHATSAPP,
  atenderLink,
  modelosDaSequencia,
  prepararLigacao,
  resumoDoDia,
  testeNaoEntregue,
  tetoDoDia,
} from './whatsapp-estado.js'

export { dentroDoHorario }

// WhatsApp da recuperação de carrinho pela API oficial da Meta, em sequência
// (plano A, 04/10/2026): a 1ª 3 h depois do carrinho, depois 1 por semana até
// 9 por pessoa, só das 9h às 19h59 de Brasília. Uma sequência por telefone.
// Para quando a pessoa compra, pede para sair, responde, não recebe as 2
// últimas ou não lê as 3 últimas. Independente do e-mail: um erro aqui não
// para o e-mail, e o 'ignorado' do e-mail não impede o WhatsApp.

const POR_RODADA = 20
const LIMITE_CORPO = 256 * 1024
const CONFIRMACAO_SAIDA = 'Pronto, você não vai mais receber lembretes.'
const DIAS_SEM_NOVA_SEQUENCIA = 60

// Erros da Meta que dizem respeito ao número da pessoa (sem WhatsApp, parou
// de aceitar marketing...): a mensagem conta como não entregue. Os outros
// (cartão, token, modelo, Meta fora do ar) são da conta: a vez fica para
// amanhã e a pessoa não é prejudicada.
const ERROS_DA_PESSOA = new Set([131026, 131049, 131050, 131021])

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

function mudancas(resultado) {
  return Number(resultado?.meta?.changes ?? resultado?.changes ?? 0)
}

function limite(valor, padrao) {
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : padrao
}

export function mascararTelefone(telefone) {
  const numero = String(telefone || '')
  return `${numero.slice(0, 2)}*****${numero.slice(-4)}`
}

// ---------------------------------------------------------------- envio ----
// As datas do envio usam o relógio da rodada (agora), gravado como texto UTC.

async function contarEnviosHoje(db, agoraSql) {
  const linha = await db.prepare(`
    SELECT COUNT(*) AS total
      FROM lembretes_enviados
     WHERE canal = 'whatsapp'
       AND enviado_em >= datetime(?, 'start of day')
     LIMIT 1`).bind(agoraSql).first()
  return Number(linha?.total || 0)
}

// Carrinhos esperando a 1ª mensagem: 3 h a 48 h de idade, ainda sem compra.
async function buscarPrimeiras(db, soTelefone, agoraSql) {
  const resultado = await db.prepare(`
    SELECT id, email, nome, telefone, datetime(criado_em, '+3 hours') AS vez_em
      FROM carrinhos
     WHERE telefone IS NOT NULL
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
async function buscarSeguintes(db, soTelefone, agoraSql) {
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
     WHERE c.whatsapp_enviado_em IS NOT NULL
       AND c.whatsapp_encerrado_em IS NULL
       AND c.whatsapp_etapa BETWEEN 1 AND ${TOTAL_MENSAGENS - 1}
       AND c.proximo_whatsapp_em <= ?
       AND (? IS NULL OR c.telefone = ?)
     ORDER BY c.proximo_whatsapp_em ASC, c.id ASC
     LIMIT ${POR_RODADA}`).bind(agoraSql, soTelefone, soTelefone).all()
  return linhas(resultado)
}

function diasDeEmailDaLinha(linha) {
  const datas = [
    ...String(linha.emails_enviados || '').split(';'),
    ...String(linha.emails_previstos || '').split(';'),
  ].filter(Boolean)
  return diasDeEmail(datas)
}

// Compra, descadastro ou sequência deste telefone/e-mail nos últimos 60 dias
// (rodando ou encerrada) impedem a 1ª mensagem.
async function impedimentos(db, email, telefone, agoraSql) {
  const linha = await db.prepare(`
    SELECT
      EXISTS(
        SELECT 1 FROM compras p JOIN clientes c ON c.id = p.cliente_id
         WHERE p.status = 'pago' AND c.email = ? LIMIT 1
      ) AS tem_compra,
      EXISTS(SELECT 1 FROM descadastros d WHERE d.email = ? LIMIT 1) AS descadastrado,
      EXISTS(
        SELECT 1 FROM carrinhos outro
         WHERE (outro.telefone = ? OR outro.email = ?)
           AND outro.whatsapp_enviado_em IS NOT NULL
           AND (outro.whatsapp_encerrado_em IS NULL
                OR outro.whatsapp_encerrado_em > datetime(?, '-${DIAS_SEM_NOVA_SEQUENCIA} days'))
         LIMIT 1
      ) AS ja_enviado
    LIMIT 1`).bind(email, email, telefone, email, agoraSql).first()
  return {
    temCompra: Boolean(Number(linha?.tem_compra || 0)),
    descadastrado: Boolean(Number(linha?.descadastrado || 0)),
    jaEnviado: Boolean(Number(linha?.ja_enviado || 0)),
  }
}

// Marca para nunca mais tentar a 1ª deste carrinho (bloqueado ou falhou).
async function naoTentarDeNovo(db, id) {
  await db.prepare(`
    UPDATE carrinhos SET whatsapp_falhou_em = datetime('now')
     WHERE id = ? AND whatsapp_enviado_em IS NULL AND whatsapp_falhou_em IS NULL`).bind(id).run()
}

// Reserva atômica da 1ª: a linha em lembretes_enviados é a vaga. O teto do
// dia e a regra de uma sequência por telefone/e-mail ficam no próprio INSERT,
// então duas rodadas ao mesmo tempo não mandam duas vezes nem passam do teto.
async function reservarPrimeira(db, carrinho, modelo, tetoDia, agoraSql) {
  const reserva = await db.prepare(`
    INSERT OR IGNORE INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em, modelo)
    SELECT c.id, 'whatsapp', 1, ?, ?
      FROM carrinhos c
     WHERE c.id = ?
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
     WHERE id = ? AND whatsapp_enviado_em IS NULL`).bind(agoraSql, agoraSql, carrinho.id).run()
  if (mudancas(marcado) === 1) return true

  await apagarReserva(db, carrinho.id, 1)
  return false
}

async function apagarReserva(db, id, etapa) {
  await db.prepare(`
    DELETE FROM lembretes_enviados WHERE carrinho_id = ? AND canal = 'whatsapp' AND etapa = ?`).bind(id, etapa).run()
}

// A 1ª não saiu: o carrinho não entra na sequência e não tenta de novo.
async function registrarFalhaDaPrimeira(db, id, codigo) {
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

async function encerrar(db, id, motivo, agoraSql) {
  const feito = await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_encerrado_em = ?, whatsapp_motivo = ?, proximo_whatsapp_em = NULL
     WHERE id = ? AND whatsapp_encerrado_em IS NULL`).bind(agoraSql, motivo, id).run()
  return mudancas(feito) === 1
}

// Varredura barata a cada rodada: quem comprou ou pediu para sair (por
// e-mail ou WhatsApp) para na hora, mesmo sem a próxima ter vencido.
async function encerrarPorCompraOuSaida(db, agoraSql) {
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
async function reservarSeguinte(db, carrinho, etapa, modelo, proximaEm, tetoDia, agoraSql) {
  const reserva = await db.prepare(`
    INSERT OR IGNORE INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em, modelo)
    SELECT c.id, 'whatsapp', ?, ?, ?
      FROM carrinhos c
     WHERE c.id = ?
       AND c.whatsapp_etapa = ?
       AND c.whatsapp_encerrado_em IS NULL
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
async function adiarSeguinte(db, carrinho, etapa, novaVez) {
  await apagarReserva(db, carrinho.id, etapa)
  await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_etapa = ?, proximo_whatsapp_em = ?, whatsapp_encerrado_em = NULL, whatsapp_motivo = NULL
     WHERE id = ? AND whatsapp_etapa = ?`).bind(etapa - 1, novaVez, carrinho.id, etapa).run()
}

async function gravarEnvio(db, carrinhoId, etapa, msgId, agoraSql) {
  await db.prepare(`
    UPDATE lembretes_enviados SET wa_msg_id = ?, wa_status = 'sent', wa_status_em = ?
     WHERE carrinho_id = ? AND canal = 'whatsapp' AND etapa = ?`).bind(msgId, agoraSql, carrinhoId, etapa).run()
}

async function gravarFalha(db, carrinhoId, etapa, codigo, agoraSql) {
  await db.prepare(`
    UPDATE lembretes_enviados SET wa_status = 'failed', wa_status_em = ?, wa_erro = ?
     WHERE carrinho_id = ? AND canal = 'whatsapp' AND etapa = ?`).bind(
    agoraSql,
    codigo == null ? null : String(codigo),
    carrinhoId,
    etapa
  ).run()
}

export async function executarWhatsapp(env, opcoes = {}) {
  const resultado = { enviados: 0, ignorados: 0, falhas: 0 }
  const modo = String(env.WA_MODO || 'teste').toLowerCase()
  if (modo !== 'teste' && modo !== 'ativo') return resultado
  const logger = opcoes.logger || console

  // Sem número ou token, o WhatsApp simplesmente não roda (o e-mail segue).
  if (!configuracaoMeta(env).ok) return resultado

  const db = env.DB
  if (!db) throw new Error('Binding DB não configurado.')
  const fetchImpl = opcoes.fetchImpl || globalThis.fetch
  const agora = new Date(opcoes.agora || new Date())
  const agoraSql = paraSql(agora)
  const dentro = dentroDoHorario(agora)

  // Até o Paulo tocar em LIGAR, nenhum cliente recebe: o robô só confere o
  // modelo na Meta e, aprovado, manda o teste para o celular dele.
  const estado = await prepararLigacao(db, env, { dentroDoHorario: dentro, fetchImpl, logger })
  if (estado.estado !== 'ativo') return resultado
  await resumoDoDia(db, env, agora, fetchImpl, logger)
  await encerrarPorCompraOuSaida(db, agoraSql)
  if (!dentro) return resultado

  const tetoDia = tetoDoDia(estado, limite(env.WA_TETO_DIA, 30))
  let enviadosHoje = await contarEnviosHoje(db, agoraSql)
  if (enviadosHoje >= tetoDia) return resultado

  // No modo teste a busca já filtra o celular de teste: carrinhos reais não
  // ocupam as vagas da rodada. Sem celular de teste, não envia nada.
  const soTelefone = modo === 'teste' ? telefoneSemPais(env.WA_TESTE_PARA) || '-' : null

  // Fila única por ordem de vez (1ªs e semanais juntas): quem passou do teto
  // ontem sai primeiro hoje.
  const fila = [
    ...(await buscarSeguintes(db, soTelefone, agoraSql)).map((c) => ({ ...c, seguinte: true })),
    ...(await buscarPrimeiras(db, soTelefone, agoraSql)),
  ].sort((a, b) => String(a.vez_em).localeCompare(String(b.vez_em)))
  if (!fila.length) return resultado

  // Só consulta os modelos na Meta quando há o que enviar.
  const modelos = await modelosDaSequencia(db, env, fetchImpl, logger)
  const aprovados = new Set([...modelos].filter(([, m]) => m.status === 'APPROVED').map(([nome]) => nome))

  for (const carrinho of fila) {
    if (enviadosHoje >= tetoDia) break
    const email = normalizarEmailLembrete(carrinho.email)

    if (carrinho.seguinte) {
      const r = await seguinte(db, env, { ...carrinho, email }, { agora, agoraSql, tetoDia, aprovados, modelos, fetchImpl, logger })
      if (r === 'enviado') {
        enviadosHoje += 1
        resultado.enviados += 1
      } else if (r === 'falhou') {
        enviadosHoje += 1
        resultado.falhas += 1
      } else if (r === 'sem_vaga') {
        enviadosHoje = await contarEnviosHoje(db, agoraSql)
      } else if (r === 'erro_da_conta') {
        // Cartão, token, modelo: as outras também falhariam. Para a rodada.
        resultado.falhas += 1
        break
      } else if (r === 'encerrado') {
        resultado.ignorados += 1
      }
      continue
    }

    const bloqueio = await impedimentos(db, email, carrinho.telefone, agoraSql)
    if (bloqueio.temCompra || bloqueio.descadastrado || bloqueio.jaEnviado) {
      await naoTentarDeNovo(db, carrinho.id)
      resultado.ignorados += 1
      continue
    }

    const modelo = escolherModelo(1, aprovados)
    if (!(await reservarPrimeira(db, { ...carrinho, email }, modelo, tetoDia, agoraSql))) {
      enviadosHoje = await contarEnviosHoje(db, agoraSql)
      continue
    }

    try {
      const id = await chamarMeta(
        env,
        pedidoModelo({
          telefone: carrinho.telefone,
          nome: carrinho.nome,
          carrinhoId: carrinho.id,
          conteudo: conteudoDoLink(1),
          modelo,
          botaoUrl: modelos.get(modelo)?.botaoUrl,
        }, env),
        fetchImpl
      )
      await gravarEnvio(db, carrinho.id, 1, id, agoraSql)
      enviadosHoje += 1
      resultado.enviados += 1
    } catch (erro) {
      // Sem repetir: uma falha na 1ª marca o carrinho e ele não volta para a fila.
      resultado.falhas += 1
      logger.error(
        `WhatsApp não enviado para ${mascararTelefone(carrinho.telefone)} (carrinho ${carrinho.id}):`,
        erro?.message || erro
      )
      try {
        await registrarFalhaDaPrimeira(db, carrinho.id, erro?.codigo)
      } catch (erroBanco) {
        logger.error(`Falha ao registrar o erro do WhatsApp do carrinho ${carrinho.id}:`, erroBanco)
      }
    }
  }

  return resultado
}

// Uma mensagem semanal (2ª a 9ª). Devolve o que aconteceu: 'enviado',
// 'falhou' (erro da pessoa, conta como não entregue), 'erro_da_conta',
// 'encerrado', 'adiado' ou 'sem_vaga'.
async function seguinte(db, env, carrinho, { agora, agoraSql, tetoDia, aprovados, modelos, fetchImpl, logger }) {
  if (Number(carrinho.tem_compra || 0)) {
    await encerrar(db, carrinho.id, 'comprou', agoraSql)
    return 'encerrado'
  }
  if (Number(carrinho.descadastrado || 0)) {
    await encerrar(db, carrinho.id, 'descadastro', agoraSql)
    return 'encerrado'
  }
  const mensagens = lerMensagens(carrinho.mensagens)
  const parada = paradaPelaEntrega(mensagens, agora)
  if (parada) {
    await encerrar(db, carrinho.id, parada, agoraSql)
    return 'encerrado'
  }

  // Hoje tem e-mail para a pessoa (enviado ou previsto)? Fica para o
  // primeiro horário livre, e a rodada não pergunta de novo até lá.
  const dias = diasDeEmailDaLinha(carrinho)
  const vez = ajustarHorario(agora, dias)
  if (vez.getTime() > agora.getTime()) {
    await db.prepare(`
      UPDATE carrinhos SET proximo_whatsapp_em = ?
       WHERE id = ? AND whatsapp_etapa = ? AND whatsapp_encerrado_em IS NULL`).bind(
      paraSql(vez),
      carrinho.id,
      Number(carrinho.whatsapp_etapa)
    ).run()
    return 'adiado'
  }

  const etapa = Number(carrinho.whatsapp_etapa) + 1
  const modelo = escolherModelo(etapa, aprovados)
  const inicio = deSql(carrinho.whatsapp_enviado_em) || agora
  const proximaEm = paraSql(ajustarHorario(baseDaSeguinte(inicio, etapa, agora), dias))
  if (!(await reservarSeguinte(db, carrinho, etapa, modelo, proximaEm, tetoDia, agoraSql))) return 'sem_vaga'

  try {
    const id = await chamarMeta(
      env,
      pedidoModelo({
        telefone: carrinho.telefone,
        nome: carrinho.nome,
        carrinhoId: carrinho.id,
        conteudo: conteudoDoLink(etapa),
        modelo,
        botaoUrl: modelos.get(modelo)?.botaoUrl,
      }, env),
      fetchImpl
    )
    await gravarEnvio(db, carrinho.id, etapa, id, agoraSql)
    return 'enviado'
  } catch (erro) {
    const codigo = Number(erro?.codigo)
    logger.error(
      `WhatsApp ${etapa}ª não enviado para ${mascararTelefone(carrinho.telefone)} (carrinho ${carrinho.id}):`,
      erro?.message || erro
    )
    try {
      if (ERROS_DA_PESSOA.has(codigo)) {
        await gravarFalha(db, carrinho.id, etapa, erro?.codigo, agoraSql)
        return 'falhou'
      }
      const amanha = ajustarHorario(new Date(agora.getTime() + 24 * 3600000), dias)
      await adiarSeguinte(db, carrinho, etapa, paraSql(amanha))
    } catch (erroBanco) {
      logger.error(`Falha ao registrar o erro do WhatsApp do carrinho ${carrinho.id}:`, erroBanco)
    }
    return 'erro_da_conta'
  }
}

// -------------------------------------------------------------- webhook ----

function textoDaMensagem(mensagem) {
  if (mensagem?.type === 'text') return String(mensagem.text?.body || '')
  if (mensagem?.type === 'button') return String(mensagem.button?.text || mensagem.button?.payload || '')
  if (mensagem?.type === 'interactive') {
    return String(
      mensagem.interactive?.button_reply?.title || mensagem.interactive?.list_reply?.title || ''
    )
  }
  return `[${String(mensagem?.type || 'mensagem')}]`
}

const ORDEM_STATUS = { sent: 1, delivered: 2, read: 3 }

// Hora do aviso (a Meta manda em segundos desde 1970); sem ela, agora.
function horaDoAviso(aviso) {
  const segundos = Number(aviso?.timestamp)
  return Number.isFinite(segundos) && segundos > 0 ? paraSql(new Date(segundos * 1000)) : paraSql(new Date())
}

// Atualiza o status de cada mensagem da sequência sem regredir (lida não
// volta para entregue) e guarda a hora (ex.: quando leu). 'failed' só vale
// enquanto a mensagem não foi entregue.
async function atualizarStatus(db, aviso) {
  const status = String(aviso?.status || '')
  const id = String(aviso?.id || '')
  if (!id) return
  const em = horaDoAviso(aviso)
  if (status === 'failed') {
    const codigo = Array.isArray(aviso?.errors) ? aviso.errors[0]?.code : null
    await db.prepare(`
      UPDATE lembretes_enviados SET wa_status = 'failed', wa_erro = ?, wa_status_em = ?
       WHERE wa_msg_id = ? AND COALESCE(wa_status, 'sent') = 'sent'`).bind(codigo == null ? null : String(codigo), em, id).run()
    return
  }
  const ordem = ORDEM_STATUS[status]
  if (!ordem) return
  await db.prepare(`
    UPDATE lembretes_enviados SET wa_status = ?, wa_status_em = ?
     WHERE wa_msg_id = ?
       AND (CASE COALESCE(wa_status, '')
              WHEN 'sent' THEN 1 WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 ELSE 0 END) < ?`).bind(status, em, id, ordem).run()
}

// A pessoa escreveu: a sequência deste telefone para na hora. Pedido de saída
// encerra; qualquer outra resposta vira conversa (pausa que a gestão retoma).
async function pararPelaResposta(db, telefone, motivo) {
  await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_encerrado_em = datetime('now'), whatsapp_motivo = ?, proximo_whatsapp_em = NULL
     WHERE telefone = ? AND whatsapp_enviado_em IS NOT NULL AND whatsapp_encerrado_em IS NULL`).bind(motivo, telefone).run()
}

async function guardarMensagem(db, { waId, telefone, nome, direcao, texto, enviadoPor = null }) {
  const resultado = await db.prepare(`
    INSERT OR IGNORE INTO whatsapp_mensagens (wa_msg_id, telefone, nome_perfil, direcao, texto, enviado_por)
    VALUES (?, ?, ?, ?, ?, ?)`).bind(
    waId || null,
    telefone,
    nome ? String(nome).slice(0, 80) : null,
    direcao,
    String(texto || '').slice(0, 4000),
    enviadoPor
  ).run()
  return mudancas(resultado) === 1
}

async function encaminharPorEmail(env, { nome, telefone, texto, estrangeiro = false }, fetchImpl) {
  const para = String(env.WA_ENCAMINHAR_PARA || env.LEMBRETE_BCC || '').trim()
  if (!para || !env.RESEND_API_KEY) return
  const quem = nome ? `${nome} (${telefone})` : telefone
  const comoResponder = estrangeiro
    ? 'Número de fora do Brasil: não entra na gestão do site. Responda direto pelo WhatsApp, se fizer sentido.'
    : 'Para responder, use a gestão do site: Recuperação → WhatsApp (até 24 h depois da mensagem).'
  const resposta = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [para],
      subject: `WhatsApp de ${quem}`.slice(0, 150),
      text: `${quem} escreveu no WhatsApp:\n\n${texto}\n\n${comoResponder}`,
      html: `<p><strong>${escapeHtml(quem)}</strong> escreveu no WhatsApp:</p><p style="white-space:pre-wrap">${escapeHtml(texto)}</p><p style="color:#5C5C5C">${escapeHtml(comoResponder)}</p>`,
    }),
  })
  if (!resposta.ok) throw new Error(`Resend respondeu com HTTP ${resposta.status}`)
}

async function tratarMensagem(db, env, mensagem, nomes, fetchImpl, logger) {
  const telefone = telefoneSemPais(mensagem?.from)
  if (!telefone) return
  const nome = nomes.get(String(mensagem.from)) || null
  const texto = textoDaMensagem(mensagem)

  // A gestão guarda o telefone sem o 55 e responde pondo o 55 de volta: um
  // número de fora (ex.: +1 631...) viraria um celular brasileiro qualquer.
  // Por isso ele só é encaminhado por e-mail, com o DDI.
  if (telefone === String(mensagem.from).replace(/\D/g, '')) {
    try {
      await encaminharPorEmail(env, { nome, telefone: `+${telefone}`, texto, estrangeiro: true }, fetchImpl)
    } catch (erro) {
      logger.error('Encaminhamento por e-mail falhou (número de fora do Brasil):', erro?.message || erro)
    }
    return
  }

  if (pedidoDeSaida(texto)) {
    // O descadastro vem ANTES de gravar a mensagem: se algo falhar no meio, a
    // Meta reenvia o aviso e o descadastro (que pode repetir) é refeito.
    const emails = linhas(
      await db.prepare(`SELECT DISTINCT email FROM carrinhos WHERE telefone = ? LIMIT 10`).bind(telefone).all()
    )
    for (const linha of emails) {
      await db.prepare(`INSERT OR IGNORE INTO descadastros (email, canal) VALUES (?, 'whatsapp')`).bind(linha.email).run()
    }
    await pararPelaResposta(db, telefone, 'descadastro')
    // O wa_msg_id é único: aviso repetido não manda a confirmação de novo.
    if (!(await guardarMensagem(db, { waId: mensagem.id, telefone, nome, direcao: 'entrada', texto }))) return
    try {
      const id = await chamarMeta(env, pedidoTexto(telefone, CONFIRMACAO_SAIDA), fetchImpl)
      await guardarMensagem(db, { waId: id, telefone, nome: null, direcao: 'saida', texto: CONFIRMACAO_SAIDA, enviadoPor: 'robô' })
    } catch (erro) {
      logger.error(`Confirmação de saída não enviada para ${mascararTelefone(telefone)}:`, erro?.message || erro)
    }
    return
  }

  // Antes de gravar: se algo falhar no meio, a Meta reenvia e a parada (que
  // pode repetir) é refeita.
  await pararPelaResposta(db, telefone, 'respondeu')
  // O wa_msg_id é único: aviso repetido da Meta não grava nem encaminha de novo.
  if (!(await guardarMensagem(db, { waId: mensagem.id, telefone, nome, direcao: 'entrada', texto }))) return
  try {
    await encaminharPorEmail(env, { nome, telefone, texto }, fetchImpl)
  } catch (erro) {
    // A mensagem já está gravada e aparece na gestão; só o aviso por e-mail falhou.
    logger.error(`Encaminhamento por e-mail falhou (${mascararTelefone(telefone)}):`, erro?.message || erro)
  }
}

async function processarAvisos(db, env, corpo, fetchImpl, logger) {
  for (const entrada of Array.isArray(corpo?.entry) ? corpo.entry : []) {
    for (const mudanca of Array.isArray(entrada?.changes) ? entrada.changes : []) {
      if (mudanca?.field !== 'messages') continue
      const valor = mudanca.value || {}
      // Só avisos do nosso número (o botão "Teste" do painel manda outro id).
      if (String(valor.metadata?.phone_number_id || '') !== String(env.WA_PHONE_NUMBER_ID || '')) continue
      const nomes = new Map(
        (Array.isArray(valor.contacts) ? valor.contacts : []).map((c) => [String(c?.wa_id || ''), c?.profile?.name || null])
      )
      for (const aviso of Array.isArray(valor.statuses) ? valor.statuses : []) {
        await atualizarStatus(db, aviso)
        if (aviso?.status === 'failed') await testeNaoEntregue(db, env, aviso, fetchImpl, logger)
      }
      for (const mensagem of Array.isArray(valor.messages) ? valor.messages : []) {
        await tratarMensagem(db, env, mensagem, nomes, fetchImpl, logger)
      }
    }
  }
}

const naoExiste = () => new Response(null, { status: 404 })

// Atende só /whatsapp. GET = verificação da Meta; POST = avisos assinados.
export async function atenderWebhook(request, env, opcoes = {}) {
  const url = new URL(request.url)
  if (url.pathname === CAMINHO_LINK_WHATSAPP) return atenderLink(request, env)
  if (url.pathname !== '/whatsapp') return naoExiste()
  const logger = opcoes.logger || console

  if (request.method === 'GET') {
    const modo = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const desafio = url.searchParams.get('hub.challenge') || ''
    if (modo === 'subscribe' && textoIgual(token, env.WA_VERIFY_TOKEN)) {
      return new Response(desafio, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }
    return naoExiste()
  }

  if (request.method !== 'POST' || !env.WA_APP_SECRET) return naoExiste()
  if (Number(request.headers.get('content-length') || 0) > LIMITE_CORPO) {
    return new Response(null, { status: 413 })
  }
  const corpoCru = await request.text()
  if (corpoCru.length > LIMITE_CORPO) return new Response(null, { status: 413 })
  if (!(await assinaturaValida(corpoCru, request.headers.get('x-hub-signature-256'), env.WA_APP_SECRET))) {
    return new Response(null, { status: 401 })
  }

  let corpo
  try {
    corpo = JSON.parse(corpoCru)
  } catch {
    return new Response('ok', { status: 200 })
  }

  try {
    if (!env.DB) throw new Error('Binding DB não configurado.')
    await processarAvisos(env.DB, env, corpo, opcoes.fetchImpl || globalThis.fetch, logger)
  } catch (erro) {
    // 500 faz a Meta reenviar o aviso; o wa_msg_id único impede duplicar.
    logger.error('Falha ao processar aviso do WhatsApp:', erro)
    return new Response(null, { status: 500 })
  }
  return new Response('ok', { status: 200 })
}
