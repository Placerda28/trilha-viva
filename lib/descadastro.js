import { executar } from './d1.js'
import {
  assinarDescadastro,
  assinaturaDescadastroValida,
  normalizarEmailLembrete,
} from './lembrete-assinatura.js'

export async function linkDescadastroLead(email, segredo) {
  const limpo = normalizarEmailLembrete(email)
  const assinatura = await assinarDescadastro(`lead:${limpo}`, segredo)
  if (!limpo || !assinatura) return ''
  return `/api/descadastrar?tipo=lead&e=${encodeURIComponent(limpo)}&t=${assinatura}`
}

export const cabecalhosDescadastro = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex',
}

function documento({ titulo, conteudo }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo} — Trilha Viva</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #F2F3F5; color: #0D0D0D; font-family: Arial, sans-serif; }
    main { width: min(92%, 560px); margin: 12vh auto; padding: 32px; border: 1px solid #E0E2E6; background: #fff; }
    h1 { margin: 0 0 14px; font-size: 28px; line-height: 1.15; }
    p { margin: 0 0 24px; color: #5C5C5C; line-height: 1.55; }
    button { border: 0; padding: 14px 20px; background: #C40F24; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body><main>${conteudo}</main></body>
</html>`
}

function pagina(conteudo, status = 200) {
  return new Response(documento(conteudo), { status, headers: cabecalhosDescadastro })
}

function linkInvalido() {
  return pagina(
    {
      titulo: 'Link inválido',
      conteudo: '<h1>Link inválido</h1><p>Este endereço não é válido ou está incompleto.</p>',
    },
    400
  )
}

export async function responderDescadastro(req, { db, segredo } = {}) {
  const url = new URL(req.url)
  const email = normalizarEmailLembrete(url.searchParams.get('e'))
  const assinatura = url.searchParams.get('t') || ''
  const tipo = url.searchParams.get('tipo') || 'carrinho'
  if (!['lead', 'carrinho'].includes(tipo)) return linkInvalido()
  const destinatario = tipo === 'lead' ? `lead:${email}` : email
  if (!email || !(await assinaturaDescadastroValida(destinatario, assinatura, segredo))) {
    return linkInvalido()
  }

  if (req.method === 'GET') {
    // Leitores de e-mail visitam links para procurar ameaças. O GET apenas pede
    // confirmação para que essa inspeção automática nunca descadastre alguém.
    return pagina({
      titulo: 'Cancelar lembretes',
      conteudo: `<h1>Cancelar lembretes</h1>
<p>Confirme abaixo se você não quer mais receber lembretes da Trilha Viva.</p>
<form method="post"><button type="submit">Confirmar cancelamento</button></form>`,
    })
  }

  if (req.method !== 'POST') return linkInvalido()
  if (!db) {
    return pagina(
      {
        titulo: 'Tente novamente',
        conteudo: '<h1>Não foi possível concluir agora</h1><p>Tente novamente em alguns instantes.</p>',
      },
      503
    )
  }

  try {
    if (tipo === 'lead') {
      await executar(db, `UPDATE leads SET descadastrado = 1, proximo_email_em = NULL
        WHERE email = ?`, email)
      return pagina({ titulo: 'Envios cancelados',
        conteudo: '<h1>Pronto</h1><p>Você não vai mais receber os e-mails da VS grátis.</p>' })
    }
    // O corpo é propositalmente opcional: o botão envia um POST comum e o
    // cancelamento de um clique envia List-Unsubscribe=One-Click.
    await executar(
      db,
      `INSERT OR IGNORE INTO descadastros (email, canal)
       VALUES (?, 'email')`,
      email
    )
    return pagina({
      titulo: 'Lembretes cancelados',
      conteudo: `<h1>Pronto</h1>
<p>Pronto, você não vai mais receber lembretes.</p>`,
    })
  } catch (erro) {
    console.error('Falha ao registrar descadastro:', erro)
    return pagina(
      {
        titulo: 'Tente novamente',
        conteudo: '<h1>Não foi possível concluir agora</h1><p>Tente novamente em alguns instantes.</p>',
      },
      503
    )
  }
}
