import { getDB } from '@/lib/d1'
import { naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { resposta } from '@/lib/gestao/saques-rota'
import { fichaDoAfiliado } from '@/lib/afiliados/gestao-ficha'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  const id = Number(new URL(req.url).searchParams.get('id'))
  if (!Number.isSafeInteger(id) || id < 1) return resposta({ ok: false, erro: 'Afiliado não encontrado.' }, 404)
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const ficha = await fichaDoAfiliado(db, id)
  if (!ficha) return resposta({ ok: false, erro: 'Afiliado não encontrado.' }, 404)
  return resposta({ ok: true, ...ficha })
}

export const GET = soAdmin(get)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
