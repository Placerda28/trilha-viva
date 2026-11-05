import { normalizarEmailLembrete } from '../../lib/lembrete-assinatura.js'
import { atenderWebhook, executarWhatsapp } from './whatsapp.js'
import { acompanharAcessoLiberado } from './acesso-liberado.js'
import { executarLeads } from './leads.js'
import { executarAfiliados } from './afiliados.js'
import { ORCAMENTO } from './afiliados.js'
import { adiar, adiados, cabe, consultasGastas, contarConsultas, restante } from './orcamento.js'
import { mascararEmail, montarEmail } from './email-lembrete.js'
import {
  buscarCandidatosIniciais,
  buscarSeguimentos,
  concluirSeguimento,
  contarEnvios,
  finalizar,
  ignorar,
  impedimentosIniciais,
  impedimentosSeguimento,
  registrarFalhaInicial,
  registrarFalhaSeguimento,
  reservarPrimeiro,
  reservarSeguimento,
} from './email-banco.js'

// O texto do e-mail fica em email-lembrete.js e as consultas da sequência em
// email-banco.js; quem já importava daqui segue importando daqui.
export { mascararEmail, montarEmail }

// Consultas ao D1 por carrinho: impedimentos 1 + reserva 2 (1ª) ou 1 + conclusão 1 (seguimento). Falha do Resend
// custa até 2 a mais; a margem da rodada cobre.
const CUSTO_EMAIL = 3
const CUSTO_ACESSO = 6 // conferência na Meta: consulta + gravação + (aprovado) teste

function limite(valor, padrao) {
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : padrao
}

async function enviarPeloResend(carrinho, etapa, env, fetchImpl) {
  const corpo = await montarEmail(carrinho, env, etapa)
  const resposta = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `${carrinho.id}:email:${etapa}`,
    },
    body: JSON.stringify(corpo),
  })
  if (!resposta.ok) throw new Error(`Resend respondeu com HTTP ${resposta.status}`)
}

async function executarRodadaEmail(env, opcoes = {}) {
  const db = env.DB
  const logger = opcoes.logger || console
  const fetchImpl = opcoes.fetchImpl || globalThis.fetch
  const tetoDia = limite(env.TETO_DIA, 40)
  const tetoMes = limite(env.TETO_MES, 1100)
  const modoAtivo = env.MODO === 'ativo'
  const testePara = normalizarEmailLembrete(env.TESTE_PARA)
  const resultado = { enviados: 0, ignorados: 0, apenasLog: 0 }

  if (!db) throw new Error('Binding DB não configurado.')
  if (!env.RESEND_API_KEY || !env.LEMBRETE_SEGREDO) {
    throw new Error('Segredos do lembrete não configurados.')
  }

  let contagem = await contarEnvios(db)
  if (contagem.dia >= tetoDia || contagem.mes >= tetoMes) return resultado

  if (modoAtivo) {
    await db.prepare(`
      UPDATE carrinhos
         SET status = 'ignorado'
       WHERE teste = 0 AND status = 'aberto'
         AND criado_em < datetime('now', '-48 hours')`).run()
  }

  const candidatos = await buscarCandidatosIniciais(db)
  let adiou = false
  for (const [i, carrinho] of candidatos.entries()) {
    if (contagem.dia >= tetoDia || contagem.mes >= tetoMes) break

    const email = normalizarEmailLembrete(carrinho.email)
    if (!modoAtivo && email !== testePara) {
      logger.log(`Carrinho ${carrinho.id} não enviado no modo teste: ${mascararEmail(email)}`)
      resultado.apenasLog += 1
      continue
    }
    if (!cabe(db, CUSTO_EMAIL)) {
      adiar(db, 'email', candidatos.length - i)
      adiou = true
      break
    }

    let reservado = false
    try {
      const bloqueios = await impedimentosIniciais(db, email, carrinho.telefone, carrinho.id)
      if (bloqueios.teste) logger.log(`lembrete pulado (teste) ${carrinho.id}`)
      if (bloqueios.teste || bloqueios.temCompra || bloqueios.jaLembrado || bloqueios.descadastrado) {
        await ignorar(db, carrinho.id)
        resultado.ignorados += 1
        continue
      }

      reservado = await reservarPrimeiro(db, carrinho.id, email, tetoDia, tetoMes)
      if (!reservado) {
        contagem = await contarEnvios(db)
        continue
      }

      await enviarPeloResend({ ...carrinho, email }, 1, env, fetchImpl)
      contagem.dia += 1
      contagem.mes += 1
      resultado.enviados += 1
    } catch (erro) {
      if (reservado) {
        try {
          await registrarFalhaInicial(db, carrinho.id)
        } catch (erroBanco) {
          logger.error(`Falha ao desfazer reserva do carrinho ${carrinho.id}:`, erroBanco)
        }
      }
      logger.error(`Falha no lembrete do carrinho ${carrinho.id}:`, erro)
    }
  }

  if (contagem.dia >= tetoDia || contagem.mes >= tetoMes || adiou) return resultado
  // Sem nem 1 consulta para ver a fila de seguimentos, não dá para saber quantos esperam: registra 1.
  if (!cabe(db, 1)) {
    adiar(db, 'email', 1)
    return resultado
  }

  const seguimentos = await buscarSeguimentos(db)
  for (const [i, carrinho] of seguimentos.entries()) {
    if (contagem.dia >= tetoDia || contagem.mes >= tetoMes) break

    const email = normalizarEmailLembrete(carrinho.email)
    if (!modoAtivo && email !== testePara) {
      logger.log(`Carrinho ${carrinho.id} não alterado no modo teste: ${mascararEmail(email)}`)
      resultado.apenasLog += 1
      continue
    }
    if (!cabe(db, CUSTO_EMAIL)) {
      adiar(db, 'email', seguimentos.length - i)
      break
    }

    const etapaAnterior = Number(carrinho.etapa_email || 0)
    try {
      const bloqueios = await impedimentosSeguimento(db, email, carrinho.telefone, carrinho.id)
      if (bloqueios.teste) {
        logger.log(`lembrete pulado (teste) ${carrinho.id}`)
        await finalizar(db, carrinho.id, 'teste')
        continue
      }
      if (bloqueios.temCompra) {
        await finalizar(db, carrinho.id, 'comprou')
        continue
      }
      if (bloqueios.descadastrado) {
        await finalizar(db, carrinho.id, 'descadastro')
        continue
      }
      if (etapaAnterior === 4) {
        await finalizar(db, carrinho.id, 'sequencia')
        continue
      }

      const etapa = etapaAnterior + 1
      const reservado = await reservarSeguimento(
        db,
        carrinho.id,
        etapaAnterior,
        etapa,
        tetoDia,
        tetoMes
      )
      if (!reservado) {
        contagem = await contarEnvios(db)
        continue
      }

      try {
        await enviarPeloResend({ ...carrinho, email }, etapa, env, fetchImpl)
      } catch (erro) {
        await registrarFalhaSeguimento(db, carrinho.id, etapaAnterior, etapa)
        throw erro
      }

      await concluirSeguimento(db, carrinho.id, etapaAnterior, etapa)
      contagem.dia += 1
      contagem.mes += 1
      resultado.enviados += 1
    } catch (erro) {
      logger.error(`Falha no lembrete do carrinho ${carrinho.id}:`, erro)
    }
  }

  return resultado
}

export { executarWhatsapp }

// UMA linha por rodada que adiou trabalho por falta de orçamento: o Painel geral conta estas linhas.
// Reaproveita a tabela `registro` (sem migração). Custa 1 consulta, coberta pela margem.
async function registrarLimite(db, logger) {
  const adiado = adiados(db)
  if (!db || !Object.keys(adiado).length) return
  const detalhe = JSON.stringify({ adiado, consultas: consultasGastas(db) })
  try {
    await db.prepare("INSERT INTO registro (quem, acao, alvo, detalhe) VALUES ('robo', 'robo_limite', ?, ?)")
      .bind(Object.keys(adiado).join(','), detalhe).run()
  } catch (erro) {
    logger.error('Falha ao registrar o limite de consultas da rodada:', erro?.message || erro)
  }
}

// Os dois canais são independentes: um erro no e-mail não impede o WhatsApp,
// e vice-versa.
export async function executarRodada(envOriginal, opcoes = {}) {
  // O D1 grátis aceita 50 consultas por invocação: conta tudo desde o início e repassa a todas as etapas.
  const env = envOriginal.DB ? { ...envOriginal, DB: contarConsultas(envOriginal.DB) } : envOriginal
  const logger = opcoes.logger || console
  const medidor = opcoes.medidor
  const marca = (etapa) => { if (medidor) (medidor.etapas ||= {})[etapa] = consultasGastas(env.DB) }
  let resultado = { enviados: 0, ignorados: 0, apenasLog: 0 }
  let erroEmail = null
  try {
    resultado = await executarRodadaEmail(env, opcoes)
  } catch (erro) {
    erroEmail = erro
  }
  marca('email')

  // A fila da VS grátis usa o mesmo cron, sem bloquear os outros canais.
  try {
    resultado.leads = await executarLeads(env, opcoes)
  } catch (erro) {
    logger.error('Falha na sequência de e-mails da VS grátis:', erro)
  }
  marca('leads')

  resultado.whatsapp = { enviados: 0, ignorados: 0, falhas: 0 }
  try {
    resultado.whatsapp = await executarWhatsapp(env, opcoes)
  } catch (erro) {
    logger.error('Falha na etapa de WhatsApp da rodada:', erro)
  }
  marca('whatsapp')

  // Modelo "acesso_liberado" na Meta (status, aviso e teste). Independente
  // dos lembretes: uma falha aqui não atrapalha nada.
  try {
    if (cabe(env.DB, CUSTO_ACESSO)) await acompanharAcessoLiberado(env, { db: env.DB, fetchImpl: opcoes.fetchImpl, logger })
    else if (env.WA_WABA_ID) adiar(env.DB, 'acesso', 1)
  } catch (erro) {
    logger.error('Falha ao acompanhar o modelo acesso_liberado:', erro)
  }
  marca('acesso')

  // Afiliados roda POR ÚLTIMO e usa só o que sobrou do orçamento de consultas (ver afiliados.js).
  const sobra = restante(env.DB)
  try {
    const af = await executarAfiliados(env, opcoes)
    // Só conta como limite do plano quando a sobra era menor que o teto próprio da etapa.
    const f = af?.fechamento
    if (af?.adiado) adiar(env.DB, 'afiliados', 1)
    else if (sobra < ORCAMENTO && (f?.adiado || f?.pendentes > 0 || f?.restam)) adiar(env.DB, 'afiliados', f.pendentes || 1)
  } catch (erro) {
    logger.error('Falha na etapa de afiliados da rodada:', erro)
  }
  marca('afiliados')
  if (medidor) medidor.total = consultasGastas(env.DB)
  await registrarLimite(env.DB, logger)

  if (erroEmail) throw erroEmail
  return resultado
}

export default {
  // Só o webhook do WhatsApp (/whatsapp). Qualquer outro endereço: 404.
  fetch(request, env) {
    return atenderWebhook(request, env)
  },

  scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      executarRodada(env).catch((erro) => {
        console.error('Falha na rodada de recuperação de carrinho:', erro)
      })
    )
  },
}
