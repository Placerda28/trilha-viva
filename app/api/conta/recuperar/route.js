import { NextResponse } from 'next/server'
import { acharPorEmail, criarToken, podeRecuperar } from '@/lib/clientes'
import { enviarRecuperarSenha, emailConfigurado } from '@/lib/email'
import { normalizarEmail } from '@/lib/sessao'
import { mesmaOrigem } from '@/lib/origem'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }

// Resposta sempre igual, exista o e-mail ou não. Se a tela dissesse "não
// encontrei esse e-mail", qualquer pessoa poderia descobrir quem é cliente
// testando endereços um por um.
//
// É uma função, e não uma constante: cada visita precisa da sua própria
// resposta — um objeto Response só pode ser entregue uma vez.
function mesmaResposta() {
  return NextResponse.json(
    {
      ok: true,
      mensagem: 'Se existir uma conta com esse e-mail, o link de redefinição chega em instantes.',
    },
    { headers: semCache }
  )
}

export async function POST(req) {
  if (!mesmaOrigem(req)) {
    return NextResponse.json({ ok: false, erro: 'Pedido recusado.' }, { status: 403, headers: semCache })
  }

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* segue e cai na resposta padrão */
  }

  const email = normalizarEmail(corpo.email)
  if (!email.includes('@')) return mesmaResposta()

  if (!emailConfigurado()) {
    return NextResponse.json(
      { ok: false, erro: 'O envio de e-mail ainda não está ativo. Fale com o suporte.' },
      { status: 503, headers: semCache }
    )
  }

  const cliente = await acharPorEmail(email)
  // Um pedido por minuto por conta. A resposta na tela não muda: quem estiver
  // tentando incomodar não descobre nada por isso.
  if (cliente && !cliente.bloqueado && (await podeRecuperar(cliente.id))) {
    const token = await criarToken({ clienteId: cliente.id, tipo: 'recuperar', horas: 1 })
    if (token) await enviarRecuperarSenha({ para: email, token })
  }

  return mesmaResposta()
}
