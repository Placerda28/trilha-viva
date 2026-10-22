import test from 'node:test'
import assert from 'node:assert/strict'
import { criarBanco, D1Local } from './_d1local.mjs'
import { clienteDaLinha, consultarClientes, filtroClientesValido } from '../../lib/gestao/clientes.js'
import { consultarRecuperacao } from '../../lib/gestao/recuperacao.js'
import { lerEstadoWhatsapp, totaisWhatsapp } from '../../lib/gestao/whatsapp.js'
import { filtrarCupons, listarCupons, situacaoCupomValida } from '../../lib/gestao/cupons.js'
import { consultarLeads, filtroBuscaLeads } from '../../lib/gestao/leads.js'
import { consultarRegistro, gravarRegistro } from '../../lib/gestao/registro.js'
import { listarEquipe } from '../../lib/gestao/equipe.js'

const periodoGeral = { inicioUtc: '2026-10-01 03:00:00', fimUtc: '2026-11-01 03:00:00' }

function base() {
  const b = criarBanco()
  b.exec(`
    INSERT INTO clientes (id, email, nome, supabase_id, bloqueado, ultimo_acesso, criado_em) VALUES
      (1, 'ana@example.com', 'Ana', 'sup1', 0, '2026-10-10 12:00:00', '2026-10-02 12:00:00'),
      (2, 'bia@example.com', 'Bia', NULL, 0, NULL, '2026-10-03 12:00:00'),
      (3, 'caio@example.com', 'Caio', 'sup3', 1, NULL, '2026-10-04 12:00:00'),
      (4, 'teste@example.com', 'Teste', 'sup4', 0, NULL, '2026-10-05 12:00:00');
    INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, moeda, status, criado_em, utm_source, utm_campaign, teste) VALUES
      (1, 'mp_1', 19700, 'brl', 'pago', '2026-10-05 12:00:00', 'ig', 'pascoa', 0),
      (2, 'mp_2', 19700, 'brl', 'pago', '2026-10-06 12:00:00', NULL, NULL, 0),
      (3, 'mp_3', 19700, 'brl', 'pago', '2026-10-07 12:00:00', 'meta', 'x', 0),
      (4, 'mp_4', 19700, 'brl', 'pago', '2026-10-08 12:00:00', NULL, NULL, 1);
  `)
  return { b, db: new D1Local(b) }
}

test('clientes: total acompanha "Mostrar testes" e filtros sem_senha e bloqueados valem na lista e no total', async () => {
  const { b, db } = base()
  assert.equal((await consultarClientes(db, {})).total, 3)
  assert.equal((await consultarClientes(db, { mostrarTestes: true })).total, 4)
  const semSenha = await consultarClientes(db, { filtro: 'sem_senha' })
  assert.deepEqual(semSenha.linhas.map((l) => l.email), ['bia@example.com'])
  assert.equal(semSenha.total, 1)
  const bloqueados = await consultarClientes(db, { filtro: 'bloqueados' })
  assert.deepEqual(bloqueados.linhas.map((l) => l.email), ['caio@example.com'])
  assert.equal(filtroClientesValido('qualquer'), 'todos')
  assert.equal(filtroClientesValido('sem_senha'), 'sem_senha')
  b.close()
})

test('clientes: devolve ultimo_acesso e a origem da última compra', async () => {
  const { b, db } = base()
  const lista = (await consultarClientes(db, {})).linhas.map(clienteDaLinha)
  const ana = lista.find((c) => c.email === 'ana@example.com')
  assert.equal(ana.ultimo_acesso, '2026-10-10T12:00:00Z')
  assert.equal(ana.compra.utm_source, 'ig')
  assert.equal(ana.compra.utm_campaign, 'pascoa')
  assert.equal(lista.find((c) => c.email === 'bia@example.com').ultimo_acesso, null)
  b.close()
})

function carrinhosComLembretes(b) {
  b.exec(`
    INSERT INTO carrinhos (id, email, nome, telefone, criado_em, status, pago_em, etapa_email, utm_source, utm_campaign, teste) VALUES
      ('a', 'ana@example.com', 'Ana', '27999990001', '2026-10-05 10:00:00', 'pago', '2026-10-05 12:00:00', 1, 'ig', 'pascoa', 0),
      ('c', 'caio@example.com', 'Caio', '27999990003', '2026-10-07 10:00:00', 'pago', '2026-10-07 12:00:00', 1, 'meta', 'x', 0),
      ('d', 'dora@example.com', 'Dora', '27999990004', '2026-10-20 10:00:00', 'lembrado', NULL, 1, NULL, NULL, 0),
      ('t', 'teste@example.com', 'Teste', '27999990005', '2026-10-08 10:00:00', 'aberto', NULL, 0, NULL, NULL, 1);
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em, wa_status) VALUES
      ('a', 'email', 1, '2026-10-05 11:00:00', NULL),
      ('c', 'whatsapp', 1, '2026-10-07 11:00:00', 'read'),
      ('d', 'email', 1, '2026-10-20 11:00:00', NULL),
      ('t', 'email', 1, '2026-10-08 11:00:00', NULL);
  `)
}

test('recuperação: totais por período, por canal de recuperação e respeitando testes', async () => {
  const { b, db } = base()
  carrinhosComLembretes(b)
  const tudo = (await consultarRecuperacao(db, {})).totais
  assert.equal(tudo.pessoas, 3)
  assert.equal(tudo.recuperados, 2)
  assert.equal(tudo.recuperados_email, 1)
  assert.equal(tudo.recuperados_whatsapp, 1)
  assert.equal(tudo.emails_enviados, 2)
  assert.equal(tudo.whatsapp_enviados, 1)

  const comTestes = (await consultarRecuperacao(db, { mostrarTestes: true })).totais
  assert.equal(comTestes.pessoas, 4)
  assert.equal(comTestes.emails_enviados, 3)

  // Só 05/10 (Brasília): a Ana entra, o Caio (07/10) e a Dora (20/10) ficam de fora.
  const dia = (await consultarRecuperacao(db, {
    periodo: { inicioUtc: '2026-10-05 03:00:00', fimUtc: '2026-10-06 03:00:00' },
  })).totais
  assert.equal(dia.pessoas, 1)
  assert.equal(dia.recuperados, 1)
  assert.equal(dia.recuperados_email, 1)
  assert.equal(dia.recuperados_whatsapp, 0)
  assert.equal(dia.emails_enviados, 1)
  assert.equal(dia.whatsapp_enviados, 0)
  assert.equal(dia.valor_recuperado_centavos, 19700)

  const item = (await consultarRecuperacao(db, {})).itens.find((i) => i.email === 'ana@example.com')
  assert.equal(item.utm_source, 'ig')
  assert.equal(item.utm_campaign, 'pascoa')
  b.close()
})

test('whatsapp: totais só com carrinhos reais; estado traz modelo_status e ligado_em', async () => {
  const { b, db } = base()
  carrinhosComLembretes(b)
  b.exec(`
    UPDATE carrinhos SET whatsapp_enviado_em = '2026-10-07 11:00:00' WHERE id = 'c';
    INSERT INTO carrinhos (id, email, telefone, status, teste, whatsapp_enviado_em) VALUES ('w', 'w@example.com', '27999990009', 'aberto', 1, '2026-10-08 11:00:00');
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, wa_status) VALUES ('w', 'whatsapp', 1, 'failed');
  `)
  const totais = await totaisWhatsapp(db)
  assert.equal(totais.enviados, 1)
  assert.equal(totais.falharam, 0)
  assert.equal(totais.pessoas, 1)
  b.exec("UPDATE whatsapp_estado SET modelo_status = 'APPROVED', ligado_em = '2026-10-10 10:00:00' WHERE id = 1")
  const estado = await lerEstadoWhatsapp(db)
  assert.equal(estado.modelo_status, 'APPROVED')
  assert.equal(estado.ligado_em, '2026-10-10T10:00:00Z')
  b.close()
})

test('cupons: usos contam só compras reais e pagas; filtro por situação', async () => {
  const { b, db } = base()
  b.exec(`
    INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por, ativo) VALUES
      ('ATIVO', 'percentual', 10, '2099-01-01', 5, 'a', 1),
      ('VENCIDO', 'percentual', 10, '2020-01-01', 5, 'a', 1),
      ('CHEIO', 'percentual', 10, '2099-01-01', 1, 'a', 1),
      ('OFF', 'percentual', 10, '2099-01-01', 5, 'a', 0);
    UPDATE compras SET cupom = 'CHEIO' WHERE stripe_session_id = 'mp_1';
    UPDATE compras SET cupom = 'ATIVO' WHERE stripe_session_id IN ('mp_2', 'mp_4');
    INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, cupom) VALUES (2, 'mp_9', 100, 'pendente', 'ATIVO');
  `)
  const todos = await listarCupons(db)
  assert.equal(todos.find((c) => c.codigo === 'ATIVO').usos, 1)
  const nomes = async (situacao) => (await listarCupons(db, { situacao })).map((c) => c.codigo).sort()
  assert.deepEqual(await nomes('ativos'), ['ATIVO'])
  assert.deepEqual(await nomes('vencidos'), ['VENCIDO'])
  assert.deepEqual(await nomes('esgotados'), ['CHEIO'])
  assert.deepEqual(await nomes('desativados'), ['OFF'])
  assert.equal((await nomes('todos')).length, 4)
  assert.equal(situacaoCupomValida('xyz'), 'todos')
  assert.equal(filtrarCupons([{ ativo: true, vencido: false, esgotado: false }], 'ativos').length, 1)
  b.close()
})

test('leads: busca por nome, e-mail e WhatsApp mexe na lista e no total, não nos cartões', async () => {
  const { b, db } = base()
  b.exec(`
    INSERT INTO leads (nome, email, whatsapp, consentimento, token_hash, token_expira_em, criado_em) VALUES
      ('Maria Souza', 'maria@example.com', '27996253839', 1, 'h1', '2026-12-01', '2026-10-10 12:00:00'),
      ('João Lima', 'joao@example.com', '11988887777', 1, 'h2', '2026-12-01', '2026-10-11 12:00:00');
  `)
  const geral = await consultarLeads(db, { ...periodoGeral, pagina: 1 })
  assert.equal(geral.total_itens, 2)
  const porNome = await consultarLeads(db, { ...periodoGeral, pagina: 1, q: 'maria' })
  assert.deepEqual(porNome.itens.map((i) => i.email), ['maria@example.com'])
  assert.equal(porNome.total_itens, 1)
  assert.equal(porNome.totais.cadastros, 2)
  const porCelular = await consultarLeads(db, { ...periodoGeral, pagina: 1, q: '+55 (27) 99625-3839' })
  assert.deepEqual(porCelular.itens.map((i) => i.email), ['maria@example.com'])
  assert.equal((await consultarLeads(db, { ...periodoGeral, pagina: 1, q: '%%' })).total_itens, 0)
  assert.equal((await consultarLeads(db, { ...periodoGeral, pagina: 1, q: 'm' })).total_itens, 2)
  assert.equal(filtroBuscaLeads('a').sql, '')
  b.close()
})

test('registro: filtros por quem, tipo e período, com listas de opções', async () => {
  const { b, db } = base()
  await gravarRegistro(db, { quem: 'a@x.com', acao: 'cupom_criado', alvo: 'X' })
  await gravarRegistro(db, { quem: 'b@x.com', acao: 'cliente_bloqueado', alvo: 'y' })
  b.exec("UPDATE registro SET criado_em = '2026-10-10 12:00:00' WHERE quem = 'b@x.com'")
  assert.equal((await consultarRegistro(db, 1)).total, 2)
  const porQuem = await consultarRegistro(db, 1, { quem: 'B@x.com' })
  assert.equal(porQuem.total, 1)
  assert.equal(porQuem.itens[0].acao, 'cliente_bloqueado')
  assert.equal((await consultarRegistro(db, 1, { tipo: 'cupom_criado' })).total, 1)
  const noPeriodo = await consultarRegistro(db, 1, { inicioUtc: '2026-10-10 03:00:00', fimUtc: '2026-10-11 03:00:00' })
  assert.equal(noPeriodo.total, 1)
  assert.deepEqual(noPeriodo.quem_opcoes, ['a@x.com', 'b@x.com'])
  assert.deepEqual(noPeriodo.tipo_opcoes, ['cliente_bloqueado', 'cupom_criado'])
  b.close()
})

test('equipe: cada membro traz o último acesso', async () => {
  const { b, db } = base()
  b.exec("INSERT INTO equipe (email, criado_por) VALUES ('ana@example.com', 'm'), ('bia@example.com', 'm')")
  const lista = await listarEquipe(db)
  assert.equal(lista.find((m) => m.email === 'ana@example.com').ultimo_acesso, '2026-10-10T12:00:00Z')
  assert.equal(lista.find((m) => m.email === 'bia@example.com').ultimo_acesso, null)
  b.close()
})
