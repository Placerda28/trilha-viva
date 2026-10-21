import { normalizarEmailLembrete } from '../../lib/lembrete-assinatura.js'
import {
  chamarMeta,
  configuracaoMeta,
  pedidoModelo,
  telefoneSemPais,
} from '../../lib/whatsapp-meta.js'
import {
  ajustarHorario,
  baseDaSeguinte,
  conteudoDoLink,
  deSql,
  dentroDoHorario,
  escolherModelo,
  lerMensagens,
  paradaPelaEntrega,
  paraSql,
} from '../../lib/whatsapp-sequencia.js'
import {
  avisarAcessoRecusado,
  erroDeAcesso,
  modelosDaSequencia,
  prepararLigacao,
  resumoDoDia,
  tetoDoDia,
} from './whatsapp-estado.js'
import {
  adiarSeguinte,
  buscarPrimeiras,
  buscarSeguintes,
  contarEnviosHoje,
  devolverPrimeira,
  diasDeEmailDaLinha,
  encerrar,
  encerrarPorCompraOuSaida,
  gravarEnvio,
  gravarFalha,
  impedimentos,
  mascararTelefone,
  naoTentarDeNovo,
  registrarFalhaDaPrimeira,
  reservarPrimeira,
  reservarSeguinte,
} from './whatsapp-banco.js'

export { dentroDoHorario }

// As consultas da sequência ficam em whatsapp-banco.js e o webhook em
// whatsapp-webhook.js; quem já importava daqui segue importando daqui.
export { mascararTelefone }
export { atenderWebhook } from './whatsapp-webhook.js'

// WhatsApp da recuperação de carrinho pela API oficial da Meta, em sequência
// (plano A, 04/10/2026): a 1ª 3 h depois do carrinho, depois 1 por semana até
// 9 por pessoa, só das 9h às 19h59 de Brasília. Uma sequência por telefone.
// Para quando a pessoa compra, pede para sair, responde, não recebe as 2
// últimas ou não lê as 3 últimas. Independente do e-mail: um erro aqui não
// para o e-mail, e o 'ignorado' do e-mail não impede o WhatsApp.

// Erros da Meta que dizem respeito ao número da pessoa (sem WhatsApp, parou
// de aceitar marketing...): a mensagem conta como não entregue. Os outros
// (cartão, token, modelo, Meta fora do ar) são da conta: a vez fica para
// amanhã e a pessoa não é prejudicada.
const ERROS_DA_PESSOA = new Set([131026, 131049, 131050, 131021])

function limite(valor, padrao) {
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : padrao
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
  await encerrarPorCompraOuSaida(db, agoraSql, logger)
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

    const bloqueio = await impedimentos(db, email, carrinho.telefone, agoraSql, carrinho.id)
    if (bloqueio.teste) {
      logger.log(`whatsapp pulado (teste) ${carrinho.id}`)
      await encerrar(db, carrinho.id, 'teste', agoraSql)
    }
    if (bloqueio.teste || bloqueio.temCompra || bloqueio.descadastrado || bloqueio.jaEnviado) {
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
      resultado.falhas += 1
      logger.error(
        `WhatsApp não enviado para ${mascararTelefone(carrinho.telefone)} (carrinho ${carrinho.id}):`,
        erro?.message || erro
      )
      // Token ou acesso recusado não é da pessoa: o carrinho volta para a
      // fila, o Paulo é avisado e a rodada para (as outras também falhariam).
      if (erroDeAcesso(erro?.codigo)) {
        try {
          await devolverPrimeira(db, carrinho.id)
          await avisarAcessoRecusado(db, env, erro.codigo, agora, fetchImpl, logger)
        } catch (erroBanco) {
          logger.error(`Falha ao devolver o WhatsApp do carrinho ${carrinho.id} para a fila:`, erroBanco)
        }
        break
      }
      // Os outros erros, sem repetir: o carrinho fica marcado e não volta para a fila.
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
  const bloqueio = await impedimentos(db, carrinho.email, carrinho.telefone, agoraSql)
  if (bloqueio.teste) {
    logger.log(`whatsapp pulado (teste) ${carrinho.id}`)
    await encerrar(db, carrinho.id, 'teste', agoraSql)
    return 'encerrado'
  }
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
      if (erroDeAcesso(codigo)) await avisarAcessoRecusado(db, env, codigo, agora, fetchImpl, logger)
    } catch (erroBanco) {
      logger.error(`Falha ao registrar o erro do WhatsApp do carrinho ${carrinho.id}:`, erroBanco)
    }
    return 'erro_da_conta'
  }
}
