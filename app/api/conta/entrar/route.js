import { NextResponse } from 'next/server'
import { conferirSenha, senhasConfiguradas } from '@/lib/senhas'
import { acharPorEmail, podeTentar, anotarTentativa } from '@/lib/clientes'
import { criarSessao, normalizarEmail } from '@/lib/sessao'
import { mesmaOrigem } from '@/lib/origem'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }

export async function POST(req) {
  if (!mesmaOrigem(req)) {
    return NextResponse.json({ ok: false, erro: 'Pedido recusado.' }, { status: 403, headers: semCache })
  }

  if (!senhasConfiguradas()) {
    return NextResponse.json(
      { ok: false, erro: 'A entrada ainda não está ativa. Fale com o suporte.' },
      { status: 503, headers: semCache }
    )
  }

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* validação abaixo */
  }

  const email = normalizarEmail(corpo.email)
  const senha = String(corpo.senha || '')
  const ip = req.headers.get('cf-connecting-ip') || ''

  if (!email.includes('@') || email.length < 5 || !senha) {
    return NextResponse.json(
      { ok: false, erro: 'Informe o e-mail e a senha.' },
      { status: 400, headers: semCache }
    )
  }

  if (!(await podeTentar(email, ip))) {
    return NextResponse.json(
      { ok: false, erro: 'Muitas tentativas seguidas. Espere 15 minutos e tente de novo.' },
      { status: 429, headers: semCache }
    )
  }

  const confere = await conferirSenha({ email, senha })
  const cliente = confere.ok ? await acharPorEmail(email) : null

  // A mesma resposta para senha errada e e-mail inexistente, de propósito:
  // dizer "este e-mail não existe" entrega para qualquer curioso a lista de
  // quem comprou.
  if (!confere.ok || !cliente) {
    await anotarTentativa({ email, ip, sucesso: false })
    return NextResponse.json(
      { ok: false, erro: 'E-mail ou senha incorretos.' },
      { status: 401, headers: semCache }
    )
  }

  if (cliente.bloqueado) {
    return NextResponse.json(
      { ok: false, erro: 'Este acesso está suspenso. Fale com o suporte.' },
      { status: 403, headers: semCache }
    )
  }

  await anotarTentativa({ email, ip, sucesso: true })
  await criarSessao(cliente.id, req)
  return NextResponse.json({ ok: true }, { headers: semCache })
}
