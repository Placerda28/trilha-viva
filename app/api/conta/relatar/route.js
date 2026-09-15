import { NextResponse } from 'next/server'
import { clienteAtual } from '@/lib/sessao'
import { enviarRelatoProblema, emailConfigurado } from '@/lib/email'
import { mesmaOrigem } from '@/lib/origem'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }

// Só quem está logado relata problema por aqui — a mesma trava de sessão que
// protege o acervo evita que isso vire uma caixa de e-mail aberta ao mundo.
export async function POST(req) {
  if (!mesmaOrigem(req)) {
    return NextResponse.json({ ok: false, erro: 'Pedido recusado.' }, { status: 403, headers: semCache })
  }

  const cliente = await clienteAtual()
  if (!cliente) {
    return NextResponse.json(
      { ok: false, erro: 'Sua sessão expirou. Entre de novo para relatar o problema.' },
      { status: 401, headers: semCache }
    )
  }

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* cai na validação abaixo */
  }

  const nome = String(corpo.nome || '').trim().slice(0, 120)
  const email = String(corpo.email || '').trim().slice(0, 200)
  const descricao = String(corpo.descricao || '').trim().slice(0, 4000)

  if (!email.includes('@')) {
    return NextResponse.json({ ok: false, erro: 'Informe um e-mail válido.' }, { status: 400, headers: semCache })
  }
  if (descricao.length < 10) {
    return NextResponse.json(
      { ok: false, erro: 'Conte um pouco mais o que aconteceu (pelo menos algumas palavras).' },
      { status: 400, headers: semCache }
    )
  }

  if (!emailConfigurado()) {
    return NextResponse.json(
      { ok: false, erro: 'O envio de e-mail ainda não está ativo. Tente de novo mais tarde.' },
      { status: 503, headers: semCache }
    )
  }

  const enviado = await enviarRelatoProblema({ nome, email, descricao })
  if (!enviado) {
    return NextResponse.json(
      { ok: false, erro: 'Não consegui enviar agora. Tente de novo em instantes.' },
      { status: 502, headers: semCache }
    )
  }

  return NextResponse.json({ ok: true }, { headers: semCache })
}
