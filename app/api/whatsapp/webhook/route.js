import { NextResponse } from 'next/server'
import { executar, getDB } from '@/lib/d1'
import {
  compararSegredoEmTempoConstante,
  lerMensagemRecebida,
  pedidoDeSaida,
} from '@/lib/whatsapp-saida'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CABECALHOS = { 'Cache-Control': 'no-store' }
const LIMITE_CORPO = 64 * 1024
const hits = new Map()

function naoEncontrado() {
  return new NextResponse(null, { status: 404, headers: CABECALHOS })
}

function limitado(ip) {
  const agora = Date.now()
  const acessos = (hits.get(ip) || []).filter((instante) => agora - instante < 60000)
  acessos.push(agora)
  hits.set(ip, acessos)
  if (hits.size > 5000) hits.clear()
  return acessos.length > 120
}

async function lerJsonLimitado(req) {
  const tamanhoDeclarado = Number(req.headers.get('content-length') || 0)
  if (tamanhoDeclarado > LIMITE_CORPO || !req.body) return null

  const leitor = req.body.getReader()
  const partes = []
  let tamanho = 0
  while (true) {
    const { done, value } = await leitor.read()
    if (done) break
    tamanho += value.byteLength
    if (tamanho > LIMITE_CORPO) {
      await leitor.cancel()
      return null
    }
    partes.push(value)
  }

  const bytes = new Uint8Array(tamanho)
  let posicao = 0
  for (const parte of partes) {
    bytes.set(parte, posicao)
    posicao += parte.byteLength
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

export async function POST(req) {
  const segredo = process.env.WHATSAPP_WEBHOOK_SEGREDO
  const recebido = new URL(req.url).searchParams.get('t') || ''
  if (!segredo || !(await compararSegredoEmTempoConstante(recebido, segredo))) {
    return naoEncontrado()
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  if (limitado(ip)) {
    // O freio descarta o excesso, mas confirma o recebimento para o provedor
    // não reenviar a mesma mensagem e aumentar ainda mais o volume.
    return NextResponse.json({ ok: true }, { headers: CABECALHOS })
  }

  try {
    const mensagem = lerMensagemRecebida(await lerJsonLimitado(req))
    if (mensagem && pedidoDeSaida(mensagem.texto)) {
      const db = getDB()
      if (!db) throw new Error('Banco indisponível.')
      const resultado = await db.prepare(`
        SELECT DISTINCT email
          FROM carrinhos
         WHERE telefone = ?
         LIMIT 10`).bind(mensagem.telefone).all()
      const emails = Array.isArray(resultado?.results) ? resultado.results : []
      for (const linha of emails) {
        await executar(
          db,
          "INSERT OR IGNORE INTO descadastros (email, canal) VALUES (?, 'whatsapp')",
          linha.email
        )
      }
    }
  } catch (erro) {
    // O provedor recebe sucesso mesmo se o corpo vier inesperado ou o banco
    // falhar, evitando que ele repita a mesma mensagem indefinidamente.
    console.error('Falha no webhook de saída do WhatsApp:', erro)
  }

  return NextResponse.json({ ok: true }, { headers: CABECALHOS })
}

export const GET = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
export const OPTIONS = naoEncontrado
export const HEAD = naoEncontrado
