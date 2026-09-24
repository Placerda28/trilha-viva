import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import {
  calcularPrecoCupom,
  codigoCupomValido,
  fimDoDiaBrasiliaUtc,
  normalizarCodigoCupom,
  registrarCompraNoBanco,
  reservarCupom,
  validarCriacaoCupom,
} from '../../lib/gestao/cupons.js'

class D1Local {
  constructor(banco) {
    this.banco = banco
  }

  prepare(sql) {
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
      async run() {
        const resultado = preparada.run(...valores)
        return {
          meta: {
            changes: Number(resultado.changes || 0),
            last_row_id: Number(resultado.lastInsertRowid || 0),
          },
        }
      },
    }
  }
}

function bancoCupons() {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0000_esquema_atual.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0001_gestao_fase1.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0002_cupons.sql', 'utf8'))
  banco.exec(`
    INSERT INTO clientes (id, email, nome) VALUES (1, 'ana@example.com', 'Ana');
    INSERT INTO cupons
      (id, codigo, tipo, valor, valido_ate, limite_usos, criado_por)
    VALUES
      (1, 'ULTIMA1', 'percentual', 100, '2099-12-31 02:59:59', 1, 'master@example.com');
  `)
  return { banco, d1: new D1Local(banco) }
}

test('preço usa centavos, arredonda e nunca fica abaixo de R$ 1,00', () => {
  assert.equal(calcularPrecoCupom(8990, 'percentual', 20), 7192)
  assert.equal(calcularPrecoCupom(8990, 'percentual', 15), 7642)
  assert.equal(calcularPrecoCupom(8990, 'percentual', 100), 100)
  assert.equal(calcularPrecoCupom(8990, 'valor', 1500), 7490)
  assert.equal(calcularPrecoCupom(8990, 'valor', 99999), 100)
})

test('código é normalizado sem diferenciar maiúsculas e minúsculas', () => {
  assert.equal(normalizarCodigoCupom('  louvor_20-a '), 'LOUVOR_20-A')
  assert.equal(codigoCupomValido('abcd'), true)
  assert.equal(codigoCupomValido('abc'), false)
  assert.equal(codigoCupomValido('COM ESPAÇO'), false)
  assert.equal(codigoCupomValido('A'.repeat(41)), false)
})

test('fim do dia de Brasília é gravado em UTC', () => {
  assert.equal(fimDoDiaBrasiliaUtc('2026-09-24'), '2026-09-25 02:59:59')
  assert.equal(fimDoDiaBrasiliaUtc('2026-02-29'), null)
})

test('validação da criação aponta o campo exato', () => {
  const agora = new Date('2026-09-24T15:00:00Z')
  const base = {
    codigo: 'LOUVOR20',
    tipo: 'percentual',
    valor: 20,
    valido_ate: '2026-12-31',
    limite_usos: 10,
  }

  for (const [campo, alteracao] of [
    ['codigo', { codigo: 'x!' }],
    ['tipo', { tipo: 'qualquer' }],
    ['valor', { valor: 0 }],
    ['valido_ate', { valido_ate: '2026-02-29' }],
    ['limite_usos', { limite_usos: 10001 }],
  ]) {
    assert.equal(
      validarCriacaoCupom({ ...base, ...alteracao }, 8990, agora).campo,
      campo
    )
  }

  assert.equal(
    validarCriacaoCupom({ ...base, tipo: 'valor', valor: 8990 }, 8990, agora).campo,
    'valor'
  )
  assert.equal(
    validarCriacaoCupom({ ...base, valido_ate: '2026-09-23' }, 8990, agora).campo,
    'valido_ate'
  )
  assert.equal(
    validarCriacaoCupom({ ...base, valido_ate: '2027-09-25' }, 8990, agora).campo,
    'valido_ate'
  )

  const valido = validarCriacaoCupom(base, 8990, agora)
  assert.equal(valido.ok, true)
  assert.deepEqual(valido.dados, {
    codigo: 'LOUVOR20',
    tipo: 'percentual',
    valor: 20,
    valido_ate: '2027-01-01 02:59:59',
    limite_usos: 10,
  })
})

test('reserva atômica deixa apenas uma pessoa pegar o último uso', async () => {
  const { banco, d1 } = bancoCupons()
  assert.equal(await reservarCupom(d1, {
    cupomId: 1,
    referencia: '11111111-1111-4111-8111-111111111111',
    precoCentavos: 100,
  }), true)
  assert.equal(await reservarCupom(d1, {
    cupomId: 1,
    referencia: '22222222-2222-4222-8222-222222222222',
    precoCentavos: 100,
  }), false)
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM cupom_reservas').get().n, 1)
})

test('pagamento repetido grava uma compra, um uso e encerra a reserva', async () => {
  const { banco, d1 } = bancoCupons()
  const referencia = '11111111-1111-4111-8111-111111111111'
  await reservarCupom(d1, { cupomId: 1, referencia, precoCentavos: 100 })
  const compra = {
    clienteId: 1,
    sessionId: 'mp_987654321',
    paymentIntent: '987654321',
    valor: 100,
    moeda: 'brl',
    forma: 'pix',
    cupom: 'ultima1',
    referencia,
  }

  assert.equal(await registrarCompraNoBanco(d1, compra), true)
  assert.equal(await registrarCompraNoBanco(d1, compra), false)

  const contagens = banco.prepare(`
    SELECT
      (SELECT COUNT(*) FROM compras WHERE stripe_session_id = 'mp_987654321') AS compras,
      (SELECT COUNT(*) FROM compras WHERE cupom = 'ULTIMA1') AS usos,
      (SELECT COUNT(*) FROM cupom_reservas WHERE referencia = ?) AS reservas
    LIMIT 1`).get(referencia)
  assert.equal(contagens.compras, 1)
  assert.equal(contagens.usos, 1)
  assert.equal(contagens.reservas, 0)
})
