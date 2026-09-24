import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import {
  criarCupom,
  listarCupons,
  validarCriacaoCupom,
} from '@/lib/gestao/cupons'
import {
  adminAtual,
  cabecalhosPrivados,
  naoEncontrado,
  soAdmin,
} from '@/lib/gestao/permissao'
import { site } from '@/lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const indisponivel = () => NextResponse.json(
  { ok: false, erro: 'Banco indisponível no momento.' },
  { status: 503, headers: cabecalhosPrivados }
)

const get = async () => {
  const db = getDB()
  if (!db) return indisponivel()
  return NextResponse.json(
    { ok: true, itens: await listarCupons(db) },
    { headers: cabecalhosPrivados }
  )
}

const post = async (req) => {
  // A origem é conferida depois da sessão. Para quem está de fora, tanto uma
  // sessão ruim quanto um POST vindo de outro site parecem o mesmo 404 comum.
  if (!mesmaOrigem(req)) return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* corpo inválido cai na validação de código abaixo */
  }

  const validacao = validarCriacaoCupom(corpo, Math.round(site.price * 100))
  if (!validacao.ok) {
    return NextResponse.json(
      { ok: false, erro: validacao.erro, campo: validacao.campo },
      { status: 400, headers: cabecalhosPrivados }
    )
  }

  const db = getDB()
  if (!db) return indisponivel()
  const admin = await adminAtual()
  if (!admin) return naoEncontrado()

  try {
    const cupom = await criarCupom(
      db,
      validacao.dados,
      String(admin.cliente.email || '').trim().toLowerCase()
    )
    if (!cupom) return indisponivel()
    return NextResponse.json(
      { ok: true, cupom },
      { status: 201, headers: cabecalhosPrivados }
    )
  } catch (erro) {
    if (/unique|cupons\.codigo/i.test(String(erro?.message || erro))) {
      return NextResponse.json(
        { ok: false, erro: 'Já existe um cupom com esse código.', campo: 'codigo' },
        { status: 409, headers: cabecalhosPrivados }
      )
    }
    throw erro
  }
}

export const GET = soAdmin(get)
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
