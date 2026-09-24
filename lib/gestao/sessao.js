import { decidirPapel } from './decidir.js'

async function resumoToken(token) {
  const dados = new TextEncoder().encode(String(token))
  const bruto = await crypto.subtle.digest('SHA-256', dados)
  let hex = ''
  for (const byte of new Uint8Array(bruto)) hex += byte.toString(16).padStart(2, '0')
  return hex
}

// Única regra de sessão da gestão. Middleware e handlers passam por esta
// mesma consulta para não existir uma porta com critério diferente da outra.
export async function adminPeloToken(db, token, adminMaster) {
  if (!db || !token) return null
  const hash = await resumoToken(token)
  const cliente = await db
    .prepare(`
      SELECT
        c.id,
        c.email,
        c.nome,
        c.bloqueado,
        e.id AS equipe_id,
        e.precisa_trocar_senha
        FROM sessoes s
        JOIN clientes c ON c.id = s.cliente_id
        LEFT JOIN equipe e
          ON e.email = lower(trim(c.email)) AND e.ativo = 1
       WHERE s.token_hash = ?
         AND s.expira_em > datetime('now')
         AND c.bloqueado = 0
       LIMIT 1`)
    .bind(hash)
    .first()

  const papel = decidirPapel({ cliente, adminMaster })
  if (!papel) return null
  return {
    papel,
    cliente: { id: cliente.id, email: cliente.email, nome: cliente.nome },
    precisa_trocar_senha: papel === 'membro'
      ? Boolean(Number(cliente.precisa_trocar_senha))
      : false,
  }
}

export async function papelPeloToken(db, token, adminMaster) {
  return (await adminPeloToken(db, token, adminMaster))?.papel || null
}
