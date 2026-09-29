import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import {
  assinarDescadastro,
  assinaturaDescadastroValida,
} from '../../lib/lembrete-assinatura.js'
import { responderDescadastro } from '../../lib/descadastro.js'

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
      async run() {
        const resultado = preparada.run(...valores)
        return { meta: { changes: resultado.changes } }
      },
    }
  }
}

function bancoDescadastros() {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0004_carrinhos.sql', 'utf8'))
  return banco
}

test('assinatura usa HMAC-SHA256 hexadecimal sobre o e-mail normalizado', async () => {
  const segredo = 'chave-apenas-de-teste'
  const esperada = createHmac('sha256', segredo)
    .update('descadastro:pessoa@example.com')
    .digest('hex')
  const assinatura = await assinarDescadastro(' Pessoa@Example.COM ', segredo)

  assert.equal(assinatura, esperada)
  assert.equal(await assinaturaDescadastroValida('pessoa@example.com', assinatura, segredo), true)
  assert.equal(await assinaturaDescadastroValida('outra@example.com', assinatura, segredo), false)
  assert.equal(await assinaturaDescadastroValida('pessoa@example.com', 'x'.repeat(64), segredo), false)
  assert.equal(await assinaturaDescadastroValida('pessoa@example.com', '', segredo), false)
})

test('GET válido mostra confirmação sem gravar descadastro', async () => {
  const segredo = 'chave-apenas-de-teste'
  const email = 'pessoa@example.com'
  const assinatura = await assinarDescadastro(email, segredo)
  const banco = bancoDescadastros()
  const resposta = await responderDescadastro(
    new Request(`https://trilhaviva.org/api/descadastrar?e=${email}&t=${assinatura}`),
    { db: new D1Local(banco), segredo }
  )

  assert.equal(resposta.status, 200)
  assert.match(await resposta.text(), /Confirmar cancelamento/)
  assert.equal(banco.prepare('SELECT COUNT(*) AS total FROM descadastros').get().total, 0)
  assert.match(resposta.headers.get('cache-control'), /no-store/)
  assert.equal(resposta.headers.get('x-robots-tag'), 'noindex')
})

test('POST válido, inclusive One-Click, grava uma única vez e mostra a confirmação', async () => {
  const segredo = 'chave-apenas-de-teste'
  const email = 'pessoa@example.com'
  const assinatura = await assinarDescadastro(email, segredo)
  const banco = bancoDescadastros()
  const db = new D1Local(banco)
  const url = `https://trilhaviva.org/api/descadastrar?e=${email}&t=${assinatura}`
  const pedido = () => new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'List-Unsubscribe=One-Click',
  })

  const primeira = await responderDescadastro(pedido(), { db, segredo })
  const segunda = await responderDescadastro(pedido(), { db, segredo })
  assert.equal(primeira.status, 200)
  assert.equal(segunda.status, 200)
  assert.match(await primeira.text(), /Pronto, você não vai mais receber lembretes\./)
  assert.deepEqual(
    banco.prepare('SELECT email, canal FROM descadastros').all().map((linha) => ({ ...linha })),
    [{ email, canal: 'email' }]
  )
})

test('assinatura inválida ou faltando responde 400 e não grava nada', async () => {
  const banco = bancoDescadastros()
  const db = new D1Local(banco)
  for (const url of [
    'https://trilhaviva.org/api/descadastrar',
    'https://trilhaviva.org/api/descadastrar?e=pessoa@example.com&t=invalida',
  ]) {
    const resposta = await responderDescadastro(new Request(url, { method: 'POST' }), {
      db,
      segredo: 'chave-apenas-de-teste',
    })
    assert.equal(resposta.status, 400)
    assert.match(await resposta.text(), /Link inválido/)
  }
  assert.equal(banco.prepare('SELECT COUNT(*) AS total FROM descadastros').get().total, 0)
})
