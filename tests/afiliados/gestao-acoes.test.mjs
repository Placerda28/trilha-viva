import test from 'node:test'
import assert from 'node:assert/strict'
import { executarAcao, SO_MASTER } from '../../lib/afiliados/gestao-acoes.js'
import { consultarCodigo } from '../../lib/afiliados/conta.js'
import { saldosDoAfiliado, statusDoMes } from '../../lib/afiliados/status.js'
import { novoAfiliado, novoDb, vendas } from './_base.mjs'

const AGORA = new Date('2026-11-20T15:00:00Z')
const MASTER = { quem: 'm@t.com', papel: 'master', agora: AGORA, siteUrl: 'https://trilhaviva.org' }
const MEMBRO = { ...MASTER, quem: 'eq@t.com', papel: 'membro' }
const lin = (db, sql, ...a) => db.banco.prepare(sql).get(...a)
const acao = (db, af, nome, extra = {}, ctx = MASTER) => executarAcao(db, af.id, nome, extra, ctx)

test('membro só aprova e anota; dinheiro, nível, código e suspensão são do master (403, sem efeito)', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  for (const nome of SO_MASTER) {
    const r = await acao(db, af, nome, { motivo: 'teste', valor_centavos: 1000, nivel_id: 1, codigo: 'NOVOCOD' }, MEMBRO)
    assert.deepEqual([r.ok, r.status], [false, 403], nome)
  }
  assert.equal(lin(db, 'SELECT status, codigo, nivel_fixo_id FROM afiliados WHERE id = ?', af.id).status, 'ativo')
  assert.equal(lin(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE tipo = 'ajuste'").n, 0)
  assert.equal((await acao(db, af, 'anotar', { texto: 'ok' }, MEMBRO)).ok, true)
  const pend = novoAfiliado(db, { status: 'pendente' })
  assert.equal((await acao(db, pend, 'aprovar', {}, MEMBRO)).ok, true)
})

test('ação desconhecida dá 400 e afiliado inexistente dá 404', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  assert.equal((await acao(db, af, 'apagar')).status, 400)
  assert.equal((await executarAcao(db, 999, 'anotar', { texto: 'x' }, MASTER)).status, 404)
})

test('aprovar: pendente vira ativo, devolve os dados do e-mail e repetir dá 409', async () => {
  const db = novoDb()
  const af = novoAfiliado(db, { status: 'pendente' })
  const r = await acao(db, af, 'aprovar')
  assert.equal(r.ok, true)
  assert.equal(r.afiliado.status, 'ativo')
  assert.equal(r.email.para, lin(db, 'SELECT c.email FROM clientes c JOIN afiliados a ON a.cliente_id = c.id WHERE a.id = ?', af.id).email)
  assert.equal(r.registro.acao, 'afiliado_aprovado')
  const de_novo = await acao(db, af, 'aprovar')
  assert.deepEqual([de_novo.ok, de_novo.status], [false, 409])
  const suspenso = novoAfiliado(db, { status: 'suspenso' })
  assert.equal((await acao(db, suspenso, 'aprovar')).status, 409)
})

test('suspender exige motivo; reativar só de suspenso; repetir dá 409', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  assert.equal((await acao(db, af, 'suspender', {})).campo, 'motivo')
  assert.equal((await acao(db, af, 'suspender', { motivo: 'ab' })).status, 400)
  const r = await acao(db, af, 'suspender', { motivo: 'Venda para si mesmo' })
  assert.equal(r.afiliado.status, 'suspenso')
  assert.equal(r.registro.detalhe.motivo, 'Venda para si mesmo')
  assert.equal((await acao(db, af, 'suspender', { motivo: 'de novo' })).status, 409)
  assert.equal((await acao(db, af, 'reativar')).afiliado.status, 'ativo')
  assert.equal((await acao(db, af, 'reativar')).status, 409)
})

test('travar nível: só nível da tabela vigente; muda o cálculo na hora; null destrava', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await vendas(db, af, 2)
  assert.equal((await statusDoMes(db, af.id, '2026-11', AGORA)).nivel.nome, 'Bronze')
  assert.equal((await acao(db, af, 'travar_nivel', {})).campo, 'nivel_id') // sem a chave
  assert.equal((await acao(db, af, 'travar_nivel', { nivel_id: 999 })).status, 400)
  assert.equal((await acao(db, af, 'travar_nivel', { nivel_id: '3' })).status, 400)
  const r = await acao(db, af, 'travar_nivel', { nivel_id: 3 })
  assert.equal(r.ok, true)
  assert.deepEqual(r.nivel_travado, { id: 3, nome: 'Ouro' })
  assert.deepEqual(r.registro.detalhe, { de: null, para: 'Ouro' })
  const s = await statusDoMes(db, af.id, '2026-11', AGORA)
  assert.equal(s.nivel.nome, 'Ouro')
  assert.equal(s.totalPrevisto, 2 * 3000)
  // nível de uma tabela futura não pode ser travado
  db.banco.prepare("INSERT INTO afiliados_niveis (nome, vendas_minimas, valor_por_venda_centavos, valido_desde_mes) VALUES ('Futuro', 1, 9000, '2026-12')").run()
  const futuro = lin(db, "SELECT id FROM afiliados_niveis WHERE nome = 'Futuro'").id
  assert.equal((await acao(db, af, 'travar_nivel', { nivel_id: Number(futuro) })).status, 400)
  const livre = await acao(db, af, 'travar_nivel', { nivel_id: null })
  assert.equal(livre.nivel_travado, null)
  assert.equal(livre.registro.detalhe.de, 'Ouro')
  assert.equal((await statusDoMes(db, af.id, '2026-11', AGORA)).nivel.nome, 'Bronze')
})

test('trocar código: regras do cadastro, vendas ficam com o afiliado e o código antigo fica reservado', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const outro = novoAfiliado(db)
  await vendas(db, af, 3)
  db.banco.prepare("INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por) VALUES ('CUPOMX', 'percentual', 10, '2030-01-01', 5, 'm@t.com')").run()
  const antigo = lin(db, 'SELECT codigo FROM afiliados WHERE id = ?', af.id).codigo
  const doOutro = lin(db, 'SELECT codigo FROM afiliados WHERE id = ?', outro.id).codigo
  for (const [codigo, status] of [['ab', 400], ['COM ESPACO', 400], ['ADMIN', 400], ['CUPOMX', 409], [doOutro, 409], [antigo, 400], [undefined, 400]]) {
    const r = await acao(db, af, 'trocar_codigo', { codigo })
    assert.deepEqual([r.ok, r.status], [false, status], String(codigo))
    assert.equal(r.campo, 'codigo')
  }
  const r = await acao(db, af, 'trocar_codigo', { codigo: ' novo123 ' })
  assert.equal(r.ok, true)
  assert.equal(r.codigo, 'NOVO123')
  assert.equal(r.codigo_antigo, antigo)
  assert.equal(r.link_novo, 'https://trilhaviva.org/?ref=NOVO123')
  assert.match(r.aviso, new RegExp(`links já divulgados com ${antigo} deixam de registrar`))
  assert.deepEqual(r.registro, { acao: 'afiliado_codigo_trocado', alvo: 'NOVO123', detalhe: { de: antigo, para: 'NOVO123' } })
  assert.equal(lin(db, 'SELECT codigo FROM afiliados WHERE id = ?', af.id).codigo, 'NOVO123')
  // vendas antigas continuam do afiliado (pelo afiliado_id)
  assert.equal((await statusDoMes(db, af.id, '2026-11', AGORA)).vendasValidas, 3)
  // o antigo deixa de valer: ninguém acha o afiliado por ele e ninguém mais pode usá-lo
  assert.equal(lin(db, 'SELECT COUNT(*) n FROM afiliados WHERE codigo = ?', antigo).n, 0)
  assert.equal((await consultarCodigo(db, antigo)).disponivel, false)
  assert.equal((await acao(db, outro, 'trocar_codigo', { codigo: antigo })).status, 409)
  assert.equal(lin(db, 'SELECT afiliado_id FROM afiliados_codigos_antigos WHERE codigo = ?', antigo).afiliado_id, af.id)
})

test('ajuste: positivo e negativo, motivo obrigatório, disponível na hora, sem repetir por duplo clique', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const ruim = async (extra) => (await acao(db, af, 'ajuste', extra)).status
  assert.equal(await ruim({ valor_centavos: 0, motivo: 'zero' }), 400)
  assert.equal(await ruim({ valor_centavos: 10.5, motivo: 'quebrado' }), 400)
  assert.equal(await ruim({ valor_centavos: '1000', motivo: 'texto' }), 400)
  assert.equal(await ruim({ valor_centavos: 10_000_001, motivo: 'enorme' }), 400)
  assert.equal(await ruim({ valor_centavos: 1000 }), 400)
  assert.equal(await ruim({ valor_centavos: 1000, motivo: 'ab' }), 400)

  const r = await acao(db, af, 'ajuste', { valor_centavos: 5000, motivo: 'Bônus de campanha' })
  assert.equal(r.ok, true)
  assert.equal(r.disponivel_centavos, 5000)
  assert.equal((await saldosDoAfiliado(db, af.id, AGORA)).disponivel, 5000)
  const l = lin(db, 'SELECT tipo, mes_referencia, valor_centavos, status, descricao FROM afiliados_lancamentos WHERE id = ?', r.lancamento_id)
  assert.deepEqual({ ...l }, { tipo: 'ajuste', mes_referencia: '2026-11', valor_centavos: 5000, status: 'pendente', descricao: 'Ajuste: Bônus de campanha' })
  assert.equal((await acao(db, af, 'ajuste', { valor_centavos: 5000, motivo: 'Bônus de campanha' })).status, 409) // duplo clique
  assert.equal((await acao(db, af, 'ajuste', { valor_centavos: 5000, motivo: 'Outro motivo' })).ok, true)
  const neg = await acao(db, af, 'ajuste', { valor_centavos: -3000, motivo: 'Correção de lançamento' })
  assert.equal(neg.disponivel_centavos, 7000)
  assert.equal(neg.registro.detalhe.valor_centavos, -3000)
})

test('anotar: grava com o autor; vazio e texto enorme são recusados', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  assert.equal((await acao(db, af, 'anotar', { texto: '   ' })).campo, 'texto')
  assert.equal((await acao(db, af, 'anotar', { texto: 'x'.repeat(1001) })).status, 400)
  const r = await acao(db, af, 'anotar', { texto: ' Pediu para trocar o Pix ' })
  assert.equal(r.anotacao.texto, 'Pediu para trocar o Pix')
  assert.equal(r.anotacao.autor, 'm@t.com')
  assert.equal(lin(db, 'SELECT COUNT(*) n FROM afiliados_anotacoes WHERE afiliado_id = ?', af.id).n, 1)
  // o texto da anotação não vai para o registro, só o id
  assert.deepEqual(r.registro.detalhe, { anotacao_id: r.anotacao.id })
})
