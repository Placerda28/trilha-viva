import { NextResponse } from 'next/server'
import { acharPorEmail, criarToken } from '@/lib/clientes'
import { enviarRecuperarSenha, emailConfigurado } from '@/lib/email'
import { normalizarEmail } from '@/lib/sessao'

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
  if (cliente && !cliente.bloqueado) {
    const token = await criarToken({ clienteId: cliente.id, tipo: 'recuperar', horas: 1 })
    if (token) await enviarRecuperarSenha({ para: email, token })
  }

  return mesmaResposta()
}
