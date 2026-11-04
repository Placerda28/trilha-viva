import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { naoEncontrado, soAdmin, soMaster } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { emailDe, resposta } from '@/lib/gestao/saques-rota'
import { lerJson } from '@/lib/afiliados/rota'
import { dadosDeMetas, salvarNiveis, validarNiveis } from '@/lib/afiliados/gestao-metas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AVISO = 'A tabela nova vale a partir do mês seguinte. O mês em andamento e os meses já fechados não mudam.'

const get = async () => {
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  return resposta({ ok: true, ...(await dadosDeMetas(db)) })
}

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  const corpo = (await lerJson(req)) || {}
  const v = validarNiveis(corpo.niveis)
  if (!v.ok) return resposta({ ok: false, erro: v.erro, campo: v.campo }, 400)
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const quem = emailDe(admin)
  const r = await salvarNiveis(db, v.niveis, quem)
  await gravarRegistro(db, {
    quem,
    acao: 'afiliados_metas',
    alvo: r.valido_desde_mes,
    detalhe: { niveis: r.niveis.map((n) => `${n.nome} ${n.vendas_minimas}=${n.valor_por_venda_centavos}`).join('; ').slice(0, 400) },
  })
  return resposta({ ok: true, valido_desde_mes: r.valido_desde_mes, niveis: r.niveis, aviso: AVISO })
}

export const GET = soAdmin(get)
export const POST = soMaster(post)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
