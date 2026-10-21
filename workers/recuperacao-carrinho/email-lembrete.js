import { escapeHtml } from '../../lib/safe.js'
import {
  assinarDescadastro,
  normalizarEmailLembrete,
} from '../../lib/lembrete-assinatura.js'

// O e-mail de lembrete (as 4 etapas da sequência), montado para o Resend.
// index.js reexporta montarEmail e mascararEmail.

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
