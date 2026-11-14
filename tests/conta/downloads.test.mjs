import test from 'node:test'
import assert from 'node:assert/strict'
import { criarBanco, D1Local } from '../gestao/_d1local.mjs'
import { downloadsDoCliente } from '../../lib/conta-downloads.js'

test('downloads: só do cliente, agrupados, sem dados privados e em ordem recente', async () => {
  const banco = criarBanco()
  try {
    banco.exec(`INSERT INTO clientes (id, email) VALUES (901, 'um@exemplo.com'), (902, 'dois@exemplo.com');
      INSERT INTO downloads (cliente_id, slug, arquivo, ip, criado_em) VALUES
      (901, 'antiga', 'segredo-a', '1.1.1.1', '2026-11-10 10:00:00'),
      (901, 'nova', 'segredo-b', '2.2.2.2', '2026-11-12 10:00:00'),
      (901, 'antiga', 'segredo-c', '3.3.3.3', '2026-11-13 10:00:00'),
      (901, NULL, 'segredo-d', '4.4.4.4', '2026-11-14 10:00:00'),
      (902, 'alheia', 'segredo-e', '5.5.5.5', '2026-11-15 10:00:00')`)
    const db = new D1Local(banco)
    const itens = await downloadsDoCliente(db, 901)
    assert.equal(db.consultas, 1)
    assert.deepEqual(itens.map((i) => ({ ...i })), [
      { slug: 'antiga', vezes: 2, ultimo: '2026-11-13 10:00:00' },
      { slug: 'nova', vezes: 1, ultimo: '2026-11-12 10:00:00' },
    ])
    assert.deepEqual(Object.keys(itens[0]).sort(), ['slug', 'ultimo', 'vezes'])
  } finally {
    banco.close()
  }
})
