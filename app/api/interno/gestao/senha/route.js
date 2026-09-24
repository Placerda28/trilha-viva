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
import { cookies } from 'next/headers'
import { COOKIE, resumo } from '@/lib/sessao'
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

  // Qualquer outra sessão aberta com a senha provisória (por exemplo, de
  // alguém que a descobriu e entrou antes do dono) é encerrada agora. Fica
  // só a sessão de quem acabou de trocar. Falhar aqui não pode deixar a
  // pessoa presa: a senha já foi trocada, então o erro vai para o log.
  try {
    const token = (await cookies()).get(COOKIE)?.value
    if (token) {
      await db.prepare('DELETE FROM sessoes WHERE cliente_id = ? AND token_hash != ?')
        .bind(admin.cliente.id, await resumo(token))
        .run()
    }
  } catch (erro) {
    console.error('senha: encerrar outras sessões', admin.cliente.id, erro?.message)
  }
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
