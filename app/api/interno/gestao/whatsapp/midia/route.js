import { getDB, getEnv } from '@/lib/d1'
import { midiaDaMensagemGuardada } from '@/lib/gestao/whatsapp'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Mostra o arquivo de uma mensagem (?id=<id da mensagem>). Ele não fica
// guardado aqui: vem da Meta na hora e passa direto para o navegador.
function ambienteMeta() {
  const env = getEnv()
  return {
    WA_TOKEN: env.WA_TOKEN || process.env.WA_TOKEN,
    WA_PHONE_NUMBER_ID: env.WA_PHONE_NUMBER_ID || process.env.WA_PHONE_NUMBER_ID,
    WA_GRAPH_VERSION: env.WA_GRAPH_VERSION || process.env.WA_GRAPH_VERSION,
  }
}

// Foto, áudio e vídeo abrem na tela; o resto só baixa. Um arquivo mandado
// pelo cliente nunca roda como página do nosso site (sandbox + nosniff).
const NA_TELA = ['image/', 'audio/', 'video/']

function nomeParaCabecalho(nome) {
  return encodeURIComponent(String(nome || 'arquivo')).slice(0, 300)
}

const get = async (req) => {
  const db = getDB()
  if (!db) return new Response(null, { status: 503, headers: cabecalhosPrivados })

  const id = new URL(req.url).searchParams.get('id')
  const midia = await midiaDaMensagemGuardada(db, ambienteMeta(), id)
  if (!midia.ok) return new Response(null, { status: midia.status, headers: cabecalhosPrivados })

  const mime = String(midia.mime || 'application/octet-stream').split(';')[0].trim().toLowerCase()
  const naTela = NA_TELA.some((inicio) => mime.startsWith(inicio)) && mime !== 'image/svg+xml'
  const tipo = naTela ? mime : 'application/octet-stream'
  return new Response(midia.resposta.body, {
    status: 200,
    headers: {
      'Content-Type': tipo,
      'Content-Disposition': (naTela ? 'inline' : 'attachment') + "; filename*=UTF-8''" + nomeParaCabecalho(midia.nome),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self'; media-src 'self'",
      'X-Robots-Tag': 'noindex',
    },
  })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
