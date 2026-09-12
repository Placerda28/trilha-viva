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

// Guarda o id que a conta tem la na Supabase, para nunca precisar procurar.
export async function salvarSupabaseId({ clienteId, supabaseId }) {
  const db = getDB()
  if (!db || !supabaseId) return
  await executar(db, 'UPDATE clientes SET supabase_id = ? WHERE id = ?', supabaseId, clienteId)
}

// Freio contra quem fica chutando senha.
//
// Dois limites, e o segundo existe por um motivo especifico: contar SO por
// e-mail deixaria qualquer pessoa trancar a conta de um cliente de proposito,
// errando a senha dele dez vezes. Entao o freio apertado e' por maquina
// (mesmo IP, mesmo e-mail) e o freio por e-mail sozinho e' mais largo.
export async function podeTentar(email, ip) {
  const db = getDB()
  if (!db) return true
  const limpo = normalizarEmail(email)

  const porMaquina = await umaLinha(
    db,
    `SELECT COUNT(*) AS n FROM tentativas
      WHERE email = ? AND ip = ? AND sucesso = 0
        AND criado_em > datetime('now', '-15 minutes')`,
    limpo,
    String(ip || '').slice(0, 60)
  )
  if (Number(porMaquina?.n || 0) >= 10) return false

  const porEmail = await umaLinha(
    db,
    `SELECT COUNT(*) AS n FROM tentativas
      WHERE email = ? AND sucesso = 0 AND criado_em > datetime('now', '-15 minutes')`,
    limpo
  )
  return Number(porEmail?.n || 0) < 30
}

// Um pedido de redefinicao por minuto por conta. Sem isso, alguem poderia
// disparar dezenas de e-mails para o endereco de um cliente so para incomodar
// -- e queimar a cota de envio no caminho.
export async function podeRecuperar(clienteId) {
  const db = getDB()
  if (!db) return true
  const r = await umaLinha(
    db,
    `SELECT COUNT(*) AS n FROM tokens
      WHERE cliente_id = ? AND tipo = 'recuperar'
        AND criado_em > datetime('now', '-1 minutes')`,
    clienteId
  )
  return Number(r?.n || 0) === 0
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
