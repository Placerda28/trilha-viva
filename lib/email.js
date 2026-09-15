import { site } from '@/lib/site'
import { escapeHtml, safeUrl } from '@/lib/safe'

// Todo e-mail sai por aqui. Se as chaves não estiverem cadastradas, a função
// devolve false em silêncio em vez de estourar — quem chamou decide o que
// dizer na tela, e nunca promete e-mail que não vai sair.
export function emailConfigurado() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

async function enviar({ para, assunto, html, replyTo }) {
  const chave = process.env.RESEND_API_KEY
  const de = process.env.EMAIL_FROM
  if (!chave || !de || !para) return false
  try {
    const corpo = { from: de, to: [para], subject: assunto, html }
    if (replyTo) corpo.reply_to = replyTo
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + chave, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
    if (!res.ok) {
      console.error('resend', res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('email', err?.message)
    return false
  }
}

// Moldura única: cabeçalho, miolo e rodapé iguais em todas as mensagens.
function moldura({ titulo, texto, botao, link, rodape }) {
  const url = safeUrl(link)
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f2f3f5;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0d0d0d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e0e2e6;border-radius:18px;overflow:hidden">
        <tr><td style="padding:32px 32px 8px">
          <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a;font-weight:700">Trilha Viva · Multitracks Gospel</p>
          <h1 style="margin:14px 0 0;font-size:26px;line-height:1.2;letter-spacing:-.03em">${titulo}</h1>
          <p style="margin:14px 0 0;font-size:15px;line-height:1.65;color:#5c5c5c">${texto}</p>
        </td></tr>
        <tr><td style="padding:24px 32px 8px">
          <a href="${url}" style="display:inline-block;background:#c40f24;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 26px;border-radius:999px">${botao}</a>
          <p style="margin:14px 0 0;font-size:12.5px;color:#8a8a8a;word-break:break-all">${url}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 32px">
          <p style="margin:0;font-size:12.5px;line-height:1.6;color:#8a8a8a">${rodape}</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}

// Depois da compra: o link que leva à criação da senha. É a rede de segurança
// de quem fechou a aba antes de criar.
export async function enviarCriarSenha({ para, nome, token }) {
  const saudacao = escapeHtml(nome) ? ', ' + escapeHtml(nome) : ''
  return enviar({
    para,
    assunto: 'Crie sua senha e entre no acervo Trilha Viva',
    html: moldura({
      titulo: 'Pagamento confirmado' + saudacao + '!',
      texto:
        'Falta um passo: criar a sua senha. Depois disso o acervo completo fica disponível na sua conta, com download música por música, quando você quiser.',
      botao: 'Criar minha senha',
      link: site.url + '/criar-senha?t=' + token,
      rodape:
        'Este link vale por 7 dias e só pode ser usado uma vez. Se ele vencer, use "Esqueci minha senha" na página de entrada com este mesmo e-mail. Guarde esta mensagem: ela é o comprovante do seu acesso vitalício.',
    }),
  })
}

// Relato de problema, enviado pelo cliente logado direto para o suporte.
// Sem molde de e-mail transacional: é um aviso interno, não uma mensagem de
// marca para o cliente. O reply_to vai para quem relatou, então responder o
// e-mail já cai na caixa da pessoa certa.
const SUPORTE = 'trilhaviva.suporte@gmail.com'

export async function enviarRelatoProblema({ nome, email, descricao }) {
  const nomeSeguro = escapeHtml(nome) || '(sem nome)'
  const emailSeguro = escapeHtml(email)
  const descricaoSegura = escapeHtml(descricao).replace(/\n/g, '<br>')
  return enviar({
    para: SUPORTE,
    assunto: 'Problema relatado — ' + (nome ? nome : email),
    replyTo: email,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f2f3f5;font-family:Arial,sans-serif;color:#0d0d0d">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
        <tr><td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e0e2e6;border-radius:18px;overflow:hidden">
            <tr><td style="padding:32px">
              <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a;font-weight:700">Trilha Viva · Relato de problema</p>
              <p style="margin:18px 0 0;font-size:14px;color:#5c5c5c"><strong style="color:#0d0d0d">Nome:</strong> ${nomeSeguro}</p>
              <p style="margin:6px 0 0;font-size:14px;color:#5c5c5c"><strong style="color:#0d0d0d">E-mail:</strong> ${emailSeguro}</p>
              <p style="margin:18px 0 0;font-size:15px;line-height:1.65;color:#0d0d0d">${descricaoSegura}</p>
            </td></tr>
          </table>
        </td></tr>
      </table></body></html>`,
  })
}

export async function enviarRecuperarSenha({ para, token }) {
  return enviar({
    para,
    assunto: 'Redefinir sua senha — Trilha Viva',
    html: moldura({
      titulo: 'Redefinir sua senha',
      texto:
        'Recebemos um pedido para trocar a senha da sua conta. Se não foi você, pode ignorar esta mensagem: nada muda enquanto o link não for usado.',
      botao: 'Escolher nova senha',
      link: site.url + '/redefinir?t=' + token,
      rodape: 'Este link vale por 1 hora e só pode ser usado uma vez.',
    }),
  })
}
