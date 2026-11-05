import { limparTelefone, telefoneValido } from '../carrinhos.js'
import { emailNovoValido } from './corrigir-email.js'

// Somente nomes fixos entram no SQL, nunca o texto recebido do navegador.
export function fonteCompras(mostrarTestes = false) {
  return mostrarTestes === true ? 'compras' : 'compras_reais'
}

export function fonteCarrinhos(mostrarTestes = false) {
  return mostrarTestes === true ? 'carrinhos' : 'carrinhos_reais'
}

function encerrarLembretes(db, email, motivo, somenteReais = false) {
  return db.prepare(`
    UPDATE carrinhos SET
      status = CASE WHEN status IN ('aberto', 'lembrado') THEN 'ignorado' ELSE status END,
      finalizado_em = COALESCE(finalizado_em, datetime('now')),
      finalizado_motivo = COALESCE(finalizado_motivo, ?),
      whatsapp_encerrado_em = COALESCE(whatsapp_encerrado_em, datetime('now')),
      whatsapp_motivo = ?, proximo_whatsapp_em = NULL, proximo_email_em = NULL
    WHERE email = ? ${somenteReais ? 'AND teste = 0' : ''}
      AND (status IN ('aberto', 'lembrado') OR (status = 'ignorado' AND whatsapp_encerrado_em IS NULL))
  `).bind(motivo, motivo, email)
}

export async function marcarTeste(db, { email, teste, quem }) {
  // O batch do D1 garante que compras, carrinhos e encerramento mudem juntos.
  const comandos = [
    db.prepare(`UPDATE compras SET teste = ?, teste_por = ?, teste_em = datetime('now')
      WHERE cliente_id IN (SELECT id FROM clientes WHERE email = ? LIMIT 1)`)
      .bind(teste ? 1 : 0, quem, email),
    db.prepare(`UPDATE carrinhos SET teste = ?, teste_por = ?, teste_em = datetime('now') WHERE email = ?`)
      .bind(teste ? 1 : 0, quem, email),
  ]
  // Comissão de afiliado acompanha a marcação: compra de teste não conta para a meta nem paga.
  // Só mexe em venda ainda não sacada e de mês aberto; mês fechado ou em saque fica para ajuste manual.
  // Ao desmarcar, só volta a venda de compra paga (reembolso continua cancelado).
  comandos.push(
    db.prepare(`UPDATE afiliados_lancamentos AS l SET status = ?
      WHERE l.tipo = 'venda' AND l.saque_id IS NULL AND l.status = ?
        AND l.compra_id IN (SELECT p.id FROM compras p JOIN clientes c ON c.id = p.cliente_id
                             WHERE c.email = ? ${teste ? '' : "AND p.status = 'pago'"})
        AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos f
                         WHERE f.afiliado_id = l.afiliado_id AND f.mes_referencia = l.mes_referencia)
        AND NOT EXISTS (SELECT 1 FROM afiliados_lancamentos e WHERE e.compra_id = l.compra_id AND e.tipo = 'estorno')`)
      .bind(teste ? 'cancelada' : 'pendente', teste ? 'pendente' : 'cancelada', email),
  )
  if (teste) comandos.push(encerrarLembretes(db, email, 'teste'))
  await db.batch(comandos)
  return { ok: true }
}

export async function pararLembretes(db, email) {
  await encerrarLembretes(db, email, 'gestao', true).run()
  return { ok: true }
}

export async function bloquearCliente(db, { clienteId, bloqueado, protegidos = [] }) {
  const cliente = await db.prepare('SELECT id, email FROM clientes WHERE id = ? LIMIT 1').bind(clienteId).first()
  if (!cliente) return { ok: false, status: 404, erro: 'Cliente não encontrado.' }
  if (bloqueado) {
    const email = String(cliente.email).trim().toLowerCase()
    const master = protegidos.some((valor) => String(valor || '').trim().toLowerCase() === email)
    const equipe = await db.prepare('SELECT 1 FROM equipe WHERE email = ? LIMIT 1').bind(email).first()
    if (master || equipe) return { ok: false, status: 409, erro: 'Não é permitido bloquear o administrador master nem alguém da equipe.' }
  }
  await db.prepare('UPDATE clientes SET bloqueado = ? WHERE id = ?').bind(bloqueado ? 1 : 0, clienteId).run()
  return { ok: true, email: cliente.email }
}

export function normalizarContatoTeste(valor) {
  if (typeof valor !== 'string') return null
  if (valor.includes('@')) {
    const email = emailNovoValido(valor)
    return email ? { valor: email, tipo: 'email' } : null
  }
  // A normalização tira formatação e DDI, mas não aceita letras como telefone.
  if (!/^[+() .0-9-]+$/.test(valor.trim()) || !telefoneValido(valor)) return null
  return { valor: limparTelefone(valor), tipo: 'telefone' }
}
