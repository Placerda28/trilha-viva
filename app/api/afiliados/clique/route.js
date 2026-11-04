import { getDB, getEnv } from '@/lib/d1'
import { limparUtm } from '@/lib/carrinhos'
import { registrarClique, visitanteHash, dispositivoDe } from '@/lib/afiliados/clique'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }
const resposta = () => new Response(null, { status: 204, headers: semCache })

// Chamado por navigator.sendBeacon. Sempre 204: quem chama não descobre se o código existe.
export async function POST(req) {
  try {
    const db = getDB()
    const segredo = process.env.LEMBRETE_SEGREDO || getEnv().LEMBRETE_SEGREDO
    const texto = await req.text()
    if (!db || !segredo || texto.length > 2000) return resposta()
    const c = JSON.parse(texto)
    if (!c || typeof c !== 'object' || typeof c.codigo !== 'string') return resposta()
    const agente = (req.headers.get('user-agent') || '').slice(0, 300)
    await registrarClique(db, {
      codigo: c.codigo.slice(0, 40),
      caminho: typeof c.caminho === 'string' ? c.caminho : '',
      utm: limparUtm({
        source: c.utm_source,
        medium: c.utm_medium,
        campaign: c.utm_campaign,
        content: c.utm_content,
      }),
      visitante: await visitanteHash(segredo, req.headers.get('cf-connecting-ip') || '', agente),
      dispositivo: dispositivoDe(agente),
    })
  } catch (falha) {
    console.error('afiliado clique', falha?.message)
  }
  return resposta()
}
