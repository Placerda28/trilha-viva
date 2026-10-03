// "Corrigir e-mail" e "Reenviar acesso" da aba Clientes. As peças de fora
// (conta de senha na Supabase, token e e-mail) chegam como parâmetro, para o
// teste trocar por versões falsas sem tocar em nada de verdade.

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

export function emailNovoValido(valor) {
  const email = String(valor || '').trim().toLowerCase()
  return email.length <= 254 && FORMATO_EMAIL.test(email) ? email : null
}

export function idClienteValido(valor) {
  const id = Number(valor)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

// Troca o e-mail do cliente e de tudo que é dele pelo e-mail: carrinhos
// (lembretes) e descadastro. Compras e sessões apontam para o cliente pelo id
// e não mudam. Se ele já criou senha, a conta da Supabase muda primeiro: sem
// isso ele não entraria com o e-mail novo.
export async function corrigirEmailCliente(db, { clienteId, novoEmail, protegidos = [] }, { trocarEmailConta }) {
  const cliente = await db.prepare(`SELECT id, email, supabase_id FROM clientes WHERE id = ? LIMIT 1`).bind(clienteId).first()
  if (!cliente) return { ok: false, status: 404, erro: 'Cliente não encontrado.' }
  const antigo = cliente.email
  if (antigo === novoEmail) return { ok: false, status: 400, erro: 'É o mesmo e-mail de agora.' }
  // O e-mail do master vem da variável ADMIN_MASTER: trocar aqui tiraria o acesso dele à gestão.
  const travados = protegidos.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)
  if (travados.includes(antigo) || travados.includes(novoEmail)) {
    return { ok: false, status: 409, erro: 'Esse é o e-mail do administrador master e não muda por aqui.' }
  }

  const conflito = await db.prepare(`
    SELECT
      EXISTS(SELECT 1 FROM clientes WHERE email = ? AND id <> ? LIMIT 1) AS de_outro,
      EXISTS(SELECT 1 FROM equipe WHERE email IN (?, ?) LIMIT 1) AS da_equipe
    LIMIT 1`).bind(novoEmail, clienteId, antigo, novoEmail).first()
  if (Number(conflito?.de_outro || 0)) {
    return { ok: false, status: 409, erro: 'Esse e-mail já pertence a outro cliente.' }
  }
  // E-mail de quem é da equipe muda pela aba Equipe (é o login da gestão).
  if (Number(conflito?.da_equipe || 0)) {
    return { ok: false, status: 409, erro: 'Esse e-mail é de alguém da equipe. Mude pela aba Equipe.' }
  }

  if (cliente.supabase_id) {
    const conta = await trocarEmailConta({ id: cliente.supabase_id, email: novoEmail })
    if (!conta.ok) {
      return {
        ok: false,
        status: conta.jaExiste ? 409 : 502,
        erro: conta.jaExiste
          ? 'Já existe uma conta de senha com esse e-mail.'
          : 'Não consegui trocar o e-mail da conta de senha agora. Tente de novo.',
      }
    }
  }

  // Tudo junto (o batch do D1 é uma transação): ou muda tudo, ou nada.
  const gravacoes = [
    db.prepare(`UPDATE clientes SET email = ? WHERE id = ? AND email = ?`).bind(novoEmail, clienteId, antigo),
    db.prepare(`UPDATE carrinhos SET email = ? WHERE email = ?`).bind(novoEmail, antigo),
    db.prepare(`UPDATE OR IGNORE descadastros SET email = ? WHERE email = ?`).bind(novoEmail, antigo),
  ]
  if (typeof db.batch === 'function') await db.batch(gravacoes)
  else for (const g of gravacoes) await g.run()

  return { ok: true, antigo, novo: novoEmail, tem_senha: Boolean(cliente.supabase_id) }
}

// O mesmo e-mail que sai depois da compra (criar a senha, 7 dias). Quem já
// criou senha recebe o link de redefinir (24 h), porque o de criar não serve.
export async function reenviarAcesso(db, clienteId, { criarToken, enviarCriarSenha, enviarRecuperarSenha }) {
  const cliente = await db.prepare(`SELECT id, email, nome, supabase_id, bloqueado FROM clientes WHERE id = ? LIMIT 1`).bind(clienteId).first()
  if (!cliente) return { ok: false, status: 404, erro: 'Cliente não encontrado.' }
  if (Number(cliente.bloqueado || 0)) return { ok: false, status: 409, erro: 'Cliente bloqueado. Libere antes de reenviar.' }
  const temCompra = await db.prepare(`SELECT 1 AS ok FROM compras WHERE cliente_id = ? AND status = 'pago' LIMIT 1`).bind(clienteId).first()
  if (!temCompra) return { ok: false, status: 409, erro: 'Este cliente não tem compra paga.' }

  const temSenha = Boolean(cliente.supabase_id)
  const token = await criarToken({
    clienteId,
    tipo: temSenha ? 'recuperar' : 'criar_senha',
    horas: temSenha ? 24 : 24 * 7,
  })
  if (!token) return { ok: false, status: 503, erro: 'Banco indisponível no momento.' }
  const saiu = temSenha
    ? await enviarRecuperarSenha({ para: cliente.email, token })
    : await enviarCriarSenha({ para: cliente.email, nome: cliente.nome, token })
  if (!saiu) return { ok: false, status: 502, erro: 'O e-mail não saiu. Tente de novo em instantes.' }
  return { ok: true, para: cliente.email, tipo: temSenha ? 'redefinir_senha' : 'criar_senha' }
}
