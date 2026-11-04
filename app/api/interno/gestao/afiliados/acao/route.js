import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { emailDe, resposta } from '@/lib/gestao/saques-rota'
import { lerJson } from '@/lib/afiliados/rota'
import { executarAcao } from '@/lib/afiliados/gestao-acoes'
import { enviarEmailSaque } from '@/lib/afiliados/saques-email'
import { montarAfiliadoAprovado } from '@/lib/emails-afiliado'
import { site } from '@/lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// soAdmin: master e membros entram; as ações de dinheiro, nível, código e suspensão exigem master (403 para o membro).
const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  const corpo = (await lerJson(req)) || {}
  const { id, acao } = corpo
  if (!Number.isSafeInteger(id) || id < 1) return resposta({ ok: false, erro: 'Afiliado não encontrado.' }, 404)
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)

  const quem = emailDe(admin)
  const r = await executarAcao(db, id, String(acao || ''), corpo, { quem, papel: admin.papel, siteUrl: site.url })
  if (!r.ok) return resposta({ ok: false, erro: r.erro, ...(r.campo ? { campo: r.campo } : {}) }, r.status)

  await gravarRegistro(db, { quem, ...r.registro })
  const { ok, registro, email, ...resto } = r // eslint-disable-line no-unused-vars
  let enviado
  if (email) {
    try {
      enviado = await enviarEmailSaque(montarAfiliadoAprovado(email, process.env))
    } catch (falhou) {
      console.error('afiliado aprovado e-mail', falhou?.message)
      enviado = false
    }
  }
  return resposta({ ok: true, ...resto, ...(enviado === undefined ? {} : { email_enviado: enviado }) })
}

export const POST = soAdmin(post)
export const GET = naoEncontrado
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
