import { NextResponse } from 'next/server'
import { usarToken } from '@/lib/clientes'
import { acharPorEmail as acharNaSupabase, trocarSenha, senhasConfiguradas } from '@/lib/senhas'
import { criarSessao } from '@/lib/sessao'
import { getDB, executar } from '@/lib/d1'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }
const erro = (msg, status) => NextResponse.json({ ok: false, erro: msg }, { status, headers: semCache })

export async function POST(req) {
  if (!senhasConfiguradas()) return erro('Serviço indisponível no momento.', 503)

  let corpo = {}
  try {
    corpo = await req.json()
  } catch {
    /* validação abaixo */
  }

  const senha = String(corpo.senha || '')
  if (senha.length < 8) return erro('A senha precisa ter pelo menos 8 caracteres.', 400)
  if (senha.length > 200) return erro('Senha longa demais.', 400)

  const linha = await usarToken({ token: String(corpo.token || ''), tipo: 'recuperar' })
  if (!linha) return erro('Este link já foi usado ou venceu. Peça um novo em "Esqueci minha senha".', 400)

  const naSupabase = await acharNaSupabase(linha.email)
  if (!naSupabase) return erro('Conta não encontrada. Fale com o suporte.', 404)

  const trocou = await trocarSenha({ id: naSupabase.id, senha })
  if (!trocou.ok) return erro('Não consegui trocar a senha agora. Tente de novo em instantes.', 502)

  // Trocar a senha derruba quem estiver logado nesta conta em outros
  // aparelhos. É o esperado: se a troca foi porque alguém entrou sem permissão,
  // o acesso dele morre aqui.
  await executar(getDB(), 'DELETE FROM sessoes WHERE cliente_id = ?', linha.cliente_id)

  await criarSessao(linha.cliente_id, req)
  return NextResponse.json({ ok: true }, { headers: semCache })
}
