import test from 'node:test'
import assert from 'node:assert/strict'
import { dadoCompleto, fichaDoAfiliado } from '../../lib/afiliados/gestao-ficha.js'
import { executarAcao } from '../../lib/afiliados/gestao-acoes.js'
import { dadosDoPainel } from '../../lib/afiliados/painel.js'
import { pedirSaque } from '../../lib/afiliados/saque.js'
import { gravarRegistro } from '../../lib/gestao/registro.js'
import { novoAfiliado, novoDb, vendas } from './_base.mjs'

const AGORA = new Date('2026-11-20T15:00:00Z')
const MASTER = { quem: 'm@t.com', papel: 'master', agora: AGORA }

test('ficha: dados do afiliado com CPF e Pix mascarados e os mesmos números do painel dele', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  db.banco.prepare("UPDATE afiliados_pix SET chave = '12345678909', titular_cpf = '12345678909' WHERE afiliado_id = ?").run(af.id)
  db.banco.prepare("UPDATE afiliados SET cpf = '12345678909', telefone = '27999990000', canal = 'Instagram' WHERE id = ?").run(af.id)
  await vendas(db, af, 3)
  const saque = await pedirSaque(db, af.id, AGORA)
  assert.equal(saque.ok, true)

  const f = await fichaDoAfiliado(db, af.id, AGORA)
  assert.equal(f.afiliado.cpf, '***.456.789-**')
  assert.equal(f.afiliado.pix.chave, '***.456.789-**')
  assert.equal(f.afiliado.pix.titular_cpf, '***.456.789-**')
  assert.equal(f.afiliado.pix.tipo_chave, 'cpf')
  assert.equal(f.afiliado.canal, 'Instagram')
  assert.ok(f.afiliado.email.includes('@'))
  const texto = JSON.stringify(f)
  assert.ok(!texto.includes('12345678909'), 'CPF inteiro vazou na ficha')
  assert.ok(!texto.includes('123.456.789-09'))

  // mini-painel: exatamente o que o afiliado vê
  assert.deepEqual(f.painel, await dadosDoPainel(db, af.id, AGORA))
  assert.equal(f.painel.vendasValidas, 3)
  // comprador mascarado nas vendas recentes
  assert.equal(f.vendas_recentes.length, 3)
  assert.match(f.vendas_recentes[0].comprador, /^.{1,2}\*\*\*@/)
  assert.ok(!/[0-9a-z]@t.com/.test(JSON.stringify(f.vendas_recentes)))
  assert.equal(f.saques.length, 1)
  assert.equal(f.saques[0].status, 'solicitado')
  assert.equal(f.saques[0].pix.chave, '***.456.789-**')
  assert.ok(f.extrato.length >= 3)
  assert.equal(f.historico_mensal[0].mes, '2026-11')
  assert.equal(f.historico_mensal[0].vendasValidas, 3)
  assert.deepEqual(f.anotacoes, [])
})

test('ficha de afiliado que não existe devolve null', async () => {
  assert.equal(await fichaDoAfiliado(novoDb(), 999, AGORA), null)
})

test('histórico de ações segue o afiliado mesmo depois da troca de código; anotações e códigos antigos aparecem', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const outro = novoAfiliado(db)
  const antigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  await gravarRegistro(db, { quem: 'm@t.com', acao: 'afiliado_ajuste', alvo: antigo, detalhe: { valor_centavos: 1000 } })
  await gravarRegistro(db, { quem: 'm@t.com', acao: 'afiliado_ajuste', alvo: db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(outro.id).codigo })
  const t = await executarAcao(db, af.id, 'trocar_codigo', { codigo: 'NOVO777' }, MASTER)
  await gravarRegistro(db, { quem: 'm@t.com', ...t.registro })
  await executarAcao(db, af.id, 'anotar', { texto: 'Fala com a igreja X' }, { ...MASTER, quem: 'eq@t.com' })

  const f = await fichaDoAfiliado(db, af.id, AGORA)
  assert.equal(f.afiliado.codigo, 'NOVO777')
  assert.deepEqual(f.afiliado.codigos_antigos.map((c) => c.codigo), [antigo])
  assert.equal(f.afiliado.codigos_antigos[0].trocado_por, 'm@t.com')
  assert.deepEqual(f.historico_acoes.map((a) => a.acao), ['afiliado_codigo_trocado', 'afiliado_ajuste']) // o ajuste do outro não entra
  assert.equal(f.historico_acoes[1].alvo, antigo)
  assert.deepEqual(f.anotacoes.map((n) => [n.texto, n.autor]), [['Fala com a igreja X', 'eq@t.com']])
})

test('revelar: CPF e Pix inteiros só pela função própria; sem Pix devolve pix null', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  db.banco.prepare("UPDATE afiliados SET cpf = '12345678909' WHERE id = ?").run(af.id)
  db.banco.prepare("UPDATE afiliados_pix SET tipo_chave = 'email', chave = 'pessoa@x.com', titular_cpf = '12345678909' WHERE afiliado_id = ?").run(af.id)
  assert.equal((await dadoCompleto(db, af.id, 'cpf')).cpf, '123.456.789-09')
  const p = await dadoCompleto(db, af.id, 'pix')
  assert.deepEqual(p.pix, { tipo_chave: 'email', chave: 'pessoa@x.com', titular_nome: 'Nome', titular_cpf: '123.456.789-09' })
  const sem = novoAfiliado(db, { pix: false })
  assert.equal((await dadoCompleto(db, sem.id, 'pix')).pix, null)
  assert.equal(await dadoCompleto(db, 999, 'cpf'), null)
})
