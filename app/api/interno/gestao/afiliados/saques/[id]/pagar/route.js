import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { naoEncontrado } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { comIdMaster, emailDe, extDe, idDe, resposta } from '@/lib/gestao/saques-rota'
import { linkDeDownload } from '@/lib/b2'
import { marcarPago } from '@/lib/afiliados/saques-gestao'
import { enviarEmailSaque } from '@/lib/afiliados/saques-email'
import { montarSaquePago } from '@/lib/emails-afiliado'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const diaBr = (d) => new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 10).split('-').reverse().join('/')

const post = async (req, admin, ctx) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  const id = await idDe(ctx)
  if (!id) return resposta({ ok: false, erro: 'Saque não encontrado.' }, 404)
  // O corpo { caminho } é aceito por compatibilidade, mas IGNORADO: vale só o comprovante gravado pelo upload.
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)

  const agora = new Date()
  const r = await marcarPago(db, { saqueId: id, quem: emailDe(admin), agora })
  if (!r.ok) return resposta({ ok: false, erro: r.motivo }, r.naoEncontrado ? 404 : r.jaTratado ? 409 : 400)
  const s = r.saque
  await gravarRegistro(db, {
    quem: emailDe(admin),
    acao: 'afiliado_saque_pago',
    alvo: s.codigo,
    detalhe: { saque_id: id, valor_centavos: s.valor_centavos },
  })

  // O pagamento já está gravado: falha de e-mail só vira aviso na resposta.
  let enviado = false
  try {
    const caminho = s.comprovante_caminho
    const nome = `comprovante-saque-${id}.${extDe(caminho)}`
    const link = await linkDeDownload(caminho, nome, 3600)
    if (link) {
      enviado = await enviarEmailSaque(
        montarSaquePago(
          { para: s.email, nome: s.nome, valor: s.valor_centavos, pagoEm: diaBr(agora), comprovanteUrl: link, comprovanteNome: nome },
          process.env,
        ),
        { chave: `saque-pago:${id}` },
      )
    }
  } catch (falhou) {
    console.error('saque pago e-mail', falhou?.message)
  }
  return resposta({ ok: true, email_enviado: enviado })
}

export const POST = comIdMaster(post)
export const GET = naoEncontrado
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
