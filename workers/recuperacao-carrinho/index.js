import { normalizarEmailLembrete } from '../../lib/lembrete-assinatura.js'
import { atenderWebhook, executarWhatsapp } from './whatsapp.js'
import { acompanharAcessoLiberado } from './acesso-liberado.js'
import { executarLeads } from './leads.js'
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
  for (const carrinho of candidatos) {
    if (contagem.dia >= tetoDia || contagem.mes >= tetoMes) break

    const email = normalizarEmailLembrete(carrinho.email)
    if (!modoAtivo && email !== testePara) {
      logger.log(`Carrinho ${carrinho.id} não enviado no modo teste: ${mascararEmail(email)}`)
      resultado.apenasLog += 1
      continue
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

  if (contagem.dia >= tetoDia || contagem.mes >= tetoMes) return resultado

  const seguimentos = await buscarSeguimentos(db)
  for (const carrinho of seguimentos) {
    if (contagem.dia >= tetoDia || contagem.mes >= tetoMes) break

    const email = normalizarEmailLembrete(carrinho.email)
    if (!modoAtivo && email !== testePara) {
      logger.log(`Carrinho ${carrinho.id} não alterado no modo teste: ${mascararEmail(email)}`)
      resultado.apenasLog += 1
      continue
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

// Os dois canais são independentes: um erro no e-mail não impede o WhatsApp,
// e vice-versa.
export async function executarRodada(env, opcoes = {}) {
  const logger = opcoes.logger || console
  let resultado = { enviados: 0, ignorados: 0, apenasLog: 0 }
  let erroEmail = null
  try {
    resultado = await executarRodadaEmail(env, opcoes)
  } catch (erro) {
    erroEmail = erro
  }

  // A fila da VS grátis usa o mesmo cron, sem bloquear os outros canais.
  try {
    resultado.leads = await executarLeads(env, opcoes)
  } catch (erro) {
    logger.error('Falha na sequência de e-mails da VS grátis:', erro)
  }

  resultado.whatsapp = { enviados: 0, ignorados: 0, falhas: 0 }
  try {
    resultado.whatsapp = await executarWhatsapp(env, opcoes)
  } catch (erro) {
    logger.error('Falha na etapa de WhatsApp da rodada:', erro)
  }

  // Modelo "acesso_liberado" na Meta (status, aviso e teste). Independente
  // dos lembretes: uma falha aqui não atrapalha nada.
  try {
    await acompanharAcessoLiberado(env, { db: env.DB, fetchImpl: opcoes.fetchImpl, logger })
  } catch (erro) {
    logger.error('Falha ao acompanhar o modelo acesso_liberado:', erro)
  }

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
