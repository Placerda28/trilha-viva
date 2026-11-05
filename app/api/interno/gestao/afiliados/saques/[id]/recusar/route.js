import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { naoEncontrado } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { comId, emailDe, idDe, resposta } from '@/lib/gestao/saques-rota'
import { recusar } from '@/lib/afiliados/saques-gestao'
import { enviarEmailSaque } from '@/lib/afiliados/saques-email'
import { montarSaqueRecusado } from '@/lib/emails-afiliado'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const post = async (req, admin, ctx) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  const id = await idDe(ctx)
  if (!id) return resposta({ ok: false, erro: 'Saque não encontrado.' }, 404)
  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* cai na validação */
  }
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)

  const r = await recusar(db, { saqueId: id, motivo: corpo?.motivo, quem: emailDe(admin) })
  if (!r.ok) return resposta({ ok: false, erro: r.motivo }, r.naoEncontrado ? 404 : r.jaTratado ? 409 : 400)
  const s = r.saque
  await gravarRegistro(db, {
    quem: emailDe(admin),
    acao: 'afiliado_saque_recusado',
    alvo: s.codigo,
    detalhe: { saque_id: id, valor_centavos: s.valor_centavos, motivo: r.motivo.slice(0, 200) },
  })
  let enviado = false
  try {
    enviado = await enviarEmailSaque(
      montarSaqueRecusado({ para: s.email, nome: s.nome, valor: s.valor_centavos, motivo: r.motivo }, process.env),
      { chave: `saque-recusado:${id}` },
    )
  } catch (falhou) {
    console.error('saque recusado e-mail', falhou?.message)
  }
  return resposta({ ok: true, email_enviado: enviado })
}

export const POST = comId(post)
export const GET = naoEncontrado
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
