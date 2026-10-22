import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { lerEstadoWhatsapp } from '@/lib/gestao/whatsapp'
import {
  consultarRecuperacao,
  filtroRecuperacaoValido,
} from '@/lib/gestao/recuperacao'
import { validarPeriodo } from '@/lib/gestao/datas'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const get = async (req) => {
  const url = new URL(req.url)
  const filtro = url.searchParams.get('filtro') || 'todos'
  if (!filtroRecuperacaoValido(filtro)) {
    return NextResponse.json(
      { ok: false, erro: 'Filtro de recuperação inválido.' },
      { status: 400, headers: cabecalhosPrivados }
    )
  }

  // De/até são opcionais: sem nenhum, os totais são de todo o histórico.
  const de = url.searchParams.get('de')
  const ate = url.searchParams.get('ate')
  const periodo = de || ate ? validarPeriodo(de, ate) : null
  if (periodo && !periodo.ok) {
    return NextResponse.json(
      { ok: false, erro: periodo.erro },
      { status: 400, headers: cabecalhosPrivados }
    )
  }

  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }

  const resultado = await consultarRecuperacao(db, {
    filtro,
    busca: url.searchParams.get('busca'),
    pagina: url.searchParams.get('pagina'),
    periodo,
    mostrarTestes: url.searchParams.get('testes') === '1',
    whatsappAtivo: (await lerEstadoWhatsapp(db)).estado === 'ativo',
  })
  return NextResponse.json({ ok: true, de: periodo?.de || null, ate: periodo?.ate || null, ...resultado }, { headers: cabecalhosPrivados })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
