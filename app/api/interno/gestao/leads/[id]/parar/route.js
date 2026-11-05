import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { naoEncontrado } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { comId, emailDe, idDe, resposta } from '@/lib/gestao/saques-rota'
import { pararLead } from '@/lib/gestao/leads-robo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const post = async (req, admin, ctx) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  const id = await idDe(ctx)
  if (!id) return resposta({ ok: false, erro: 'Lead inválido.' }, 400)
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const r = await pararLead(db, id)
  if (r === 'nao_encontrado') return resposta({ ok: false, erro: 'Lead não encontrado.' }, 404)
  if (r === 'ja_encerrado') return resposta({ ok: false, erro: 'O processo deste lead já está encerrado.' }, 409)
  await gravarRegistro(db, { quem: emailDe(admin), acao: 'lead_parado', alvo: String(id) })
  return resposta({ ok: true })
}

export const POST = comId(post)
export const GET = naoEncontrado
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
