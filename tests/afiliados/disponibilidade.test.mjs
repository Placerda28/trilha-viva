// Regra única de disponibilidade de venda: só existe saldo se o mês do afiliado tem fechamento. O disponivel_em da venda
// é ignorado (casos do Codex: restauração depois da 0022, versão antiga gravando carência, robô antigo fechando).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { estornarVenda } from '../../lib/afiliados/comissao.js'
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { buscarVendas } from '../../lib/afiliados/painel.js'
import { fichaDoAfiliado } from '../../lib/afiliados/gestao-ficha.js'
import { pedirSaque } from '../../lib/afiliados/saque.js'
import { saldosDoAfiliado } from '../../lib/afiliados/status.js'
import { restaurarCompra } from '../../lib/afiliados/venda.js'
import { fechar, novaVenda, novoAfiliado, novoDb } from './_base.mjs'

const M0022 = readFileSync(new URL('../../migrations/0022_afiliados_saque_mensal.sql', import.meta.url), 'utf8')
const ANTIGA = '2026-11-17 15:00:00' // carência de 7 dias da regra velha
const DEZ3 = new Date('2026-12-03T12:00:00Z')
const disp = async (db, af, quando = DEZ3) => (await saldosDoAfiliado(db, af.id, quando)).disponivel

test('1. venda cancelada antes da 0022, restaurada depois: não saca com o mês aberto', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const compraId = await novaVenda(db, af)
  await estornarVenda(db, compraId, new Date('2026-11-12T12:00:00Z')) // cancelada
  db.banco.prepare('UPDATE afiliados_lancamentos SET disponivel_em = ?').run(ANTIGA) // como estava antes da 0022
  db.banco.exec(M0022)
  assert.equal(db.banco.prepare("SELECT disponivel_em d FROM afiliados_lancamentos WHERE tipo = 'venda'").get().d, '9999-12-31 23:59:59')
  const stripe = db.banco.prepare('SELECT stripe_session_id s FROM compras WHERE id = ?').get(compraId).s
  await restaurarCompra(db, stripe, '2026-11-13T12:00:00Z')
  assert.equal(db.banco.prepare("SELECT status FROM afiliados_lancamentos WHERE tipo = 'venda'").get().status, 'pendente')
  assert.equal(await disp(db, af), 0)
  // mesmo que a data velha volte (restauração antiga, versão antiga no ar), o saque não passa
  db.banco.prepare('UPDATE afiliados_lancamentos SET disponivel_em = ?').run(ANTIGA)
  assert.equal(await disp(db, af), 0)
  const r = await pedirSaque(db, af.id, DEZ3)
  assert.equal(r.ok, false)
  assert.equal(db.banco.prepare('SELECT COUNT(*) n FROM afiliados_saques').get().n, 0)
})

test('2. venda gravada com carência antiga depois da 0022: não saca com o mês aberto', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await novaVenda(db, af)
  db.banco.exec(M0022)
  await novaVenda(db, af) // a versão ANTIGA ainda no ar grava esta com carência de 7 dias
  db.banco.prepare('UPDATE afiliados_lancamentos SET disponivel_em = ?').run(ANTIGA)
  assert.equal(await disp(db, af, new Date('2026-12-01T12:00:00Z')), 0)
  assert.equal((await pedirSaque(db, af.id, DEZ3)).ok, false)
  assert.equal((await saldosDoAfiliado(db, af.id, DEZ3)).liberando, 3000)
  await fechar(db) // fechou: aí sim
  assert.equal(await disp(db, af, new Date('2026-12-08T12:00:00Z')), 3000)
})

test('3. mês fechado com marcador 9999 (robô antigo): o dinheiro está disponível e o fecharMes arruma a data', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await novaVenda(db, af)
  await novaVenda(db, af)
  await fechar(db)
  db.banco.prepare("UPDATE afiliados_lancamentos SET disponivel_em = '9999-12-31 23:59:59'").run() // preso, como a 0022 deixaria
  const dia8 = new Date('2026-12-08T13:00:00Z')
  assert.equal(await disp(db, af, dia8), 3000)
  const r = await pedirSaque(db, af.id, dia8)
  assert.deepEqual([r.ok, r.valor_centavos], [true, 3000])
  // vendas ainda pendentes presas: qualquer chamada do fecharMes troca o marcador (só exibição)
  const af2 = novoAfiliado(db)
  await novaVenda(db, af2)
  await fechar(db)
  db.banco.prepare("UPDATE afiliados_lancamentos SET disponivel_em = '9999-12-31 23:59:59' WHERE afiliado_id = ?").run(af2.id)
  await fecharMes(db, '2026-11', new Date('2026-12-09T12:00:00Z'))
  assert.equal(db.banco.prepare('SELECT disponivel_em d FROM afiliados_lancamentos WHERE afiliado_id = ?').get(af2.id).d, '2026-12-08 12:00:00')
})

test('4. 08/12 às 00:05 sem fechamento: Gestão mostra "a liberar" e o saldo é 0', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  await novaVenda(db, af)
  const cedo = new Date('2026-12-08T03:05:00Z') // 00:05 em Brasília, antes do robô
  assert.equal(await disp(db, af, cedo), 0)
  const [v] = await buscarVendas(db, af.id, null, 5, cedo, { contabil: true })
  assert.equal(v.situacao, 'liberando')
  const f = await fichaDoAfiliado(db, af.id, cedo)
  assert.ok(f.extrato.every((l) => new Date(l.disponivel_em) > cedo), 'o extrato da Gestão não pode dizer "disponível" sem o fechamento')
  await fechar(db, '2026-11', cedo)
  assert.equal((await buscarVendas(db, af.id, null, 5, cedo, { contabil: true }))[0].situacao, 'disponivel')
  assert.equal(await disp(db, af, new Date('2026-12-08T03:06:00Z')), 1500)
})

test('0022 inclui vendas canceladas e continua idempotente', async () => {
  const db = novoDb()
  const af = novoAfiliado(db)
  const id = await novaVenda(db, af)
  await estornarVenda(db, id, new Date('2026-11-12T12:00:00Z'))
  db.banco.prepare('UPDATE afiliados_lancamentos SET disponivel_em = ?').run(ANTIGA)
  db.banco.exec(M0022)
  const foto = () => db.banco.prepare('SELECT status, disponivel_em d FROM afiliados_lancamentos').all().map((x) => [x.status, x.d]).join()
  assert.equal(foto(), 'cancelada,9999-12-31 23:59:59')
  db.banco.exec(M0022)
  assert.equal(foto(), 'cancelada,9999-12-31 23:59:59')
})
