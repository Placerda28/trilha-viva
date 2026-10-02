import { NextResponse } from 'next/server'
import { getDB, getEnv } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { responderConversa, validarResposta } from '@/lib/gestao/whatsapp'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O token da Meta e o número ficam como segredo/variável do site (painel ou
// wrangler secret put). process.env cobre o desenvolvimento local.
function ambienteMeta() {
  const env = getEnv()
  return {
    WA_TOKEN: env.WA_TOKEN || process.env.WA_TOKEN,
    WA_PHONE_NUMBER_ID: env.WA_PHONE_NUMBER_ID || process.env.WA_PHONE_NUMBER_ID,
    WA_GRAPH_VERSION: env.WA_GRAPH_VERSION || process.env.WA_GRAPH_VERSION,
  }
}

const post = async (req, admin) => {
  // A origem é conferida depois da sessão, como nas outras rotas de escrita.
  if (!mesmaOrigem(req)) return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* cai na validação */
  }
  const validacao = validarResposta(corpo)
  if (!validacao.ok) {
    return NextResponse.json({ ok: false, erro: validacao.erro }, { status: 400, headers: cabecalhosPrivados })
  }

  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }

  const quem = String(admin.cliente.email || '').trim().toLowerCase()
  const resultado = await responderConversa(db, ambienteMeta(), {
    telefone: validacao.telefone,
    texto: validacao.texto,
    quem,
  })
  if (!resultado.ok) {
    return NextResponse.json(
      { ok: false, erro: resultado.erro },
      { status: resultado.status || 400, headers: cabecalhosPrivados }
    )
  }

  await gravarRegistro(db, { quem, acao: 'whatsapp_respondido', alvo: validacao.telefone })
  return NextResponse.json({ ok: true }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
