// Cenário de dados da Fase 8A (Dashboard e Financeiro). Usado pelos testes e por
// scripts/afiliados/conferencia.mjs. Os dados são DECLARATIVOS: quem confere os números faz a conta
// em cima destas listas, sem chamar as funções do sistema.
//
// Período do teste: 01/11/2026 a 30/11/2026 (Brasília). "Agora" = 30/11/2026 12:00 em Brasília.
// Período anterior (mesmo tamanho, 30 dias): 02/10/2026 a 31/10/2026.
import { estornarVenda, gravarComissaoBase } from '../../lib/afiliados/comissao.js'
import { fecharMes } from '../../lib/afiliados/fechamento.js'

export const AGORA = new Date('2026-11-30T15:00:00Z')
export const DE = '2026-11-01'
export const ATE = '2026-11-30'

export const AFILIADOS = [
  { chave: 'A1', nome: 'Ana Lima', status: 'ativo', criado: '2026-09-01 12:00:00' },
  { chave: 'A2', nome: '=HYPERLINK(x)', status: 'ativo', criado: '2026-11-05 12:00:00' },
  { chave: 'A3', nome: 'Caio Rocha', status: 'ativo', criado: '2026-09-01 12:00:00' },
  { chave: 'A4', nome: 'Duda Souza', status: 'suspenso', criado: '2026-09-01 12:00:00' },
  { chave: 'A5', nome: 'Eva Dias', status: 'pendente', criado: '2026-11-05 12:00:00' },
  { chave: 'A6', nome: 'Fabio Reis', status: 'ativo', criado: '2026-09-01 12:00:00' },
]

// Toda venda custa R$ 79,90 no cartão/Pix. liq = líquido que o Mercado Pago repassou (null = venda antiga sem taxa).
// estado: 'cancelada' = reembolso antes do fechamento; 'estornada' = reembolso depois do valor pronto (estorno de -R$ 15).
export const VENDAS = [
  { af: 'A1', quando: '2026-11-10T15:00:00Z', n: 40, liq: 7500, forma: 'pix' },
  { af: 'A1', quando: '2026-11-12T15:00:00Z', n: 8, liq: 7500, forma: 'pix' },
  { af: 'A1', quando: '2026-10-20T15:00:00Z', n: 4, liq: 7500, forma: 'pix' },
  { af: 'A1', quando: '2026-11-01T02:30:00Z', n: 1, liq: 7500, forma: 'pix' }, // 31/10 23:30 em Brasília: é de outubro
  { af: 'A2', quando: '2026-11-05T15:00:00Z', n: 1, liq: 7500, forma: 'pix' },
  { af: 'A2', quando: '2026-11-06T15:00:00Z', n: 1, liq: 7500, forma: 'pix' },
  { af: 'A2', quando: '2026-12-01T02:30:00Z', n: 1, liq: null, forma: 'cartao' }, // 30/11 23:30 em Brasília: é de novembro
  { af: 'A2', quando: '2026-11-05T16:00:00Z', n: 1, liq: 7500, forma: 'pix', estado: 'cancelada', refundadoEm: '2026-11-15T12:00:00Z' },
  { af: 'A3', quando: '2026-11-14T15:00:00Z', n: 25, liq: 7500, forma: 'cartao' },
  { af: 'A3', quando: '2026-11-15T15:00:00Z', n: 25, liq: 7500, forma: 'cartao' },
  { af: 'A3', quando: '2026-11-14T16:00:00Z', n: 1, liq: 7500, forma: 'cartao', estado: 'estornada', refundadoEm: '2026-11-25T14:00:00Z' },
  { af: 'A4', quando: '2026-10-10T15:00:00Z', n: 20, liq: 7500, forma: 'pix' },
  // vendas diretas (sem afiliado)
  { af: null, quando: '2026-11-10T15:00:00Z', n: 2, liq: 7500, forma: 'pix' },
  { af: null, quando: '2026-11-20T15:00:00Z', n: 1, liq: 7500, forma: 'pix' },
  { af: null, quando: '2026-11-20T15:00:00Z', n: 1, liq: 7500, forma: 'cartao' },
  { af: null, quando: '2026-11-20T15:00:00Z', n: 1, liq: 7500, forma: null },
  { af: null, quando: '2026-10-15T15:00:00Z', n: 10, liq: 7500, forma: 'pix' },
]

export const AJUSTES = [{ af: 'A2', valor: -500, quando: '2026-11-20T12:00:00Z' }]
export const CLIQUES = [
  { af: 'A1', n: 5, quando: '2026-11-10T12:00:00Z' },
  { af: 'A2', n: 2, quando: '2026-11-11T12:00:00Z' },
  { af: 'A1', n: 1, quando: '2026-10-10T12:00:00Z' },
]
export const EVENTOS = [
  { af: 'A1', evento: 'checkout_iniciado', n: 3, quando: '2026-11-09T12:00:00Z' },
  { af: 'A3', evento: 'checkout_iniciado', n: 1, quando: '2026-11-13T12:00:00Z' },
  { af: 'A1', evento: 'checkout_iniciado', n: 1, quando: '2026-10-09T12:00:00Z' },
  { af: 'A2', evento: 'reembolso', n: 1, quando: '2026-11-15T12:00:00Z' },
  { af: 'A3', evento: 'reembolso', n: 1, quando: '2026-11-25T14:00:00Z' },
  { af: 'A3', evento: 'chargeback', n: 1, quando: '2026-11-26T12:00:00Z' },
]
export const SAQUES = [
  { af: 'A2', status: 'solicitado', valor: 12345, pedido: '2026-11-25T12:00:00Z', pagoEm: null },
  { af: 'A4', status: 'pago', valor: 40000, pedido: '2026-11-10T12:00:00Z', pagoEm: '2026-11-20T15:00:00Z', chave: '+5527999990000', titular: 'Duda Souza', cpfTitular: '12345678901' },
  { af: 'A1', status: 'pago', valor: 20000, pedido: '2026-10-10T12:00:00Z', pagoEm: '2026-10-15T15:00:00Z', chave: 'ana@teste.com', titular: 'Ana Lima', cpfTitular: '10987654321' },
]

const sql = (d) => d.replace('T', ' ').replace('Z', '').slice(0, 19)

// Monta tudo num D1 em memória (D1Local) e fecha outubro, como o robô faria em 30/11.
export async function montarCenario(db) {
  const b = db.banco
  const comprador = Number(b.prepare("INSERT INTO clientes (email) VALUES ('comprador@t.com') RETURNING id").get().id)
  const ids = {}
  AFILIADOS.forEach((a, i) => {
    const cli = Number(b.prepare('INSERT INTO clientes (email) VALUES (?) RETURNING id').get(`afiliado${i + 1}@t.com`).id)
    const id = Number(
      b
        .prepare('INSERT INTO afiliados (cliente_id, codigo, status, nome, cpf, telefone, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id')
        .get(cli, `COD${i + 1}XXX`, a.status, a.nome, String(11111111100 + i), `2799999900${i}`, a.criado).id,
    )
    ids[a.chave] = id
    const chave = a.chave === 'A4' ? '+5527999990000' : `chave${i + 1}@teste.com`
    b.prepare("INSERT INTO afiliados_pix (afiliado_id, tipo_chave, chave, titular_nome, titular_cpf) VALUES (?, 'email', ?, ?, ?)").run(id, chave, a.nome, String(11111111100 + i))
  })
  let seq = 0
  const refund = []
  for (const v of VENDAS) {
    for (let i = 0; i < v.n; i++) {
      seq += 1
      const afiliadoId = v.af ? ids[v.af] : null
      const compraId = Number(
        b
          .prepare(
            `INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, criado_em, forma_pagamento, afiliado_id, bruto_centavos, taxa_mp_centavos, liquido_centavos)
             VALUES (?, ?, 7990, 'pago', ?, ?, ?, ?, ?, ?) RETURNING id`,
          )
          .get(comprador, `mp_${seq}`, sql(v.quando), v.forma, afiliadoId, v.liq == null ? null : 7990, v.liq == null ? null : 490, v.liq).id,
      )
      if (afiliadoId) await gravarComissaoBase(db, { afiliadoId, compraId, aprovadoEm: new Date(v.quando) })
      if (v.estado) refund.push({ v, compraId, afiliadoId })
    }
  }
  for (const r of refund) {
    b.prepare("UPDATE compras SET status = 'reembolsado' WHERE id = ?").run(r.compraId)
    if (r.v.estado === 'cancelada') await estornarVenda(db, r.compraId, new Date(r.v.refundadoEm))
    else {
      b.prepare(
        `INSERT INTO afiliados_lancamentos (afiliado_id, compra_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, descricao, criado_em)
         VALUES (?, ?, 'estorno', '2026-11', -1500, 'pendente', ?, 'Estorno', ?)`,
      ).run(r.afiliadoId, r.compraId, sql(r.v.refundadoEm), sql(r.v.refundadoEm))
    }
  }
  for (const a of AJUSTES) {
    b.prepare(
      `INSERT INTO afiliados_lancamentos (afiliado_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, descricao, criado_em)
       VALUES (?, 'ajuste', '2026-11', ?, 'pendente', ?, 'Ajuste manual', ?)`,
    ).run(ids[a.af], a.valor, sql(a.quando), sql(a.quando))
  }
  let h = 0
  for (const c of CLIQUES) {
    for (let i = 0; i < c.n; i++) {
      h += 1
      b.prepare('INSERT INTO afiliados_cliques (afiliado_id, criado_em, visitante_hash) VALUES (?, ?, ?)').run(ids[c.af], sql(c.quando), `h${h}`)
    }
  }
  for (const e of EVENTOS) {
    for (let i = 0; i < e.n; i++) b.prepare('INSERT INTO afiliados_eventos (afiliado_id, evento, criado_em) VALUES (?, ?, ?)').run(ids[e.af], e.evento, sql(e.quando))
  }
  let k = 0
  for (const s of SAQUES) {
    k += 1
    const snap = JSON.stringify({ tipo_chave: 'email', chave: s.chave || 'x@t.com', titular_nome: s.titular || 'T', titular_cpf: s.cpfTitular || '00000000000' })
    b.prepare(
      `INSERT INTO afiliados_saques (afiliado_id, chave, valor_centavos, status, pix_snapshot, pedido_em, pago_em, pago_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(ids[s.af], `saque-${k}`, s.valor, s.status, snap, sql(s.pedido), s.pagoEm ? sql(s.pagoEm) : null, s.pagoEm ? 'master@t.com' : null)
  }
  // Outubro fecha em 30/11 (passou do dia 8): A4 vira Prata (bônus de R$ 100) e A1 fica Bronze (sem bônus).
  await fecharMes(db, '2026-10', AGORA)
  return ids
}
