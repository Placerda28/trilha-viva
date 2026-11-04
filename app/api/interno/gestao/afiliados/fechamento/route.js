import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { cabecalhosPrivados, naoEncontrado, soAdmin, soMaster } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { fecharMes } from '@/lib/afiliados/fechamento'
import { MES_VALIDO, relatorioDoMes } from '@/lib/afiliados/relatorio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Teto do botão manual: maior que o do robô (25), mas ainda limitado (CPU).
const LIMITE_MANUAL = 200

const resposta = (corpo, status = 200) => NextResponse.json(corpo, { status, headers: cabecalhosPrivados })
const indisponivel = () => resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
const mesInvalido = () => resposta({ ok: false, erro: 'Informe o mês no formato AAAA-MM.', campo: 'mes' }, 400)

const get = async (req) => {
  const mes = new URL(req.url).searchParams.get('mes') || ''
  if (!MES_VALIDO.test(mes)) return mesInvalido()
  const db = getDB()
  if (!db) return indisponivel()
  return resposta({ ok: true, ...(await relatorioDoMes(db, mes)) })
}

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* corpo inválido cai na validação do mês */
  }
  const mes = String(corpo?.mes || '')
  if (!MES_VALIDO.test(mes)) return mesInvalido()
  const db = getDB()
  if (!db) return indisponivel()

  const r = await fecharMes(db, mes, new Date(), { limite: LIMITE_MANUAL })
  if (r.erro) return resposta({ ok: false, erro: r.erro, campo: 'mes' }, 400)
  await gravarRegistro(db, {
    quem: String(admin.cliente.email || '').trim().toLowerCase(),
    acao: 'afiliados_fechamento',
    alvo: mes,
    detalhe: { fechados: r.fechados.length, pendentes: r.pendentes?.length || 0 },
  })
  // Os e-mails de resumo saem na próxima rodada do robô (até 10 min), pela mesma regra idempotente.
  return resposta({
    ok: true,
    fechados: r.fechados.length,
    pendentes: r.pendentes || [],
    restam: Boolean(r.restam),
    relatorio: await relatorioDoMes(db, mes),
  })
}

export const GET = soAdmin(get)
export const POST = soMaster(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
