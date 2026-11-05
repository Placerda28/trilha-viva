import { historicoMensal } from '@/lib/afiliados/painel'
import { ajustesDoAfiliado } from '@/lib/afiliados/saque'
import { afiliadoLogado, erro, resposta } from '@/lib/afiliados/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { falha, afiliado, db } = await afiliadoLogado()
  if (falha) return falha
  try {
    const [historico, ajustes] = await Promise.all([
      historicoMensal(db, afiliado.id),
      ajustesDoAfiliado(db, afiliado.id),
    ])
    return resposta({ ok: true, historico, ajustes })
  } catch (falhou) {
    console.error('afiliado ganhos', falhou?.message)
    return erro('Não foi possível carregar agora.', 503)
  }
}
