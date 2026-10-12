import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { criarToken } from '@/lib/clientes'
import { emailConfigurado, enviarCriarSenha } from '@/lib/email'
import { mesmaOrigem } from '@/lib/origem'
import { RESPOSTA_PRIMEIRO_ACESSO, pedirPrimeiroAcesso } from '@/lib/primeiro-acesso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }

// Mesma resposta para compra, sem compra e acima do limite (ver
// lib/primeiro-acesso.js). É uma função porque cada visita precisa da sua
// própria resposta.
function mesmaResposta() {
  return NextResponse.json({ ok: true, mensagem: RESPOSTA_PRIMEIRO_ACESSO }, { headers: semCache })
}

export async function POST(req) {
  if (!mesmaOrigem(req)) {
    return NextResponse.json({ ok: false, erro: 'Pedido recusado.' }, { status: 403, headers: semCache })
  }

  if (!emailConfigurado()) {
    return NextResponse.json(
      { ok: false, erro: 'O envio de e-mail ainda não está ativo. Fale com o suporte.' },
      { status: 503, headers: semCache }
    )
  }

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* segue e cai na resposta padrão */
  }

  try {
    const resultado = await pedirPrimeiroAcesso(
      getDB(),
      { email: corpo.email, ip: req.headers.get('cf-connecting-ip') },
      { criarToken, enviarCriarSenha }
    )
    if (resultado === 'falhou') console.error('primeiro acesso: link não enviado')
  } catch (erro) {
    // Nem a falha muda a resposta: ela também diria algo sobre o e-mail.
    console.error('primeiro acesso', erro?.message)
  }
  return mesmaResposta()
}
