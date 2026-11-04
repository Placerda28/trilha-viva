import { proximoSaqueEm } from '@/lib/afiliados/painel'
import { saquesDoAfiliado } from '@/lib/afiliados/saque'
import { afiliadoLogado, erro, resposta } from '@/lib/afiliados/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { falha, afiliado, db } = await afiliadoLogado()
  if (falha) return falha
  try {
    const [itens, proximo] = await Promise.all([saquesDoAfiliado(db, afiliado.id), proximoSaqueEm(db, afiliado.id)])
    return resposta({ ok: true, itens, proximoSaqueEm: proximo })
  } catch (falhou) {
    console.error('afiliado saques', falhou?.message)
    return erro('Não foi possível carregar agora.', 503)
  }
}
