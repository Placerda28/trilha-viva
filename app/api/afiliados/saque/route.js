import { mesmaOrigem } from '@/lib/origem'
import { gravarRegistro } from '@/lib/gestao/registro'
import { enviarSaqueSolicitado } from '@/lib/email'
import { pedirSaque } from '@/lib/afiliados/saque'
import { afiliadoLogado, erro, resposta } from '@/lib/afiliados/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  if (!mesmaOrigem(req)) return erro('Pedido recusado.', 403)
  const { falha, cliente, afiliado, db } = await afiliadoLogado()
  if (falha) return falha
  try {
    const r = await pedirSaque(db, afiliado.id)
    if (!r.ok) return resposta({ ok: false, motivo: r.motivo }, 409)
    await gravarRegistro(db, {
      quem: cliente.email,
      acao: 'afiliado_saque',
      alvo: afiliado.codigo,
      detalhe: { saque_id: r.saqueId, valor_centavos: r.valor_centavos },
    })
    try {
      await enviarSaqueSolicitado({
        para: process.env.ADMIN_MASTER,
        nome: afiliado.nome,
        codigo: afiliado.codigo,
        valorCentavos: r.valor_centavos,
      })
    } catch (falhou) {
      console.error('afiliado saque e-mail', falhou?.message)
    }
    return resposta({ ok: true, valor_centavos: r.valor_centavos, pedido_em: r.pedido_em })
  } catch (falhou) {
    console.error('afiliado saque', falhou?.message)
    return erro('Não foi possível pedir o saque agora. Tente novamente em instantes.', 503)
  }
}
