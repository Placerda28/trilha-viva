// Quem pediu reembolso, contestou ou abriu mediação já comprou: nenhum lembrete de carrinho
// (e-mail ou WhatsApp). Decisão do dono, 04/11/2026.
import test from 'node:test'
import assert from 'node:assert/strict'
import { criarBanco, D1Local } from '../gestao/_d1local.mjs'
import { impedimentosIniciais, impedimentosSeguimento } from '../../workers/recuperacao-carrinho/email-banco.js'
import { buscarSeguintes, encerrarPorCompraOuSaida, impedimentos } from '../../workers/recuperacao-carrinho/whatsapp-banco.js'

const EMAIL = 'maria@example.com'
const TEL = '27911110000'

function montar(status) {
  const banco = criarBanco()
  banco.exec(`INSERT INTO clientes (id, email) VALUES (1, '${EMAIL}')`)
  if (status) banco.prepare('INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status) VALUES (1, ?, 8990, ?)').run('mp_1', status)
  banco.prepare(`INSERT INTO carrinhos (id, email, nome, telefone, criado_em, status, whatsapp_enviado_em, whatsapp_etapa, proximo_whatsapp_em)
    VALUES ('c', ?, 'Maria', ?, '2026-01-15 11:00:00', 'aberto', '2026-01-15 12:00:00', 1, '2026-01-20 12:00:00')`).run(EMAIL, TEL)
  return { banco, db: new D1Local(banco) }
}

for (const [status, para] of [['pago', true], ['reembolsado', true], ['contestado', true], ['em_mediacao', true], ['rejeitado', false], [null, false]]) {
  test(`compra ${status ?? 'inexistente'}: ${para ? 'não lembra' : 'continua lembrando'} (e-mail e WhatsApp)`, async () => {
    const { db } = montar(status)
    assert.equal((await impedimentosIniciais(db, EMAIL, TEL, 'c')).temCompra, para)
    assert.equal((await impedimentosSeguimento(db, EMAIL, TEL, 'c')).temCompra, para)
    assert.equal((await impedimentos(db, EMAIL, TEL, '2026-01-21 12:00:00', 'c')).temCompra, para)
    const [seguinte] = await buscarSeguintes(db, null, '2026-01-21 12:00:00')
    assert.equal(Boolean(Number(seguinte.tem_compra)), para)
    await encerrarPorCompraOuSaida(db, '2026-01-21 12:00:00', { log() {} })
    const c = db.banco.prepare("SELECT whatsapp_motivo, whatsapp_encerrado_em FROM carrinhos WHERE id = 'c'").get()
    assert.equal(c.whatsapp_motivo, para ? 'comprou' : null)
    assert.equal(Boolean(c.whatsapp_encerrado_em), para)
  })
}
