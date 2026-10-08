import { NextResponse } from 'next/server'
import { getDB, getEnv } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { retomarConversa, telefoneDaConversa } from '@/lib/gestao/whatsapp'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// "Chamar de novo": manda o modelo pago que reabre a conversa fechada.
function ambienteMeta() {
  const env = getEnv()
  return {
    WA_TOKEN: env.WA_TOKEN || process.env.WA_TOKEN,
    WA_PHONE_NUMBER_ID: env.WA_PHONE_NUMBER_ID || process.env.WA_PHONE_NUMBER_ID,
    WA_GRAPH_VERSION: env.WA_GRAPH_VERSION || process.env.WA_GRAPH_VERSION,
    WA_TEMPLATE_RETOMAR: env.WA_TEMPLATE_RETOMAR || process.env.WA_TEMPLATE_RETOMAR,
  }
}

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* cai na validação */
  }
  const telefone = telefoneDaConversa(corpo?.telefone)
  if (!telefone) {
    return NextResponse.json({ ok: false, erro: 'Conversa inválida.' }, { status: 400, headers: cabecalhosPrivados })
  }

  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }

  const quem = String(admin.cliente.email || '').trim().toLowerCase()
  const resultado = await retomarConversa(db, ambienteMeta(), { telefone, quem })
  if (!resultado.ok) {
    return NextResponse.json(
      { ok: false, erro: resultado.erro },
      { status: resultado.status || 400, headers: cabecalhosPrivados }
    )
  }

  await gravarRegistro(db, { quem, acao: 'whatsapp_retomado', alvo: telefone })
  return NextResponse.json({ ok: true }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
