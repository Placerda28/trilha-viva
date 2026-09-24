import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { paginaValida } from '@/lib/gestao/clientes'
import { montarSerie, validarPeriodo } from '@/lib/gestao/datas'
import { preencherFormas } from '@/lib/gestao/forma'
import {
  comprasMpSemForma,
  consultarItensPeriodo,
  consultarResumoPeriodo,
  itemPeriodoDaLinha,
} from '@/lib/gestao/periodo'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function erro(mensagem) {
  return NextResponse.json(
    { ok: false, erro: mensagem },
    { status: 400, headers: cabecalhosPrivados }
  )
}

const get = async (req) => {
  // Esta validação só roda depois de soAdmin confirmar a sessão e o papel.
  const url = new URL(req.url)
  const periodo = validarPeriodo(url.searchParams.get('de'), url.searchParams.get('ate'))
  if (!periodo.ok) return erro(periodo.erro)

  const agrupar = url.searchParams.get('agrupar') || 'dia'
  if (!['dia', 'semana', 'mes'].includes(agrupar)) {
    return erro('O agrupamento deve ser dia, semana ou mês.')
  }
  const pagina = paginaValida(url.searchParams.get('pagina'))
  const db = getDB()
  if (!db) {
    return NextResponse.json(
      { ok: false, erro: 'Banco indisponível no momento.' },
      { status: 503, headers: cabecalhosPrivados }
    )
  }

  const itens = await consultarItensPeriodo(db, { ...periodo, pagina })
  const mpNaPagina = itens.linhas.filter(
    (linha) => !linha.compra_forma && String(linha.compra_origem || '').startsWith('mp_')
  )
  const extras = await comprasMpSemForma(db, {
    ...periodo,
    excluir: mpNaPagina.map((linha) => linha.compra_id),
    limite: Math.max(0, 5 - mpNaPagina.length),
  })
  await preencherFormas([...itens.linhas, ...extras])

  // Os totais são lidos depois do cache para já refletirem as formas recém-descobertas.
  const resumo = await consultarResumoPeriodo(db, periodo)
  return NextResponse.json(
    {
      ok: true,
      de: periodo.de,
      ate: periodo.ate,
      agrupar,
      totais: resumo.totais,
      serie: montarSerie({ de: periodo.de, ate: periodo.ate, agrupar, linhas: resumo.dias }),
      pagina,
      por_pagina: itens.por_pagina,
      total_itens: itens.total,
      itens: itens.linhas.map(itemPeriodoDaLinha),
    },
    { headers: cabecalhosPrivados }
  )
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
