import { NextResponse } from 'next/server'
import { getDB, getEnv } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { responderComAnexo, validarAnexo } from '@/lib/gestao/whatsapp'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O arquivo vem cru no corpo (sem formulário: ler um multipart gastaria CPU
// do plano grátis). Telefone, nome do arquivo e legenda vêm no endereço; o
// tipo, no Content-Type.
function ambienteMeta() {
  const env = getEnv()
  return {
    WA_TOKEN: env.WA_TOKEN || process.env.WA_TOKEN,
    WA_PHONE_NUMBER_ID: env.WA_PHONE_NUMBER_ID || process.env.WA_PHONE_NUMBER_ID,
    WA_GRAPH_VERSION: env.WA_GRAPH_VERSION || process.env.WA_GRAPH_VERSION,
  }
}

function recusa(erro, status) {
  return NextResponse.json({ ok: false, erro }, { status, headers: cabecalhosPrivados })
}

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()

  const url = new URL(req.url)
  const mime = req.headers.get('content-type') || ''
  const previsto = Number(req.headers.get('content-length') || 0)
  const pedido = {
    telefone: url.searchParams.get('telefone'),
    mime,
    tamanho: previsto || 1,
    legenda: url.searchParams.get('legenda') || '',
  }
  // Primeiro confere pelo tamanho anunciado, sem ler o arquivo.
  const antes = validarAnexo(pedido)
  if (!antes.ok) return recusa(antes.erro, 400)

  const arquivo = await req.arrayBuffer()
  const validacao = validarAnexo({ ...pedido, tamanho: arquivo.byteLength })
  if (!validacao.ok) return recusa(validacao.erro, 400)

  const db = getDB()
  if (!db) return recusa('Banco indisponível no momento.', 503)

  const quem = String(admin.cliente.email || '').trim().toLowerCase()
  const resultado = await responderComAnexo(db, ambienteMeta(), {
    telefone: validacao.telefone,
    midia: validacao.midia,
    legenda: validacao.legenda,
    arquivo,
    nome: url.searchParams.get('nome') || 'arquivo',
    quem,
  })
  if (!resultado.ok) return recusa(resultado.erro, resultado.status || 400)

  await gravarRegistro(db, { quem, acao: 'whatsapp_anexo', alvo: validacao.telefone })
  return NextResponse.json({ ok: true }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
