import { mesDe } from '@/lib/afiliados/datas'
import { vendasDoMes } from '@/lib/afiliados/painel'
import { afiliadoLogado, erro, resposta } from '@/lib/afiliados/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { falha, afiliado, db } = await afiliadoLogado()
  if (falha) return falha
  const mes = new URL(req.url).searchParams.get('mes') ?? mesDe(new Date())
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return erro('Mês inválido. Use AAAA-MM.', 400)
  try {
    return resposta({ ok: true, ...(await vendasDoMes(db, afiliado.id, mes)) })
  } catch (falhou) {
    console.error('afiliado vendas', falhou?.message)
    return erro('Não foi possível carregar agora.', 503)
  }
}
