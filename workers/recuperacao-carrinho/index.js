import { escapeHtml } from '../../lib/safe.js'
import {
  assinarDescadastro,
  normalizarEmailLembrete,
} from '../../lib/lembrete-assinatura.js'
import {
  configuracaoWhatsappValida,
  dentroDoHorario,
  enviarWhatsapp,
  montarWhatsapp,
} from './whatsapp.js'

const EMAILS = {
  1: {
    assunto: 'Seu acesso à Trilha Viva ficou pela metade',
    paragrafos: [
      'Vai mesmo desperdiçar essa oferta? São 2.000 multitracks gospel por R$ 89,90, pagamento único e acesso vitalício — menos de R$ 0,05 por música.',
      'O preço de lançamento ainda está de pé. Finalize agora:',
    ],
  },
  2: {
    assunto: 'Seu acervo de multitracks ainda está esperando',
    paragrafos: [
      'Faz uma semana que você começou a liberar o seu acesso à Trilha Viva e a compra não foi concluída.',
      'São mais de 2.000 multitracks gospel com clique, guia e canais separados, prontas para o ensaio e para o culto. Pagamento único de R$ 89,90 e acesso vitalício.',
      'Se ficou alguma dúvida, é só responder este e-mail.',
    ],
  },
  3: {
    assunto: 'Ensaio mais tranquilo para o seu ministério',
    paragrafos: [
      'Com as multitracks, a banda inteira ensaia com a mesma referência: clique, guia e cada instrumento no seu canal.',
      'Você deixou o seu acesso à Trilha Viva pela metade. São mais de 2.000 músicas por R$ 89,90, uma vez só, sem mensalidade.',
      'O botão abaixo leva direto para concluir.',
    ],
  },
  4: {
    assunto: 'Último lembrete sobre o seu acesso à Trilha Viva',
    paragrafos: [
      'Este é o último e-mail que enviamos sobre a sua compra que ficou pela metade.',
      'Se ainda fizer sentido para o seu ministério, o acervo completo com mais de 2.000 multitracks gospel continua disponível por R$ 89,90, pagamento único e acesso vitalício.',
      'Depois deste, não mandamos mais lembretes.',
    ],
  },
}

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

export function mascararEmail(email) {
  const [usuario = '', dominio = ''] = normalizarEmailLembrete(email).split('@')
  const partes = dominio.split('.')
  const nomeDominio = partes.shift() || ''
  const sufixo = partes.length ? `.${partes.join('.')}` : ''
  const inicioUsuario = usuario.slice(0, 1) || '*'
  const inicioDominio = nomeDominio.slice(0, 1) || '*'
  return `${inicioUsuario}***@${inicioDominio}***${sufixo}`
}

function siteSemBarra(valor) {
  return String(valor || '').trim().replace(/\/+$/, '')
}

export async function montarEmail(carrinho, env, numeroEtapa = 1) {
  const etapa = Number(numeroEtapa)
  const conteudo = EMAILS[etapa] || EMAILS[1]
  const nome = String(carrinho.nome || '').trim()
  const saudacaoHtml = nome ? `Oi, ${escapeHtml(nome)}!` : 'Oi!'
  const saudacaoTexto = nome ? `Oi, ${nome}!` : 'Oi!'
  const site = siteSemBarra(env.SITE_URL)
  const email = normalizarEmailLembrete(carrinho.email)
  const campanha = etapa === 1 ? 'carrinho' : `carrinho-${etapa}`
  const compra = `${site}/assinar?r=${encodeURIComponent(carrinho.id)}&utm_source=email&utm_medium=lembrete&utm_campaign=${campanha}`
  const assinatura = await assinarDescadastro(email, env.LEMBRETE_SEGREDO)
  const descadastro = `${site}/api/descadastrar?e=${encodeURIComponent(email)}&t=${assinatura}`
  const compraHtml = escapeHtml(compra)
  const descadastroHtml = escapeHtml(descadastro)

  const texto = `${saudacaoTexto}

${conteudo.paragrafos.join('\n\n')}

Finalizar minha compra: ${compra}

Pix ou cartão, acesso liberado na hora.

Não quer mais receber? Cancelar lembretes: ${descadastro}`

  const paragrafosHtml = conteudo.paragrafos
    .map(
      (paragrafo, indice) =>
        `<tr><td style="padding:0 32px ${indice === conteudo.paragrafos.length - 1 ? '24' : '18'}px;font-size:16px;line-height:1.6;color:#0D0D0D;">${escapeHtml(paragrafo)}</td></tr>`
    )
    .join('\n        ')

  const html = `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#F2F3F5;color:#0D0D0D;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#F2F3F5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E2E6;">
        <tr><td style="padding:36px 32px 16px;font-size:24px;font-weight:700;line-height:1.25;">${saudacaoHtml}</td></tr>
        ${paragrafosHtml}
        <tr><td align="center" style="padding:0 32px 24px;"><a href="${compraHtml}" style="display:inline-block;background:#C40F24;color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:700;padding:15px 22px;">Finalizar minha compra</a></td></tr>
        <tr><td style="padding:0 32px 36px;text-align:center;font-size:14px;line-height:1.5;color:#5C5C5C;">Pix ou cartão, acesso liberado na hora.</td></tr>
        <tr><td style="border-top:1px solid #E0E2E6;padding:20px 32px;font-size:12px;line-height:1.5;color:#5C5C5C;">Não quer mais receber? <a href="${descadastroHtml}" style="color:#C40F24;">Cancelar lembretes</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return {
    from: env.EMAIL_FROM,
    to: [email],
    bcc: [env.LEMBRETE_BCC],
    reply_to: env.EMAIL_REPLY_TO,
    subject: conteudo.assunto,
    html,
    text: texto,
    headers: {
      'List-Unsubscribe': `<${descadastro}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

async function contarEnvios(db) {
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

async function buscarCandidatosIniciais(db) {
  const resultado = await db.prepare(`
    SELECT id, email, nome
      FROM carrinhos
     WHERE status = 'aberto'
       AND criado_em >= datetime('now', '-48 hours')
       AND criado_em <= datetime('now', '-1 hour')
     ORDER BY criado_em ASC, id ASC
     LIMIT 20`).all()
  return linhas(resultado)
}

async function buscarSeguimentos(db) {
  const resultado = await db.prepare(`
    SELECT id, email, nome, etapa_email
      FROM carrinhos
     WHERE status = 'lembrado'
       AND finalizado_em IS NULL
       AND proximo_email_em <= datetime('now')
     ORDER BY proximo_email_em ASC, criado_em ASC, id ASC
     LIMIT 20`).all()
  return linhas(resultado)
}

async function impedimentosIniciais(db, email) {
  const resultado = await db.prepare(`
    SELECT
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
    LIMIT 1`).bind(email, email, email, email).first()
  return {
    temCompra: Boolean(Number(resultado?.tem_compra || 0)),
    jaLembrado: Boolean(Number(resultado?.ja_lembrado || 0)),
    descadastrado: Boolean(Number(resultado?.descadastrado || 0)),
  }
}

async function impedimentosSeguimento(db, email) {
  const resultado = await db.prepare(`
    SELECT
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
    LIMIT 1`).bind(email, email).first()
  return {
    temCompra: Boolean(Number(resultado?.tem_compra || 0)),
    descadastrado: Boolean(Number(resultado?.descadastrado || 0)),
  }
}

async function ignorar(db, id) {
  await db.prepare(`
    UPDATE carrinhos
       SET status = 'ignorado'
     WHERE id = ? AND status = 'aberto'`).bind(id).run()
}

async function reservarPrimeiro(db, id, email, tetoDia, tetoMes) {
  // A linha do lembrete é a reserva. Os tetos e a exclusividade por e-mail
  // ficam no mesmo INSERT para duas rodadas concorrentes não ultrapassarem a regra.
  const resultado = await db.prepare(`
    INSERT OR IGNORE INTO lembretes_enviados
      (carrinho_id, canal, etapa, enviado_em)
    SELECT c.id, 'email', 1, datetime('now')
      FROM carrinhos c
     WHERE c.id = ? AND c.status = 'aberto'
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
     WHERE id = ? AND status = 'aberto'`).bind(id).run()
  if (mudancas(atualizado) === 1) return true

  await apagarReserva(db, id, 1)
  return false
}

async function reservarSeguimento(db, id, etapaAnterior, etapa, tetoDia, tetoMes) {
  const resultado = await db.prepare(`
    INSERT OR IGNORE INTO lembretes_enviados
      (carrinho_id, canal, etapa, enviado_em)
    SELECT id, 'email', ?, datetime('now')
      FROM carrinhos
     WHERE id = ?
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

async function registrarFalhaInicial(db, id) {
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

async function registrarFalhaSeguimento(db, id, etapaAnterior, etapa) {
  await apagarReserva(db, id, etapa)
  await db.prepare(`
    UPDATE carrinhos
       SET proximo_email_em = datetime('now', '+1 day')
     WHERE id = ?
       AND status = 'lembrado'
       AND finalizado_em IS NULL
       AND etapa_email = ?`).bind(id, etapaAnterior).run()
}

async function concluirSeguimento(db, id, etapaAnterior, etapa) {
  const dias = etapa === 2 ? 15 : 30
  await db.prepare(`
    UPDATE carrinhos
       SET etapa_email = ?, proximo_email_em = datetime('now', ?)
     WHERE id = ?
       AND status = 'lembrado'
       AND finalizado_em IS NULL
       AND etapa_email = ?`).bind(etapa, `+${dias} days`, id, etapaAnterior).run()
}

async function finalizar(db, id, motivo) {
  await db.prepare(`
    UPDATE carrinhos
       SET finalizado_em = datetime('now'), finalizado_motivo = ?
     WHERE id = ? AND status = 'lembrado' AND finalizado_em IS NULL`).bind(motivo, id).run()
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

function mascararTelefone(telefone) {
  const numero = String(telefone || '')
  return `${numero.slice(0, 2)}*****${numero.slice(-4)}`
}

async function contarEnviosWhatsapp(db) {
  const linha = await db.prepare(`
    SELECT COUNT(*) AS total
      FROM lembretes_enviados
     WHERE canal = 'whatsapp'
       AND enviado_em >= datetime('now', 'start of day')
     LIMIT 1`).first()
  return Number(linha?.total || 0)
}

async function buscarCandidatosWhatsapp(db) {
  const resultado = await db.prepare(`
    SELECT id, email, nome, telefone
      FROM carrinhos
     WHERE telefone IS NOT NULL
       AND whatsapp_enviado_em IS NULL
       AND whatsapp_falhou_em IS NULL
       AND status IN ('aberto', 'lembrado')
       AND finalizado_em IS NULL
       AND criado_em <= datetime('now', '-24 hours')
       AND criado_em >= datetime('now', '-72 hours')
     ORDER BY criado_em ASC, id ASC
     LIMIT 3`).all()
  return linhas(resultado)
}

async function impedimentosWhatsapp(db, email, telefone) {
  const linha = await db.prepare(`
    SELECT
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
      ) AS descadastrado,
      (
        EXISTS(
          SELECT 1
            FROM carrinhos outro
           WHERE (outro.email = ? OR outro.telefone = ?)
             AND outro.whatsapp_enviado_em IS NOT NULL
           LIMIT 1
        )
        OR EXISTS(
          SELECT 1
            FROM lembretes_enviados l
            JOIN carrinhos outro ON outro.id = l.carrinho_id
           WHERE l.canal = 'whatsapp'
             AND (outro.email = ? OR outro.telefone = ?)
           LIMIT 1
        )
      ) AS ja_enviado
    LIMIT 1`).bind(email, email, email, telefone, email, telefone).first()
  return {
    temCompra: Boolean(Number(linha?.tem_compra || 0)),
    descadastrado: Boolean(Number(linha?.descadastrado || 0)),
    jaEnviado: Boolean(Number(linha?.ja_enviado || 0)),
  }
}

async function marcarFalhaWhatsapp(db, id) {
  await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_falhou_em = datetime('now')
     WHERE id = ? AND whatsapp_enviado_em IS NULL`).bind(id).run()
}

async function apagarReservaWhatsapp(db, id) {
  await db.prepare(`
    DELETE FROM lembretes_enviados
     WHERE carrinho_id = ? AND canal = 'whatsapp' AND etapa = 1`).bind(id).run()
}

async function reservarWhatsapp(db, carrinho, tetoDia) {
  // A reserva também olha as reservas dos outros carrinhos. Assim duas
  // rodadas simultâneas não enviam para o mesmo e-mail ou celular.
  const reserva = await db.prepare(`
    INSERT OR IGNORE INTO lembretes_enviados
      (carrinho_id, canal, etapa, enviado_em)
    SELECT candidato.id, 'whatsapp', 1, datetime('now')
      FROM carrinhos candidato
     WHERE candidato.id = ?
       AND candidato.whatsapp_enviado_em IS NULL
       AND candidato.whatsapp_falhou_em IS NULL
       AND candidato.status IN ('aberto', 'lembrado')
       AND candidato.finalizado_em IS NULL
       AND NOT EXISTS (
         SELECT 1
           FROM lembretes_enviados anterior
           JOIN carrinhos outro ON outro.id = anterior.carrinho_id
          WHERE anterior.canal = 'whatsapp'
            AND (outro.email = ? OR outro.telefone = ?)
          LIMIT 1
       )
       AND (
         SELECT COUNT(*)
           FROM lembretes_enviados
          WHERE canal = 'whatsapp'
            AND enviado_em >= datetime('now', 'start of day')
       ) < ?`).bind(carrinho.id, carrinho.email, carrinho.telefone, tetoDia).run()
  if (mudancas(reserva) !== 1) return false

  const atualizacao = await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_enviado_em = datetime('now')
     WHERE id = ?
       AND whatsapp_enviado_em IS NULL
       AND whatsapp_falhou_em IS NULL`).bind(carrinho.id).run()
  if (mudancas(atualizacao) === 1) return true

  await apagarReservaWhatsapp(db, carrinho.id)
  return false
}

async function registrarFalhaWhatsapp(db, id) {
  await apagarReservaWhatsapp(db, id)
  await db.prepare(`
    UPDATE carrinhos
       SET whatsapp_enviado_em = NULL,
           whatsapp_falhou_em = datetime('now')
     WHERE id = ?`).bind(id).run()
}

export async function executarWhatsapp(env, opcoes = {}) {
  const resultado = { enviados: 0, ignorados: 0, apenasLog: 0 }
  const modo = String(env.MODO_WHATSAPP || 'desligado').toLowerCase()
  if (modo !== 'teste' && modo !== 'ativo') return resultado
  if (!dentroDoHorario(opcoes.agora || new Date())) return resultado

  const logger = opcoes.logger || console
  if (!configuracaoWhatsappValida(env)) {
    logger.error('Configuração do provedor de WhatsApp incompleta; etapa ignorada.')
    return resultado
  }

  const db = env.DB
  if (!db) throw new Error('Binding DB não configurado.')
  const fetchImpl = opcoes.fetchImpl || globalThis.fetch
  const tetoDia = limite(env.WHATSAPP_TETO_DIA, 20)
  let enviadosHoje = await contarEnviosWhatsapp(db)
  if (enviadosHoje >= tetoDia) return resultado

  const candidatos = await buscarCandidatosWhatsapp(db)
  for (const carrinho of candidatos) {
    if (enviadosHoje >= tetoDia) break

    if (modo === 'teste' && carrinho.telefone !== String(env.WHATSAPP_TESTE_PARA || '')) {
      logger.log(
        `Carrinho ${carrinho.id} não enviado no modo teste do WhatsApp: ${mascararTelefone(carrinho.telefone)}`
      )
      resultado.apenasLog += 1
      continue
    }

    const bloqueios = await impedimentosWhatsapp(
      db,
      normalizarEmailLembrete(carrinho.email),
      carrinho.telefone
    )
    if (bloqueios.temCompra || bloqueios.descadastrado || bloqueios.jaEnviado) {
      await marcarFalhaWhatsapp(db, carrinho.id)
      resultado.ignorados += 1
      continue
    }

    const reservado = await reservarWhatsapp(db, carrinho, tetoDia)
    if (!reservado) {
      enviadosHoje = await contarEnviosWhatsapp(db)
      continue
    }

    try {
      await enviarWhatsapp(
        { telefone: carrinho.telefone, texto: montarWhatsapp(carrinho, env) },
        env,
        fetchImpl
      )
      enviadosHoje += 1
      resultado.enviados += 1
    } catch (erro) {
      try {
        await registrarFalhaWhatsapp(db, carrinho.id)
      } catch (erroBanco) {
        logger.error(
          `Falha ao desfazer reserva do WhatsApp do carrinho ${carrinho.id}:`,
          erroBanco
        )
      }
      logger.error(`Falha no WhatsApp do carrinho ${carrinho.id}:`, erro)
    }
  }

  return resultado
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
       WHERE status = 'aberto'
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
      const bloqueios = await impedimentosIniciais(db, email)
      if (bloqueios.temCompra || bloqueios.jaLembrado || bloqueios.descadastrado) {
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
      const bloqueios = await impedimentosSeguimento(db, email)
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

export async function executarRodada(env, opcoes = {}) {
  const resultado = await executarRodadaEmail(env, opcoes)
  resultado.whatsapp = { enviados: 0, ignorados: 0, apenasLog: 0 }

  try {
    resultado.whatsapp = await executarWhatsapp(env, opcoes)
  } catch (erro) {
    const logger = opcoes.logger || console
    logger.error('Falha na etapa de WhatsApp da rodada:', erro)
  }

  return resultado
}

export default {
  fetch() {
    return new Response(null, { status: 404 })
  },

  scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      executarRodada(env).catch((erro) => {
        console.error('Falha na rodada de recuperação de carrinho:', erro)
      })
    )
  },
}
