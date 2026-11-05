import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { naoEncontrado } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { comId, emailDe, idDe, resposta } from '@/lib/gestao/saques-rota'
import { enviarAgora } from '@/lib/gestao/leads-robo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Não envia na requisição: marca o próximo envio do canal para já e o robô manda na próxima rodada (até 10 min).
const post = async (req, admin, ctx) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  const id = await idDe(ctx)
  if (!id) return resposta({ ok: false, erro: 'Lead inválido.' }, 400)
  let corpo = {}
  try { corpo = await req.json() } catch { /* cai na validação */ }
  const canal = corpo?.canal
  if (canal !== 'whatsapp' && canal !== 'email') {
    return resposta({ ok: false, erro: 'Informe o canal: whatsapp ou email.' }, 400)
  }
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const r = await enviarAgora(db, id, canal)
  if (r === 'nao_encontrado') return resposta({ ok: false, erro: 'Lead não encontrado.' }, 404)
  if (r === 'nada_a_enviar') return resposta({ ok: false, erro: 'Não há envio pendente neste canal para este lead.' }, 409)
  await gravarRegistro(db, { quem: emailDe(admin), acao: 'lead_enviar_agora', alvo: String(id), detalhe: { canal } })
  return resposta({ ok: true, canal, saira_na_proxima_rodada: true })
}

export const POST = comId(post)
export const GET = naoEncontrado
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
