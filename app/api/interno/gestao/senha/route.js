import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { trocarSenha } from '@/lib/senhas'
import {
  concluirTrocaSenha,
  normalizarEmailEquipe,
  supabaseIdDoCliente,
  validarNovaSenha,
} from '@/lib/gestao/equipe'
import { gravarRegistro } from '@/lib/gestao/registro'
import {
  cabecalhosPrivados,
  naoEncontrado,
  soAdminInclusive,
} from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const indisponivel = () => NextResponse.json(
  { ok: false, erro: 'Não foi possível trocar a senha agora.' },
  { status: 503, headers: cabecalhosPrivados }
)

const post = async (req, admin) => {
  if (!mesmaOrigem(req) || admin.papel !== 'membro') return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* corpo inválido cai na validação abaixo */
  }
  const validacao = validarNovaSenha(corpo.nova)
  if (!validacao.ok) {
    return NextResponse.json(
      { ok: false, erro: validacao.erro, campo: validacao.campo },
      { status: 400, headers: cabecalhosPrivados }
    )
  }

  const db = getDB()
  if (!db) return indisponivel()
  const supabaseId = await supabaseIdDoCliente(db, admin.cliente.id)
  if (!supabaseId) return indisponivel()

  let alterada
  try {
    alterada = await trocarSenha({ id: supabaseId, senha: validacao.senha })
  } catch {
    return indisponivel()
  }
  if (!alterada?.ok) return indisponivel()

  const email = normalizarEmailEquipe(admin.cliente.email)
  if (!(await concluirTrocaSenha(db, email))) return naoEncontrado()
  await gravarRegistro(db, {
    quem: email,
    acao: 'senha_trocada',
    alvo: email,
  })
  return NextResponse.json({ ok: true }, { headers: cabecalhosPrivados })
}

export const GET = naoEncontrado
export const POST = soAdminInclusive(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
