import test from 'node:test'
import assert from 'node:assert/strict'
import { montarFaltamVendas, montarResumoFechamento } from '../../lib/emails-afiliado.js'

const env = { EMAIL_FROM: 'Trilha Viva <a@t.com>', EMAIL_REPLY_TO: 'c@t.com', SITE_URL: 'https://trilhaviva.org' }
const SEM_ESCRITURACAO = /base|bônus|bonus|garantido|carência|7 dias/i

test('resumo do fechamento: um valor só, sem base nem bônus', () => {
  const e = montarResumoFechamento({ para: 'a@t.com', nome: 'Ana', mes: '2026-10', vendas: 20, nivel: 'Prata', total: 40000, disponivel: 40000 }, env)
  assert.equal(e.titulo, 'Seu mês de outubro fechou: 20 vendas, nível Prata, R$ 400,00 disponível para saque')
  assert.ok(e.subject.startsWith(e.titulo))
  assert.doesNotMatch(e.html + e.text, SEM_ESCRITURACAO)
  assert.doesNotMatch(e.text, /Somando/) // saldo igual ao total: sem linha extra
  // com sobra de meses anteriores, o saldo total aparece à parte; sem nível, a frase não inventa um
  const sobra = montarResumoFechamento({ para: 'a@t.com', nome: '', mes: '2026-10', vendas: 1, nivel: null, total: 1500, disponivel: 4500 }, env)
  assert.equal(sobra.titulo, 'Seu mês de outubro fechou: 1 venda, R$ 15,00 disponível para saque')
  assert.match(sobra.text, /saldo disponível para saque agora é R\$ 45,00/)
})

test('faltam X: com os valores de hoje e da meta, sem base nem bônus; sem valores (aviso antigo na fila) também sai', () => {
  const com = montarFaltamVendas({ para: 'a@t.com', nome: 'Ana', mes: '2026-11', vendas: 17, faltam: 3, proximo: 'Prata', valorHoje: 25500, valorSeBater: 40000 }, env)
  assert.equal(com.titulo, 'Faltam 3 vendas para o nível Prata')
  assert.match(com.text, /Hoje seu mês vale R\$ 255,00\. Batendo a meta, passa a valer R\$ 400,00/)
  assert.doesNotMatch(com.html + com.text, SEM_ESCRITURACAO)
  const antigo = montarFaltamVendas({ para: 'a@t.com', nome: 'Ana', mes: '2026-11', vendas: 19, faltam: 1, proximo: 'Prata' }, env)
  assert.equal(antigo.titulo, 'Faltam 1 venda para o nível Prata')
  assert.doesNotMatch(antigo.text, /Hoje seu mês vale/)
})

test('aviso de venda: mês aberto = "seu mês vale"; mês já fechado = valor da venda, já disponível', async () => {
  const { concluirVendaAfiliado } = await import('../../lib/afiliados/venda.js')
  const { FECHA, fechar, novoAfiliado, novoDb } = await import('./_base.mjs')
  const db = novoDb()
  const af = novoAfiliado(db)
  db.banco.prepare('UPDATE afiliados SET avisar_cada_venda = 1 WHERE id = ?').run(af.id)
  const enviados = []
  const emails = { venda: async (d) => void enviados.push(d) }
  const compra = (n) =>
    Number(db.banco.prepare("INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, afiliado_id) VALUES (?, ?, 7990, 'pago', ?) RETURNING id").get(af.clienteId, `mp_e${n}`, af.id).id)

  await concluirVendaAfiliado(db, { afiliadoId: af.id, compraId: compra(1), aprovadoEm: '2026-11-10T12:00:00Z', emails })
  await concluirVendaAfiliado(db, { afiliadoId: af.id, compraId: compra(2), aprovadoEm: '2026-11-11T12:00:00Z', emails })
  assert.deepEqual([enviados[1].vendasMes, enviados[1].mesValeCentavos, enviados[1].mesFechado], [2, 3000, undefined])

  await fechar(db, '2026-11', FECHA)
  await concluirVendaAfiliado(db, { afiliadoId: af.id, compraId: compra(3), aprovadoEm: '2026-11-30T23:00:00Z', emails })
  assert.deepEqual([enviados[2].mesFechado, enviados[2].valorCentavos], [true, 1500])
})
