import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import {
  buscaValida,
  clienteDaLinha,
  consultarClientes,
  consultarClientesCsv,
  paginaValida,
} from '../../lib/gestao/clientes.js'
import {
  comprasMpSemForma,
  consultarItensPeriodo,
  consultarPeriodoCsv,
  consultarResumoPeriodo,
} from '../../lib/gestao/periodo.js'

class D1Local {
  constructor(banco) {
    this.banco = banco
    this.consultas = 0
  }

  prepare(sql) {
    this.consultas += 1
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novosValores) {
        valores = novosValores
        return this
      },
      async all() {
        return { results: preparada.all(...valores) }
      },
      async first() {
        return preparada.get(...valores) || null
      },
    }
  }
}

function bancoComDados() {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0000_esquema_atual.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0001_gestao_fase1.sql', 'utf8'))
  banco.exec(`
    INSERT INTO clientes (id, email, nome, bloqueado, supabase_id, criado_em) VALUES
      (1, 'master@example.com', 'Master 100%', 0, 'sup_1', '2026-09-20 12:00:00'),
      (2, 'comum_test@example.com', 'Comum', 0, NULL, '2026-09-21 12:00:00'),
      (3, 'bloqueado@example.com', 'Bloqueado', 1, 'sup_3', '2026-09-22 12:00:00'),
      (4, 'semcompra@example.com', 'Sem compra', 0, NULL, '2026-09-23 12:00:00');
    INSERT INTO compras
      (cliente_id, stripe_session_id, valor_centavos, moeda, status, criado_em, forma_pagamento)
    VALUES
      (1, 'mp_1000001', 19700, 'brl', 'pago', '2026-09-24 02:30:00', 'pix'),
      (1, 'cs_test_123456789012345678901234567890', 9900, 'brl', 'pago', '2026-09-24 15:00:00', NULL),
      (2, 'mp_1000002', 5000, 'brl', 'pendente', '2026-09-26 16:00:00', NULL),
      (2, 'mp_1000003', 3000, 'brl', 'pago', '2026-09-25 03:00:00', 'outro'),
      (3, 'mp_1000004', 7000, 'brl', 'pago', '2026-09-26 02:59:59', NULL);
    INSERT INTO downloads (cliente_id, arquivo, criado_em) VALUES
      (1, 'a.zip', '2026-09-24 10:00:00'),
      (1, 'b.zip', '2026-09-24 11:00:00'),
      (2, 'c.zip', '2026-09-25 11:00:00');
  `)
  return banco
}

test('migração acrescenta forma e índice', () => {
  const banco = bancoComDados()
  const colunas = banco.prepare('PRAGMA table_info(compras)').all().map((linha) => linha.name)
  const indice = banco
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_compras_status_data'")
    .get()
  assert.ok(colunas.includes('forma_pagamento'))
  assert.equal(indice.name, 'idx_compras_status_data')
})

test('parâmetros de clientes têm limites seguros', () => {
  assert.equal(paginaValida('2'), 2)
  assert.equal(paginaValida('0'), 1)
  assert.equal(paginaValida('1.5'), 1)
  assert.equal(paginaValida('999999999999999999999'), 1)
  assert.equal(buscaValida('a'.repeat(100)).length, 80)
})

test('clientes usa uma consulta para a página e uma para o total', async () => {
  const d1 = new D1Local(bancoComDados())
  const resultado = await consultarClientes(d1, { q: '', pagina: 1 })
  assert.equal(d1.consultas, 2)
  assert.equal(resultado.total, 3)
  assert.deepEqual(resultado.linhas.map((linha) => linha.id), [2, 3, 1])
  assert.equal(resultado.linhas[0].compra_status, 'pago')
  assert.equal(resultado.linhas[0].compra_valor_centavos, 3000)
  assert.equal(resultado.linhas[2].downloads, 2)
  assert.equal(clienteDaLinha(resultado.linhas[2]).compra.em, '2026-09-24T15:00:00Z')
})

test('busca trata porcentagem e sublinhado como texto literal', async () => {
  const porPorcentagem = await consultarClientes(new D1Local(bancoComDados()), { q: '100%', pagina: 1 })
  assert.deepEqual(porPorcentagem.linhas.map((linha) => linha.id), [1])

  const porSublinhado = await consultarClientes(new D1Local(bancoComDados()), { q: 'comum_test', pagina: 1 })
  assert.deepEqual(porSublinhado.linhas.map((linha) => linha.id), [2])
})

test('CSV de clientes infere cartão legado sem consultar operadora', async () => {
  const linhas = await consultarClientesCsv(new D1Local(bancoComDados()), '')
  const master = linhas.find((linha) => linha.id === 1)
  assert.equal(master.compra_forma, 'cartao')
  assert.equal(linhas.length, 3)
})

test('período lista uma linha por compra paga e calcula os mesmos totais do SELECT direto', async () => {
  const banco = bancoComDados()
  const d1 = new D1Local(banco)
  const periodo = {
    inicioUtc: '2026-09-23 03:00:00',
    fimUtc: '2026-09-27 03:00:00',
    pagina: 1,
  }
  const itens = await consultarItensPeriodo(d1, periodo)
  assert.equal(itens.total, 4)
  assert.equal(itens.linhas.length, 4)
  assert.ok(itens.linhas.every((linha) => linha.compra_status === 'pago'))

  const resumo = await consultarResumoPeriodo(d1, periodo)
  const direto = banco.prepare(`
    SELECT COUNT(*) AS compras, COUNT(DISTINCT cliente_id) AS clientes,
           SUM(valor_centavos) AS bruto_centavos
      FROM compras
     WHERE status = 'pago' AND criado_em >= ? AND criado_em < ?
     LIMIT 1`).get(periodo.inicioUtc, periodo.fimUtc)
  assert.equal(resumo.totais.compras, direto.compras)
  assert.equal(resumo.totais.clientes, direto.clientes)
  assert.equal(resumo.totais.bruto_centavos, direto.bruto_centavos)
  assert.equal(resumo.totais.ticket_medio_centavos, 9900)
  assert.deepEqual(resumo.dias.map((linha) => linha.chave), [
    '2026-09-23',
    '2026-09-24',
    '2026-09-25',
  ])
})

test('busca no cache do período tem LIMIT e CSV traz no máximo as pagas', async () => {
  const d1 = new D1Local(bancoComDados())
  const periodo = { inicioUtc: '2026-09-23 03:00:00', fimUtc: '2026-09-27 03:00:00' }
  const faltantes = await comprasMpSemForma(d1, { ...periodo, excluir: [], limite: 1 })
  assert.equal(faltantes.length, 1)
  assert.equal(faltantes[0].stripe_session_id, 'mp_1000004')

  const csv = await consultarPeriodoCsv(d1, periodo)
  assert.equal(csv.length, 4)
  assert.equal(csv.find((linha) => linha.email === 'master@example.com' && linha.compra_valor_centavos === 9900).compra_forma, 'cartao')
})
