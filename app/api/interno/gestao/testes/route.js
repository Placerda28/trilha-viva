import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'

import { normalizarContatoTeste } from '@/lib/gestao/testes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resposta = (corpo, status = 200) => NextResponse.json(corpo, { status, headers: cabecalhosPrivados })

const post = async (req, admin) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  let corpo = {}
  try { corpo = await req.json() } catch { /* cai na validação */ }
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const quem = String(admin.cliente.email || '').trim().toLowerCase()
  const contato = normalizarContatoTeste(corpo?.valor)
  if (!contato || !['adicionar', 'remover'].includes(corpo?.acao)) return resposta({ ok: false, erro: 'Informe a ação e um e-mail ou telefone válido.' }, 400)
  if (corpo.acao === 'adicionar') {
    await db.prepare('INSERT OR IGNORE INTO contatos_teste (valor, tipo, criado_por) VALUES (?, ?, ?)').bind(contato.valor, contato.tipo, quem).run()
  } else {
    await db.prepare('DELETE FROM contatos_teste WHERE valor = ?').bind(contato.valor).run()
  }
  await gravarRegistro(db, { quem, acao: corpo.acao === 'adicionar' ? 'contato_teste_adicionado' : 'contato_teste_removido', alvo: contato.valor })
  return resposta({ ok: true, aviso: corpo.acao === 'adicionar' ? 'Contato adicionado. Compras e carrinhos antigos não foram marcados.' : 'Contato removido. Compras e carrinhos já marcados continuam como teste.' })
}

export const GET = soAdmin(async () => {
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const resultado = await db.prepare('SELECT valor, tipo, criado_em, criado_por FROM contatos_teste ORDER BY criado_em DESC, valor LIMIT 500').all()
  return resposta({ ok: true, itens: resultado.results || [] })
})
export const POST = soAdmin(post)
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
