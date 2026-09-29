import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import {
  consultarCarrinhosGestao,
  periodoCarrinhos,
} from '../../lib/gestao/carrinhos.js'

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
    }
  }
}

function bancoGestao() {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0004_carrinhos.sql', 'utf8'))
  return banco
}

test('períodos respeitam a virada do dia em Brasília', () => {
  const agora = new Date('2026-09-29T02:30:00Z')
  assert.deepEqual(periodoCarrinhos('hoje', agora), {
    periodo: 'hoje',
    inicioUtc: '2026-09-28 03:00:00',
    fimUtc: '2026-09-29 03:00:00',
  })
  assert.deepEqual(periodoCarrinhos('7d', agora), {
    periodo: '7d',
    inicioUtc: '2026-09-22 03:00:00',
    fimUtc: '2026-09-29 03:00:00',
  })
  assert.equal(periodoCarrinhos('invalido', agora), null)
})

test('gestão calcula totais, recuperação e paginação de 50 itens', async () => {
  const banco = bancoGestao()
  const inserir = banco.prepare(`
    INSERT INTO carrinhos
      (id, email, nome, criado_em, status, email_enviado_em, pago_em)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)

  inserir.run('aberto', 'aberto@example.com', 'Aberto', '2026-09-28 04:00:00', 'aberto', null, null)
  inserir.run('lembrado', 'lembrado@example.com', null, '2026-09-28 05:00:00', 'lembrado', '2026-09-28 06:00:00', null)
  inserir.run('recuperado', 'recuperado@example.com', 'Recuperado', '2026-09-28 07:00:00', 'pago', '2026-09-28 08:00:00', '2026-09-28 09:00:00')
  inserir.run('pago-antes', 'antes@example.com', 'Antes', '2026-09-28 10:00:00', 'pago', '2026-09-28 12:00:00', '2026-09-28 11:00:00')
  for (let i = 0; i < 51; i++) {
    inserir.run(
      `extra-${String(i).padStart(2, '0')}`,
      `extra${i}@example.com`,
      `Extra ${i}`,
      `2026-09-28 13:${String(i).padStart(2, '0')}:00`,
      'ignorado',
      null,
      null
    )
  }

  const db = new D1Local(banco)
  const agora = new Date('2026-09-29T02:30:00Z')
  const primeira = await consultarCarrinhosGestao(db, { periodo: 'hoje', pagina: 1, agora })
  const segunda = await consultarCarrinhosGestao(db, { periodo: 'hoje', pagina: 2, agora })

  assert.deepEqual(primeira.totais, { abertos: 1, lembrados: 3, recuperados: 1, taxa: 1 / 3 })
  assert.equal(primeira.itens.length, 50)
  assert.equal(primeira.pagina, 1)
  assert.equal(primeira.temMais, true)
  assert.equal(segunda.itens.length, 5)
  assert.equal(segunda.pagina, 2)
  assert.equal(segunda.temMais, false)
  assert.deepEqual(
    segunda.itens.at(-1),
    {
      nome: 'Aberto',
      email: 'aberto@example.com',
      criado_em: '2026-09-28T04:00:00Z',
      status: 'aberto',
      email_enviado_em: null,
      pago_em: null,
    }
  )
})

test('7d inclui o limite inicial de Brasília e a rota fica atrás de soAdmin', async () => {
  const banco = bancoGestao()
  banco.exec(`
    INSERT INTO carrinhos (id, email, criado_em) VALUES
      ('dentro', 'dentro@example.com', '2026-09-22 03:00:00'),
      ('fora', 'fora@example.com', '2026-09-22 02:59:59')
  `)
  const resultado = await consultarCarrinhosGestao(new D1Local(banco), {
    periodo: '7d',
    pagina: 1,
    agora: new Date('2026-09-29T02:30:00Z'),
  })
  assert.deepEqual(resultado.itens.map((item) => item.email), ['dentro@example.com'])

  const rota = readFileSync('app/api/interno/gestao/carrinhos/route.js', 'utf8')
  assert.match(rota, /export const GET = soAdmin\(get\)/)
  assert.match(rota, /cabecalhosPrivados/)
})
