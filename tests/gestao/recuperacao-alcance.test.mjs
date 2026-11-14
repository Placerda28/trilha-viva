import test from 'node:test'
import assert from 'node:assert/strict'
import { criarBanco, D1Local } from './_d1local.mjs'
import { consultarRecuperacao } from '../../lib/gestao/recuperacao.js'

test('alcance de todo o histórico amplia a lista sem alterar os cartões do período', async () => {
  const banco = criarBanco()
  try {
    banco.exec(`
      INSERT INTO carrinhos (id, email, nome, telefone, criado_em, status, etapa_email, teste) VALUES
        ('antigo', 'antigo@example.com', 'Antigo', '27999990001', '2026-09-01 12:00:00', 'aberto', 0, 0),
        ('recente', 'recente@example.com', 'Recente', '27999990002', '2026-10-05 12:00:00', 'aberto', 0, 0);
    `)
    const db = new D1Local(banco)
    const periodo = { inicioUtc: '2026-10-05 03:00:00', fimUtc: '2026-10-06 03:00:00' }
    const noPeriodo = await consultarRecuperacao(db, { periodo })
    const historico = await consultarRecuperacao(db, { periodo, listaSemPeriodo: true })

    assert.deepEqual(noPeriodo.itens.map((item) => item.email), ['recente@example.com'])
    assert.deepEqual(historico.itens.map((item) => item.email), ['recente@example.com', 'antigo@example.com'])
    assert.deepEqual(historico.totais, noPeriodo.totais)
    assert.equal(noPeriodo.totais.pessoas, 1)
  } finally {
    banco.close()
  }
})
