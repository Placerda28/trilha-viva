// Pedidos da conta (/minha-conta/pedidos). Uma consulta por cliente, com LIMIT.
// Sem `@/`: o teste roda no Node puro. Só devolve o que a tela mostra: nada de
// UTM, cupom, afiliado nem ids do Mercado Pago. A marca `teste` só tira a compra
// das métricas da gestão: quem pagou vê o pedido (antes sumia e a tela dizia
// "nenhuma compra" com o acesso já liberado).
export async function pedidosDoCliente(db, clienteId) {
  const { results } = await db
    .prepare(
      `SELECT id, criado_em, valor_centavos, forma_pagamento, status
         FROM compras
        WHERE cliente_id = ? AND status IN ('pago', 'reembolsado')
        ORDER BY criado_em DESC, id DESC
        LIMIT 50`,
    )
    .bind(clienteId)
    .all()
  return results.map((c) => ({
    id: Number(c.id),
    criadoEm: c.criado_em,
    valorCentavos: Number(c.valor_centavos || 0),
    forma: c.forma_pagamento || null,
    status: c.status,
  }))
}

export const ROTULO_FORMA = { pix: 'Pix', cartao: 'Cartão', outro: 'Mercado Pago' }

// Dia de Brasília (UTC−3) em dd/mm/aaaa. O D1 grava 'AAAA-MM-DD HH:MM:SS' em UTC.
export function dataBrasilia(valor) {
  const t = String(valor || '').trim()
  if (!t) return ''
  const d = new Date(t.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return ''
  const iso = new Date(d.getTime() - 3 * 3600000).toISOString()
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

// 8990 -> "R$ 89,90"
export function valorEmReais(centavos) {
  const c = Math.round(Number(centavos) || 0)
  const inteiro = Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${inteiro},${String(c % 100).padStart(2, '0')}`
}
