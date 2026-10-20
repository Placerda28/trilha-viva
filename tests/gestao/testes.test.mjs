import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { marcarTeste, pararLembretes, bloquearCliente, normalizarContatoTeste, fonteCompras } from '../../lib/gestao/testes.js'
import { consultarClientes, consultarClientesCsv, clienteDaLinha } from '../../lib/gestao/clientes.js'
import { consultarItensPeriodo, consultarResumoPeriodo, consultarPeriodoCsv, consultarOrigensPeriodo } from '../../lib/gestao/periodo.js'
import { consultarRecuperacao, consultarRecuperacaoCsv } from '../../lib/gestao/recuperacao.js'
import { registrarCompraNoBanco, listarCupons } from '../../lib/gestao/cupons.js'
import { gravarCarrinho } from '../../lib/carrinhos.js'
import { ehContatoTeste, ehTeste, enviarMetaSeReal } from '../../lib/teste.js'

class D1Local {
  constructor(banco) { this.banco = banco; this.consultas = 0 }
  prepare(sql) {
    this.consultas += 1
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novos) { valores = novos; return this },
      async first() { return preparada.get(...valores) || null },
      async all() { return { results: preparada.all(...valores) } },
      async run() { return { meta: { changes: preparada.run(...valores).changes } } },
    }
  }
  async batch(comandos) {
    this.banco.exec('BEGIN')
    try {
      const resultados = []
      for (const comando of comandos) resultados.push(await comando.run())
      this.banco.exec('COMMIT')
      return resultados
    } catch (erro) { this.banco.exec('ROLLBACK'); throw erro }
  }
}

function banco() {
  const b = new DatabaseSync(':memory:')
  for (const arquivo of readdirSync('migrations').filter((a) => /^00\d\d_.*\.sql$/.test(a) && Number(a.slice(0, 4)) <= 13).sort()) {
    b.exec(readFileSync(`migrations/${arquivo}`, 'utf8'))
  }
  b.exec(readFileSync('migrations/0016_acesso_enviado.sql', 'utf8'))
  b.exec(`INSERT INTO clientes (id, email) VALUES (1, 'pessoa@example.com'), (2, 'real@example.com');
    INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, criado_em) VALUES
      (1, 'mp_teste', 8990, '2026-10-10 12:00:00'), (2, 'mp_real', 1000, '2026-10-10 12:00:00');
    INSERT INTO carrinhos (id, email, status, etapa_email, proximo_email_em, proximo_whatsapp_em) VALUES
      ('teste', 'pessoa@example.com', 'lembrado', 1, datetime('now'), datetime('now')),
      ('real', 'real@example.com', 'aberto', 0, NULL, NULL);`)
  return { b, db: new D1Local(b) }
}

const periodo = { inicioUtc: '2026-10-01', fimUtc: '2026-11-01', pagina: 1 }

test('marcar e desmarcar muda listas e totais; mostrar testes nunca contamina resumo, origem ou CSV', async () => {
  const { b, db } = banco()
  await marcarTeste(db, { email: 'pessoa@example.com', teste: true, quem: 'admin@example.com' })
  assert.equal((await consultarClientes(db, {})).total, 1)
  const lista = await consultarClientes(db, { mostrarTestes: true })
  assert.equal(lista.total, 1)
  assert.equal(lista.linhas.length, 2)
  assert.equal(clienteDaLinha(lista.linhas.find((l) => l.id === 1)).teste, true)
  assert.equal(clienteDaLinha(lista.linhas.find((l) => l.id === 1)).compras, 0)
  assert.equal((await consultarItensPeriodo(db, periodo)).linhas.length, 1)
  const itens = await consultarItensPeriodo(db, { ...periodo, mostrarTestes: true })
  assert.equal(itens.linhas.length, 2)
  assert.equal(itens.total, 1)
  assert.equal((await consultarResumoPeriodo(db, { ...periodo, mostrarTestes: true })).totais.bruto_centavos, 1000)
  assert.equal((await consultarOrigensPeriodo(db, periodo))[0].compras, 1)
  assert.equal((await consultarClientesCsv(db, '')).length, 1)
  assert.equal((await consultarPeriodoCsv(db, periodo)).length, 1)
  const c = b.prepare("SELECT * FROM carrinhos WHERE id = 'teste'").get()
  assert.equal(c.status, 'ignorado')
  assert.equal(c.finalizado_motivo, 'teste')
  assert.equal(c.whatsapp_motivo, 'teste')
  assert.ok(c.whatsapp_encerrado_em)
  assert.equal(c.proximo_email_em, null)
  assert.equal(c.proximo_whatsapp_em, null)
  assert.equal(c.teste_por, 'admin@example.com')
  assert.ok(c.teste_em)
  await marcarTeste(db, { email: 'pessoa@example.com', teste: false, quem: 'admin@example.com' })
  assert.equal((await consultarClientes(db, {})).total, 2)
  assert.equal((await consultarResumoPeriodo(db, periodo)).totais.bruto_centavos, 9990)
  assert.equal(b.prepare("SELECT status FROM carrinhos WHERE id = 'teste'").get().status, 'ignorado')
  b.close()
})

test('recuperação exclui testes dos totais de pessoas, mensagens e CSV mesmo ao mostrar testes', async () => {
  const { b, db } = banco()
  b.exec("INSERT INTO lembretes_enviados (carrinho_id, canal, etapa) VALUES ('teste', 'email', 1), ('teste', 'whatsapp', 1)")
  await marcarTeste(db, { email: 'pessoa@example.com', teste: true, quem: 'admin' })
  assert.equal((await consultarRecuperacao(db)).itens.length, 1)
  const lista = await consultarRecuperacao(db, { mostrarTestes: true })
  assert.equal(lista.itens.length, 2)
  assert.equal(lista.itens.find((i) => i.email === 'pessoa@example.com').teste, true)
  assert.equal(lista.totais.pessoas, 1)
  assert.equal(lista.totais.emails_enviados, 0)
  assert.equal(lista.totais.whatsapp_enviados, 0)
  assert.equal((await consultarRecuperacaoCsv(db)).length, 1)
  b.close()
})

test('contatos normalizados nascem como teste e a referência preserva a marca até o pagamento', async () => {
  const { b, db } = banco()
  for (const dados of [
    { id: 'email', email: ' PAULOHENRIQUE_LS@HOTMAIL.COM ' },
    { id: 'telefone', email: 'outro@example.com', telefone: '+55 (27) 99625-3839' },
  ]) {
    await gravarCarrinho(db, dados)
    assert.equal(b.prepare('SELECT teste FROM carrinhos WHERE id = ?').get(dados.id).teste, 1)
    assert.equal(await ehContatoTeste(db, dados), true)
  }
  b.exec('DELETE FROM contatos_teste')
  const teste = await ehTeste(db, { email: 'outro@example.com', referencia: 'telefone' })
  assert.equal(teste, true)
  await registrarCompraNoBanco(db, { clienteId: 1, sessionId: 'mp_nova', valor: 500, teste })
  assert.equal(b.prepare("SELECT teste FROM compras WHERE stripe_session_id = 'mp_nova'").get().teste, 1)
  assert.equal(await ehTeste(db, { email: 'real@example.com' }), false)
  b.close()
})

test('contato adicionado não altera compras e carrinhos antigos; consulta usa uma ida ao banco', async () => {
  const { b, db } = banco()
  b.exec("INSERT INTO contatos_teste (valor, tipo) VALUES ('pessoa@example.com', 'email')")
  assert.equal(await ehContatoTeste(db, { email: ' PESSOA@example.com ' }), true)
  assert.equal(db.consultas, 1)
  assert.equal(await ehTeste(db, { email: 'pessoa@example.com' }), true)
  assert.equal(db.consultas, 2)
  assert.equal(b.prepare("SELECT teste FROM carrinhos WHERE id = 'teste'").get().teste, 0)
  assert.equal(b.prepare("SELECT teste FROM compras WHERE stripe_session_id = 'mp_teste'").get().teste, 0)
  b.close()
})

test('falha na consulta de teste retorna falso sem derrubar o pagamento', async () => {
  const db = { prepare() { throw new Error('indisponível') } }
  assert.equal(await ehTeste(db, {}), false)
  assert.equal(await ehContatoTeste(db, {}), false)
})

test('Purchase e InitiateCheckout de teste não chamam a Meta; compra real continua enviando', async () => {
  let envios = 0
  const enviar = async () => { envios += 1; return { status: 'ok' } }
  for (const nome of ['Purchase', 'InitiateCheckout']) {
    assert.deepEqual(await enviarMetaSeReal(true, { nome, id: 'ref' }, enviar), { status: 'teste' })
  }
  assert.equal(envios, 0)
  assert.deepEqual(await enviarMetaSeReal(false, { nome: 'Purchase' }, enviar), { status: 'ok' })
  assert.equal(envios, 1)
})

test('parar lembretes encerra os dois canais sem marcar teste nem alterar a compra', async () => {
  const { b, db } = banco()
  await pararLembretes(db, 'pessoa@example.com')
  const c = b.prepare("SELECT * FROM carrinhos WHERE id = 'teste'").get()
  assert.equal(c.status, 'ignorado')
  assert.equal(c.teste, 0)
  assert.equal(c.finalizado_motivo, 'gestao')
  assert.equal(c.whatsapp_motivo, 'gestao')
  assert.ok(c.whatsapp_encerrado_em)
  assert.equal(c.proximo_email_em, null)
  assert.equal(c.proximo_whatsapp_em, null)
  assert.equal((await consultarResumoPeriodo(db, periodo)).totais.compras, 2)
  b.close()
})

test('bloqueio protege master e equipe, e permite bloquear e liberar cliente comum', async () => {
  const { b, db } = banco()
  assert.equal((await bloquearCliente(db, { clienteId: 1, bloqueado: true, protegidos: [' PESSOA@EXAMPLE.COM '] })).status, 409)
  b.exec("INSERT INTO equipe (email, criado_por) VALUES ('pessoa@example.com', 'admin')")
  assert.equal((await bloquearCliente(db, { clienteId: 1, bloqueado: true })).status, 409)
  assert.equal((await bloquearCliente(db, { clienteId: 2, bloqueado: true })).ok, true)
  assert.equal(b.prepare('SELECT bloqueado FROM clientes WHERE id = 2').get().bloqueado, 1)
  assert.equal((await bloquearCliente(db, { clienteId: 2, bloqueado: false })).ok, true)
  assert.equal(b.prepare('SELECT bloqueado FROM clientes WHERE id = 2').get().bloqueado, 0)
  b.close()
})

test('cupom perde o faturamento de teste mas mantém a vaga usada', async () => {
  const { b, db } = banco()
  b.exec(`INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por)
    VALUES ('TESTE', 'percentual', 10, '2099-01-01', 1, 'admin');
    UPDATE compras SET cupom = 'TESTE', teste = 1 WHERE cliente_id = 1;`)
  const cupom = (await listarCupons(db))[0]
  assert.equal(Number(cupom.usos), 1)
  assert.equal(Number(cupom.faturamento_centavos), 0)
  b.close()
})

test('normalização valida email e telefone e nunca usa entrada como nome de tabela', () => {
  assert.deepEqual(normalizarContatoTeste(' PESSOA@EXAMPLE.COM '), { valor: 'pessoa@example.com', tipo: 'email' })
  assert.deepEqual(normalizarContatoTeste('+55 (27) 99625-3839'), { valor: '27996253839', tipo: 'telefone' })
  assert.equal(normalizarContatoTeste('abc27996253839'), null)
  assert.equal(normalizarContatoTeste('invalido@'), null)
  assert.equal(fonteCompras('compras; DROP TABLE clientes'), 'compras_reais')
})
