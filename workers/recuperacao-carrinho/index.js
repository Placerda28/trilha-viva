import { escapeHtml } from '../../lib/safe.js'
import {
  assinarDescadastro,
  normalizarEmailLembrete,
} from '../../lib/lembrete-assinatura.js'

const ASSUNTO = 'Seu acesso à Trilha Viva ficou pela metade'

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

export async function montarEmail(carrinho, env) {
  const nome = String(carrinho.nome || '').trim()
  const saudacaoHtml = nome ? `Oi, ${escapeHtml(nome)}!` : 'Oi!'
  const saudacaoTexto = nome ? `Oi, ${nome}!` : 'Oi!'
  const site = siteSemBarra(env.SITE_URL)
  const email = normalizarEmailLembrete(carrinho.email)
  const compra = `${site}/assinar?r=${encodeURIComponent(carrinho.id)}&utm_source=email&utm_medium=lembrete&utm_campaign=carrinho`
  const assinatura = await assinarDescadastro(email, env.LEMBRETE_SEGREDO)
  const descadastro = `${site}/api/descadastrar?e=${encodeURIComponent(email)}&t=${assinatura}`
  const compraHtml = escapeHtml(compra)
  const descadastroHtml = escapeHtml(descadastro)

  const texto = `${saudacaoTexto}

Vai mesmo desperdiçar essa oferta? São 2.000 multitracks gospel por R$ 89,90, pagamento único e acesso vitalício — menos de R$ 0,05 por música.

O preço de lançamento ainda está de pé. Finalize agora:

Finalizar minha compra: ${compra}

Pix ou cartão, acesso liberado na hora.

Não quer mais receber? Cancelar lembretes: ${descadastro}`

  const html = `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#F2F3F5;color:#0D0D0D;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#F2F3F5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E2E6;">
        <tr><td style="padding:36px 32px 16px;font-size:24px;font-weight:700;line-height:1.25;">${saudacaoHtml}</td></tr>
        <tr><td style="padding:0 32px 18px;font-size:16px;line-height:1.6;color:#0D0D0D;">Vai mesmo desperdiçar essa oferta? São 2.000 multitracks gospel por R$ 89,90, pagamento único e acesso vitalício — menos de R$ 0,05 por música.</td></tr>
        <tr><td style="padding:0 32px 24px;font-size:16px;line-height:1.6;color:#0D0D0D;">O preço de lançamento ainda está de pé. Finalize agora:</td></tr>
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
    subject: ASSUNTO,
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
        FROM carrinhos
       WHERE email_enviado_em >= datetime('now', 'start of day')
       LIMIT 1`).first(),
    db.prepare(`
      SELECT COUNT(*) AS total
        FROM carrinhos
       WHERE email_enviado_em >= datetime('now', 'start of month')
       LIMIT 1`).first(),
  ])
  return { dia: Number(dia?.total || 0), mes: Number(mes?.total || 0) }
}

async function buscarCandidatos(db) {
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

async function impedimentos(db, email) {
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
          FROM carrinhos enviado
         WHERE enviado.email = ? AND enviado.email_enviado_em IS NOT NULL
         LIMIT 1
      ) AS ja_lembrado,
      EXISTS(
        SELECT 1
          FROM descadastros d
         WHERE d.email = ?
         LIMIT 1
      ) AS descadastrado
    LIMIT 1`).bind(email, email, email).first()
  return {
    temCompra: Boolean(Number(resultado?.tem_compra || 0)),
    jaLembrado: Boolean(Number(resultado?.ja_lembrado || 0)),
    descadastrado: Boolean(Number(resultado?.descadastrado || 0)),
  }
}

async function ignorar(db, id) {
  await db.prepare(`
    UPDATE carrinhos
       SET status = 'ignorado'
     WHERE id = ? AND status = 'aberto'`).bind(id).run()
}

async function reservar(db, id, email, tetoDia, tetoMes) {
  // Os dois tetos ficam dentro do mesmo UPDATE da reserva. Como o D1 serializa
  // escritas, até rodadas concorrentes não conseguem reservar além do limite.
  const resultado = await db.prepare(`
    UPDATE carrinhos
       SET status = 'lembrado', email_enviado_em = datetime('now')
     WHERE id = ? AND status = 'aberto'
       AND NOT EXISTS (
         SELECT 1 FROM carrinhos enviado
          WHERE enviado.email = ? AND enviado.email_enviado_em IS NOT NULL
          LIMIT 1
       )
       AND (
         SELECT COUNT(*) FROM carrinhos
          WHERE email_enviado_em >= datetime('now', 'start of day')
       ) < ?
       AND (
         SELECT COUNT(*) FROM carrinhos
          WHERE email_enviado_em >= datetime('now', 'start of month')
       ) < ?`).bind(id, email, tetoDia, tetoMes).run()
  return mudancas(resultado) === 1
}

async function registrarFalha(db, id) {
  // Se o webhook marcar a compra durante o envio, preservamos o estado pago;
  // nos demais casos o carrinho fica ignorado e nunca entra na fila de novo.
  await db.prepare(`
    UPDATE carrinhos
       SET status = CASE WHEN status = 'pago' THEN 'pago' ELSE 'ignorado' END,
           email_enviado_em = NULL
     WHERE id = ?`).bind(id).run()
}

async function enviarPeloResend(carrinho, env, fetchImpl) {
  const corpo = await montarEmail(carrinho, env)
  const resposta = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': carrinho.id,
    },
    body: JSON.stringify(corpo),
  })
  if (!resposta.ok) throw new Error(`Resend respondeu com HTTP ${resposta.status}`)
}

export async function executarRodada(env, opcoes = {}) {
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

  const candidatos = await buscarCandidatos(db)
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
      const bloqueios = await impedimentos(db, email)
      if (bloqueios.temCompra || bloqueios.jaLembrado || bloqueios.descadastrado) {
        await ignorar(db, carrinho.id)
        resultado.ignorados += 1
        continue
      }

      reservado = await reservar(db, carrinho.id, email, tetoDia, tetoMes)
      if (!reservado) {
        // A reserva pode ter perdido uma disputa para outra rodada ou parado
        // no teto que outra rodada acabou de consumir.
        contagem = await contarEnvios(db)
        continue
      }

      await enviarPeloResend({ ...carrinho, email }, env, fetchImpl)
      contagem.dia += 1
      contagem.mes += 1
      resultado.enviados += 1
    } catch (erro) {
      if (reservado) {
        try {
          await registrarFalha(db, carrinho.id)
        } catch (erroBanco) {
          logger.error(`Falha ao desfazer reserva do carrinho ${carrinho.id}:`, erroBanco)
        }
      }
      logger.error(`Falha no lembrete do carrinho ${carrinho.id}:`, erro)
    }
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
