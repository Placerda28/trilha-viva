import { cookies } from 'next/headers'
import { getDB, umaLinha, executar } from '@/lib/d1'

export const COOKIE = 'tv_sessao'
const DIAS = 60

// Token aleatório de 32 bytes. O valor real vai para o cookie ou para o e-mail;
// no banco guardamos só o resumo (SHA-256). Assim, quem ler o banco não
// consegue se passar por ninguém.
export function novoToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).split('+').join('-').split('/').join('_').split('=').join('')
}

export async function resumo(texto) {
  const dados = new TextEncoder().encode(String(texto))
  const buf = await crypto.subtle.digest('SHA-256', dados)
  const bytes = new Uint8Array(buf)
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

export function normalizarEmail(v) {
  return String(v || '').trim().toLowerCase()
}

function daquiADias(n) {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 19).replace('T', ' ')
}

export async function criarSessao(clienteId, req) {
  const db = getDB()
  if (!db) return null
  const token = novoToken()
  const hash = await resumo(token)
  const ip = req?.headers?.get('cf-connecting-ip') || ''
  const agente = String(req?.headers?.get('user-agent') || '').slice(0, 200)

  await executar(
    db,
    'INSERT INTO sessoes (cliente_id, token_hash, expira_em, ip, agente) VALUES (?, ?, ?, ?, ?)',
    clienteId,
    hash,
    daquiADias(DIAS),
    ip,
    agente
  )

  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: DIAS * 86400,
  })
  return token
}

// Quem está logado agora, ou null. Uma consulta só, pelo índice.
export async function clienteAtual() {
  const db = getDB()
  if (!db) return null
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  const hash = await resumo(token)

  return umaLinha(
    db,
    `SELECT c.id, c.email, c.nome, c.bloqueado
       FROM sessoes s
       JOIN clientes c ON c.id = s.cliente_id
      WHERE s.token_hash = ? AND s.expira_em > datetime('now')`,
    hash
  )
}

export async function encerrarSessao() {
  const db = getDB()
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (token && db) {
    const hash = await resumo(token)
    await executar(db, 'DELETE FROM sessoes WHERE token_hash = ?', hash)
  }
  jar.set(COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 })
}

// Já comprou e está liberado? É esta função, e não a Supabase, que decide
// quem entra no acervo.
export async function temCompra(clienteId) {
  const db = getDB()
  const r = await umaLinha(
    db,
    "SELECT id FROM compras WHERE cliente_id = ? AND status = 'pago' LIMIT 1",
    clienteId
  )
  return Boolean(r)
}
