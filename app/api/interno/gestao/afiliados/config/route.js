import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { naoEncontrado, soAdmin, soMaster } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { emailDe, resposta } from '@/lib/gestao/saques-rota'
import { lerJson } from '@/lib/afiliados/rota'
import { dadosDaConfig, salvarConfig } from '@/lib/afiliados/gestao-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async () => {
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const config = await dadosDaConfig(db)
  if (!config) return resposta({ ok: false, erro: 'Configuração não encontrada.' }, 503)
  return resposta({ ok: true, ...config })
}

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  const corpo = (await lerJson(req)) || {}
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const quem = emailDe(admin)
  const r = await salvarConfig(db, corpo, quem)
  if (!r.ok) return resposta({ ok: false, erro: r.erro, ...(r.campo ? { campo: r.campo } : {}) }, 400)
  const alterado = Object.keys(r.mudou).length > 0
  if (alterado) await gravarRegistro(db, { quem, acao: 'afiliados_config', alvo: 'configuracao', detalhe: r.mudou })
  return resposta({ ok: true, alterado, mudou: r.mudou, ...r.config })
}

export const GET = soAdmin(get)
export const POST = soMaster(post)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
