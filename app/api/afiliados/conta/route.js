import { NextResponse } from 'next/server'
import { getDB, getEnv } from '@/lib/d1'
import { acharOuCriar, criarToken } from '@/lib/clientes'
import { enviarContaAfiliado, emailConfigurado } from '@/lib/email'
import { verificarTurnstile } from '@/lib/leads'
import { normalizarEmail } from '@/lib/sessao'
import { mesmaOrigem } from '@/lib/origem'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }
const erro = (msg, status) => NextResponse.json({ ok: false, erro: msg }, { status, headers: semCache })

// Máx. 5 pedidos por IP por hora. Contar e inserir na mesma instrução impede passar do limite em paralelo.
async function reservarPedido(db, ip) {
  await db.prepare("DELETE FROM afiliados_conta_tentativas WHERE criado_em <= datetime('now', '-1 hour')").run()
  const r = await db
    .prepare(
      `INSERT INTO afiliados_conta_tentativas (ip)
       SELECT ? WHERE (SELECT COUNT(*) FROM afiliados_conta_tentativas
         WHERE ip = ? AND criado_em > datetime('now', '-1 hour')) < 5
       RETURNING id`,
    )
    .bind(ip, ip)
    .first()
  return Boolean(r)
}

// Quem ainda não tem conta pede o acesso à área do afiliado. A resposta é sempre
// a mesma (200 ok), exista o e-mail ou não. A conta criada aqui NÃO libera o
// acervo: quem decide isso é temCompra() (compra paga).
export async function POST(req) {
  if (!mesmaOrigem(req)) return erro('Pedido recusado.', 403)
  let corpo
  try {
    corpo = await req.json()
  } catch {
    return erro('Envie um formulário válido.', 400)
  }
  const c = corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? corpo : {}
  const nome = typeof c.nome === 'string' ? c.nome.trim().slice(0, 80) : ''
  const email = typeof c.email === 'string' ? normalizarEmail(c.email) : ''
  if (nome.length < 2) return erro('Informe seu nome.', 400)
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro('Informe um e-mail válido.', 400)

  const db = getDB()
  if (!db || !emailConfigurado()) return erro('Cadastro indisponível. Tente novamente mais tarde.', 503)
  const segredo = process.env.TURNSTILE_SECRET_KEY || getEnv().TURNSTILE_SECRET_KEY || ''
  const verificacao = await verificarTurnstile(req, c.turnstile, segredo, process.env.NODE_ENV, fetch)
  if (verificacao) return verificacao
  const ip = (req.headers.get('cf-connecting-ip') || '').slice(0, 64)
  if (!ip && process.env.NODE_ENV !== 'development') return erro('Não foi possível verificar sua conexão.', 503)

  try {
    if (!(await reservarPedido(db, ip))) return erro('Muitos pedidos. Tente novamente mais tarde.', 429)
    const cliente = await acharOuCriar({ email, nome })
    if (!cliente) return erro('Cadastro indisponível. Tente novamente mais tarde.', 503)
    if (!cliente.bloqueado) {
      let enviado = true
      if (cliente.supabase_id) {
        enviado = await enviarContaAfiliado({ para: email, nome })
      } else {
        const recente = await db
          .prepare(
            `SELECT 1 AS x FROM tokens WHERE cliente_id = ? AND tipo = 'criar_senha'
               AND criado_em > datetime('now', '-1 minutes') LIMIT 1`,
          )
          .bind(cliente.id)
          .first()
        if (!recente) {
          const token = await criarToken({ clienteId: cliente.id, tipo: 'criar_senha', horas: 72 })
          enviado = Boolean(token) && (await enviarContaAfiliado({ para: email, nome, token }))
        }
      }
      if (!enviado) return erro('Não foi possível enviar o e-mail agora. Tente novamente mais tarde.', 503)
    }
    return NextResponse.json({ ok: true }, { headers: semCache })
  } catch (falha) {
    console.error('afiliado conta', falha?.message)
    return erro('Cadastro indisponível. Tente novamente mais tarde.', 503)
  }
}
