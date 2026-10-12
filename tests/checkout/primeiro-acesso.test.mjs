import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { RESPOSTA_PRIMEIRO_ACESSO, pedirPrimeiroAcesso } from '../../lib/primeiro-acesso.js'

class D1Local {
  constructor(banco) {
    this.banco = banco
  }
  prepare(sql) {
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novos) {
        valores = novos
        return this
      },
      async all() {
        return { results: preparada.all(...valores) }
      },
      async first() {
        return preparada.get(...valores) || null
      },
      async run() {
        return { meta: { changes: Number(preparada.run(...valores).changes || 0) } }
      },
    }
  }
}

function montar() {
  const b = new DatabaseSync(':memory:')
  for (const m of ['0000_esquema_atual', '0001_gestao_fase1', '0002_cupons', '0014_primeiro_acesso']) {
    b.exec(readFileSync('migrations/' + m + '.sql', 'utf8'))
  }
  b.exec(`
    INSERT INTO clientes (id, email, nome, supabase_id, bloqueado) VALUES
      (1, 'comprou@example.com', 'Ana Souza', NULL, 0),
      (2, 'comsenha@example.com', 'Bia', 'sup-2', 0),
      (3, 'bloqueado@example.com', 'Caio', NULL, 1),
      (4, 'pendente@example.com', 'Davi', NULL, 0);
    INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status) VALUES
      (1, 'mp_1', 8990, 'pago'), (2, 'mp_2', 8990, 'pago'), (3, 'mp_3', 8990, 'pago'),
      (4, 'mp_4', 8990, 'pendente');
  `)
  const enviados = []
  const tokens = []
  const deps = {
    async criarToken(p) {
      tokens.push(p)
      return 'tok-' + tokens.length
    },
    async enviarCriarSenha(p) {
      enviados.push(p)
      return true
    },
  }
  return { b, db: new D1Local(b), enviados, tokens, deps }
}

test('compra paga sem senha recebe o link de 72 h, de criar senha', async () => {
  const { db, enviados, tokens, deps } = montar()
  const r = await pedirPrimeiroAcesso(db, { email: ' Comprou@Example.com ', ip: '1.1.1.1' }, deps)
  assert.equal(r, 'enviado')
  assert.deepEqual(tokens, [{ clienteId: 1, tipo: 'criar_senha', horas: 72 }])
  assert.equal(enviados[0].para, 'comprou@example.com')
  assert.equal(enviados[0].validade, '72 horas')
})

test('sem compra, já com senha, bloqueado ou compra não paga: nada sai', async () => {
  const { db, enviados, deps } = montar()
  for (const email of ['ninguem@example.com', 'comsenha@example.com', 'bloqueado@example.com', 'pendente@example.com']) {
    assert.equal(await pedirPrimeiroAcesso(db, { email, ip: 'ip-' + email }, deps), 'sem_compra')
  }
  assert.equal(enviados.length, 0)
})

test('acima de 3 por hora (por e-mail ou por IP) não envia nem anota', async () => {
  const { b, db, enviados, deps } = montar()
  for (let i = 0; i < 3; i += 1) {
    await pedirPrimeiroAcesso(db, { email: 'comprou@example.com', ip: 'ip-' + i }, deps)
  }
  assert.equal(await pedirPrimeiroAcesso(db, { email: 'comprou@example.com', ip: 'ip-novo' }, deps), 'limite')
  assert.equal(enviados.length, 3)

  for (let i = 0; i < 3; i += 1) {
    await pedirPrimeiroAcesso(db, { email: 'x' + i + '@example.com', ip: 'mesmo-ip' }, deps)
  }
  assert.equal(await pedirPrimeiroAcesso(db, { email: 'comprou2@example.com', ip: 'mesmo-ip' }, deps), 'limite')
  assert.equal(b.prepare('SELECT COUNT(*) AS n FROM pedidos_acesso').get().n, 6)
})

test('a resposta da rota é a mesma frase nos três casos', async () => {
  // A rota sempre devolve RESPOSTA_PRIMEIRO_ACESSO; o resultado interno só
  // vai para o log. Aqui garantimos que a frase não revela nada.
  assert.match(RESPOSTA_PRIMEIRO_ACESSO, /^Se houver uma compra com este e-mail/)
  const rota = readFileSync('app/api/conta/primeiro-acesso/route.js', 'utf8')
  assert.equal((rota.match(/mesmaResposta\(\)/g) || []).length, 2) // definição + único retorno
  assert.doesNotMatch(rota, /resultado ===\s*'enviado'[^\n]*return/)
})

test('e-mail inválido não toca no banco', async () => {
  const { b, db, deps } = montar()
  assert.equal(await pedirPrimeiroAcesso(db, { email: 'sem-arroba', ip: '1' }, deps), 'invalido')
  assert.equal(b.prepare('SELECT COUNT(*) AS n FROM pedidos_acesso').get().n, 0)
})
