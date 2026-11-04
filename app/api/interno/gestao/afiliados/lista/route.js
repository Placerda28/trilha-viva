import { getDB } from '@/lib/d1'
import { naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { resposta } from '@/lib/gestao/saques-rota'
import { listarAfiliados } from '@/lib/afiliados/gestao-lista'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const q = new URL(req.url).searchParams
  const lista = await listarAfiliados(db, {
    q: q.get('q'),
    status: q.get('status'),
    nivel: q.get('nivel'),
    vendeu: q.get('vendeu'),
    saldo: q.get('saldo') === '1',
    saque: q.get('saque') === '1',
    perto: q.get('perto') === '1',
    ordem: q.get('ordem'),
    dir: q.get('dir'),
    pagina: q.get('pagina'),
    mes: q.get('mes'),
  })
  return resposta({ ok: true, ...lista })
}

export const GET = soAdmin(get)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
