import { getDB, umaLinha, executar } from '@/lib/d1'
import { novoToken, resumo, normalizarEmail } from '@/lib/sessao'

export async function acharPorEmail(email) {
  return umaLinha(getDB(), 'SELECT * FROM clientes WHERE email = ?', normalizarEmail(email))
}

export async function acharOuCriar({ email, nome }) {
  const db = getDB()
  if (!db) return null
  const limpo = normalizarEmail(email)
  const achado = await acharPorEmail(limpo)
  if (achado) {
    // O nome pode chegar só na segunda compra; preenche sem sobrescrever.
    if (nome && !achado.nome) {
      await executar(db, 'UPDATE clientes SET nome = ? WHERE id = ?', String(nome).slice(0, 120), achado.id)
    }
    return achado
  }
  await executar(db, 'INSERT INTO clientes (email, nome) VALUES (?, ?)', limpo, nome ? String(nome).slice(0, 120) : null)
  return acharPorEmail(limpo)
}

// A Stripe pode avisar da mesma compra mais de uma vez. O stripe_session_id é
// único no banco, então a segunda vez não vira compra nova — e "INSERT OR
// IGNORE" evita que isso vire erro.
export async function registrarCompra({ clienteId, sessionId, paymentIntent, valor, moeda }) {
  const db = getDB()
  if (!db) return
  await executar(
    db,
    `INSERT OR IGNORE INTO compras
       (cliente_id, stripe_session_id, stripe_payment_intent, valor_centavos, moeda)
     VALUES (?, ?, ?, ?, ?)`,
    clienteId,
    sessionId,
    paymentIntent || null,
    Number(valor || 0),
    moeda || 'brl'
  )
}

function daquiAHoras(n) {
  return new Date(Date.now() + n * 3600000).toISOString().slice(0, 19).replace('T', ' ')
}

// Cria um link de uso único. O valor devolvido vai para o e-mail; no banco
// fica só o resumo dele.
export async function criarToken({ clienteId, tipo, horas }) {
  const db = getDB()
  if (!db) return null
  const token = novoToken()
  const hash = await resumo(token)
  await executar(
    db,
    'INSERT INTO tokens (cliente_id, token_hash, tipo, expira_em) VALUES (?, ?, ?, ?)',
    clienteId,
    hash,
    tipo,
    daquiAHoras(horas)
  )
  return token
}

// Confere e queima o token na mesma passada: a marcação de "usado" acontece
// antes de qualquer outra coisa, para o mesmo link não valer duas vezes se a
// pessoa clicar duas vezes seguidas.
export async function usarToken({ token, tipo }) {
  const db = getDB()
  if (!db || !token) return null
  const hash = await resumo(token)
  const linha = await umaLinha(
    db,
    `SELECT t.id, t.cliente_id, c.email, c.nome
       FROM tokens t
       JOIN clientes c ON c.id = t.cliente_id
      WHERE t.token_hash = ? AND t.tipo = ? AND t.usado_em IS NULL
        AND t.expira_em > datetime('now')`,
    hash,
    tipo
  )
  if (!linha) return null
  const r = await executar(
    db,
    "UPDATE tokens SET usado_em = datetime('now') WHERE id = ? AND usado_em IS NULL",
    linha.id
  )
  if (!r?.meta?.changes) return null
  return linha
}

// Freio contra quem fica chutando senha: 10 erros em 15 minutos trancam
// aquele e-mail por 15 minutos. Acertou, a contagem zera.
export async function podeTentar(email) {
  const db = getDB()
  if (!db) return true
  const r = await umaLinha(
    db,
    `SELECT COUNT(*) AS n FROM tentativas
      WHERE email = ? AND sucesso = 0 AND criado_em > datetime('now', '-15 minutes')`,
    normalizarEmail(email)
  )
  return Number(r?.n || 0) < 10
}

export async function anotarTentativa({ email, ip, sucesso }) {
  const db = getDB()
  if (!db) return
  await executar(
    db,
    'INSERT INTO tentativas (email, ip, sucesso) VALUES (?, ?, ?)',
    normalizarEmail(email),
    String(ip || '').slice(0, 60),
    sucesso ? 1 : 0
  )
  if (sucesso) {
    await executar(db, 'DELETE FROM tentativas WHERE email = ? AND sucesso = 0', normalizarEmail(email))
  }
}
