import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { naoEncontrado } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { comId, emailDe, resposta } from '@/lib/gestao/saques-rota'
import { resolverAlerta } from '@/lib/afiliados/gestao-alertas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// [id] é a chave do alerta (ex.: saque_atrasado:12); os dois-pontos podem vir codificados na URL.
const post = async (req, admin, ctx) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  let chave = ''
  try {
    chave = decodeURIComponent(String((await ctx?.params)?.id || ''))
  } catch {
    return resposta({ ok: false, erro: 'Alerta inválido.' }, 400)
  }
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const r = await resolverAlerta(db, chave, emailDe(admin))
  if (!r.ok) {
    return r.motivo === 'invalida'
      ? resposta({ ok: false, erro: 'Alerta inválido.' }, 400)
      : resposta({ ok: false, erro: 'Alerta não encontrado ou já resolvido.' }, 404)
  }
  await gravarRegistro(db, { quem: emailDe(admin), acao: 'afiliados_alerta_resolvido', alvo: chave })
  return resposta({ ok: true })
}

export const POST = comId(post)
export const GET = naoEncontrado
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
