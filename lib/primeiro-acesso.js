// "Primeiro acesso": quem pagou, fechou a tela do Mercado Pago e nunca criou
// a senha pede aqui o link de criar senha, só com o e-mail.
//
// A tela responde SEMPRE a mesma frase, exista compra ou não, tenha passado do
// limite ou não. Assim ninguém descobre quem comprou testando e-mails.

export const PEDIDOS_POR_HORA = 3
export const VALIDADE_HORAS = 72

export const RESPOSTA_PRIMEIRO_ACESSO =
  'Se houver uma compra com este e-mail, enviamos o link para criar a senha. Ele chega em instantes.'

function emailLimpo(valor) {
  return String(valor || '').trim().toLowerCase().slice(0, 254)
}

export function emailPareceValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(emailLimpo(valor))
}

// Até 3 pedidos por hora por e-mail E por IP. O pedido só é anotado quando
// passa no limite: quem insiste não enche a tabela.
async function dentroDoLimite(db, email, ip) {
  const linha = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM pedidos_acesso
           WHERE email = ? AND criado_em > datetime('now', '-1 hour')) AS por_email,
         (SELECT COUNT(*) FROM pedidos_acesso
           WHERE ip = ? AND criado_em > datetime('now', '-1 hour')) AS por_ip
       LIMIT 1`
    )
    .bind(email, ip)
    .first()
  return Number(linha?.por_email || 0) < PEDIDOS_POR_HORA && Number(linha?.por_ip || 0) < PEDIDOS_POR_HORA
}

// Compra paga, sem senha criada e sem bloqueio. Uma consulta só.
async function compradorSemSenha(db, email) {
  return db
    .prepare(
      `SELECT c.id, c.nome
         FROM clientes c
        WHERE c.email = ?
          AND c.supabase_id IS NULL
          AND c.bloqueado = 0
          AND EXISTS (SELECT 1 FROM compras p WHERE p.cliente_id = c.id AND p.status = 'pago' LIMIT 1)
        LIMIT 1`
    )
    .bind(email)
    .first()
}

// Devolve o que aconteceu, só para o log e os testes. A rota NUNCA repassa
// isso para a tela.
//   'enviado' | 'sem_compra' | 'limite' | 'invalido' | 'falhou'
export async function pedirPrimeiroAcesso(db, { email, ip }, { criarToken, enviarCriarSenha }) {
  const limpo = emailLimpo(email)
  if (!db || !emailPareceValido(limpo)) return 'invalido'
  const ipLimpo = String(ip || 'anon').slice(0, 64)

  if (!(await dentroDoLimite(db, limpo, ipLimpo))) return 'limite'
  await db.prepare('INSERT INTO pedidos_acesso (email, ip) VALUES (?, ?)').bind(limpo, ipLimpo).run()
  // Faxina barata: pedido com mais de 1 dia não serve para nada.
  await db.prepare("DELETE FROM pedidos_acesso WHERE criado_em < datetime('now', '-1 day')").run()

  const cliente = await compradorSemSenha(db, limpo)
  if (!cliente) return 'sem_compra'

  const token = await criarToken({ clienteId: cliente.id, tipo: 'criar_senha', horas: VALIDADE_HORAS })
  if (!token) return 'falhou'
  const ok = await enviarCriarSenha({ para: limpo, nome: cliente.nome || '', token, validade: '72 horas' })
  return ok ? 'enviado' : 'falhou'
}
