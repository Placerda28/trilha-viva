import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import {
  calcularPrecoCupom,
  codigoCupomValido,
  fimDoDiaBrasiliaUtc,
  normalizarCodigoCupom,
  estenderReservaCupom,
  vencimentoDoLinkComCupom,
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

test('pagamento pendente segura a vaga por 4 dias', async () => {
  const { banco, d1 } = bancoCupons()
  const referencia = '33333333-3333-4333-8333-333333333333'
  await reservarCupom(d1, { cupomId: 1, referencia, precoCentavos: 100 })
  assert.equal(await estenderReservaCupom(d1, referencia), true)
  const { minutos } = banco.prepare(`
    SELECT CAST((julianday(expira_em) - julianday('now')) * 1440 AS INTEGER) AS minutos
      FROM cupom_reservas WHERE referencia = ?`).get(referencia)
  assert.ok(minutos >= 5755 && minutos <= 5760, 'vaga guardada por ~4 dias, veio ' + minutos)
  // Com a vaga estendida, ninguém mais consegue o último uso.
  assert.equal(await reservarCupom(d1, {
    cupomId: 1,
    referencia: '44444444-4444-4444-8444-444444444444',
    precoCentavos: 100,
  }), false)
  // Reserva que já virou compra (ou nunca existiu) não é recriada.
  assert.equal(await estenderReservaCupom(d1, '55555555-5555-4555-8555-555555555555'), false)
})

test('falha ao limpar a vaga não impede a compra de ser registrada como nova', async () => {
  const { d1 } = bancoCupons()
  const comDeleteQuebrado = {
    prepare(sql) {
      if (/DELETE FROM cupom_reservas/.test(sql)) {
        return { bind() { return this }, async run() { throw new Error('D1 fora do ar') } }
      }
      return d1.prepare(sql)
    },
  }
  const erroOriginal = console.error
  console.error = () => {}
  try {
    const nova = await registrarCompraNoBanco(comDeleteQuebrado, {
      clienteId: 1,
      sessionId: 'mp_111222333',
      valor: 100,
      cupom: 'ULTIMA1',
      referencia: '66666666-6666-4666-8666-666666666666',
    })
    // true = o aviso segue e manda o e-mail de acesso.
    assert.equal(nova, true)
  } finally {
    console.error = erroOriginal
  }
})

test('link de pagamento com cupom nunca passa da validade do cupom', () => {
  const agora = Date.parse('2026-09-24T12:00:00Z')
  const trinta = agora + 30 * 60000
  assert.equal(vencimentoDoLinkComCupom('2026-12-31T02:59:59Z', agora), trinta)
  const fim = Date.parse('2026-09-24T12:10:30Z')
  assert.equal(vencimentoDoLinkComCupom('2026-09-24T12:10:30Z', agora), fim)
  // Faltando menos de 2 minutos: recusa.
  assert.equal(vencimentoDoLinkComCupom('2026-09-24T12:01:59Z', agora), null)
  assert.equal(vencimentoDoLinkComCupom(null, agora), trinta)
})

test('aviso pendente atrasado não reativa vaga já vencida', async () => {
  const { banco, d1 } = bancoCupons()
  const referencia = '77777777-7777-4777-8777-777777777777'
  await reservarCupom(d1, { cupomId: 1, referencia, precoCentavos: 100 })
  banco.prepare("UPDATE cupom_reservas SET expira_em = datetime('now', '-1 minutes')").run()
  // Outra pessoa ocupa o lugar que ficou livre.
  assert.equal(await reservarCupom(d1, {
    cupomId: 1,
    referencia: '88888888-8888-4888-8888-888888888888',
    precoCentavos: 100,
  }), true)
  // O aviso atrasado da primeira não pode trazer a vaga dela de volta.
  assert.equal(await estenderReservaCupom(d1, referencia), false)
  const vivas = banco.prepare("SELECT COUNT(*) AS n FROM cupom_reservas WHERE expira_em > datetime('now')").get().n
  assert.equal(vivas, 1)
})
