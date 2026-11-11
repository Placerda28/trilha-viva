import { getEnv } from '@/lib/d1'
import { enviarRascunho } from '@/lib/gestao/whatsapp-rascunho'
import { rotaPost } from '@/lib/gestao/instagram-rota'
import { naoEncontrado } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Único caminho de envio da sugestão da IA: só no clique do admin.
function ambienteMeta() {
  const env = getEnv()
  return {
    WA_TOKEN: env.WA_TOKEN || process.env.WA_TOKEN,
    WA_PHONE_NUMBER_ID: env.WA_PHONE_NUMBER_ID || process.env.WA_PHONE_NUMBER_ID,
    WA_GRAPH_VERSION: env.WA_GRAPH_VERSION || process.env.WA_GRAPH_VERSION,
  }
}

export const POST = rotaPost(async (db, corpo, quem) => {
  const r = await enviarRascunho(db, ambienteMeta(), {
    rascunhoId: corpo?.rascunho_id,
    telefone: corpo?.telefone,
    texto: corpo?.texto,
    quem,
  })
  return r.ok ? { ok: true, registro: { acao: 'whatsapp_rascunho_enviado', alvo: r.telefone } } : r
})
export const GET = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
