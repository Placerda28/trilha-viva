import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { criarConta, acharPorEmail } from '@/lib/senhas'
import {
  adicionarMembro,
  listarEquipe,
  normalizarEmailEquipe,
  validarNovoMembro,
} from '@/lib/gestao/equipe'
import { gravarRegistro } from '@/lib/gestao/registro'
import {
  cabecalhosPrivados,
  naoEncontrado,
  soMaster,
} from '@/lib/gestao/permissao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const indisponivel = () => NextResponse.json(
  { ok: false, erro: 'Serviço indisponível no momento.' },
  { status: 503, headers: cabecalhosPrivados }
)

const get = async () => {
  const db = getDB()
  if (!db) return indisponivel()
  return NextResponse.json(
    { ok: true, itens: await listarEquipe(db) },
    { headers: cabecalhosPrivados }
  )
}

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* corpo inválido cai na validação abaixo */
  }
  // Esta rota já confirmou que o autor é o master; usar o e-mail da sessão
  // evita que uma diferença de ambiente permita cadastrá-lo como membro.
  const validacao = validarNovoMembro(corpo, admin.cliente.email)
  if (!validacao.ok) {
    return NextResponse.json(
      { ok: false, erro: validacao.erro, campo: validacao.campo },
      { status: 400, headers: cabecalhosPrivados }
    )
  }

  const db = getDB()
  if (!db) return indisponivel()
  const quem = normalizarEmailEquipe(admin.cliente.email)

  let resultado
  try {
    resultado = await adicionarMembro(db, {
      ...validacao.dados,
      criadoPor: quem,
      criarConta,
      acharPorEmail,
    })
  } catch {
    return indisponivel()
  }

  if (resultado.conflito) {
    return NextResponse.json(
      { ok: false, erro: 'Este e-mail já faz parte da equipe.', campo: 'email' },
      { status: 409, headers: cabecalhosPrivados }
    )
  }
  if (!resultado.ok) return indisponivel()

  await gravarRegistro(db, {
    quem,
    acao: 'membro_adicionado',
    alvo: resultado.membro.email,
    detalhe: { conta_existente: resultado.conta_existente },
  })
  return NextResponse.json(resultado, { status: 201, headers: cabecalhosPrivados })
}

export const GET = soMaster(get)
export const POST = soMaster(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
