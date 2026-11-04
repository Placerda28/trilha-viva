import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { emailDe, resposta } from '@/lib/gestao/saques-rota'
import { lerJson } from '@/lib/afiliados/rota'
import { dadoCompleto } from '@/lib/afiliados/gestao-ficha'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  const corpo = (await lerJson(req)) || {}
  const id = corpo.id
  if (!Number.isSafeInteger(id) || id < 1) return resposta({ ok: false, erro: 'Afiliado não encontrado.' }, 404)
  if (corpo.campo !== 'cpf' && corpo.campo !== 'pix') return resposta({ ok: false, erro: 'Informe campo: cpf ou pix.', campo: 'campo' }, 400)
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const dado = await dadoCompleto(db, id, corpo.campo)
  if (!dado) return resposta({ ok: false, erro: 'Afiliado não encontrado.' }, 404)
  if (corpo.campo === 'pix' && !dado.pix) return resposta({ ok: false, erro: 'Este afiliado ainda não cadastrou o Pix.' }, 404)
  // Dado pessoal inteiro só sai se ficou gravado quem pediu.
  const gravou = await gravarRegistro(db, {
    quem: emailDe(admin),
    acao: 'afiliado_dado_revelado',
    alvo: dado.afiliado.codigo,
    detalhe: { campo: corpo.campo },
  })
  if (!gravou) return resposta({ ok: false, erro: 'Não foi possível registrar o pedido. Tente de novo.' }, 503)
  return resposta({ ok: true, campo: corpo.campo, ...(corpo.campo === 'cpf' ? { cpf: dado.cpf } : { pix: dado.pix }) })
}

export const POST = soAdmin(post)
export const GET = naoEncontrado
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
