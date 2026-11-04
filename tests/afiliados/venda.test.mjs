// Fase 4 (backend): venda com código de afiliado, reembolso e acesso. Roda o webhook e o
// /api/conta/criar de verdade (módulos de rede falsos, D1 local com todas as migrações).
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb, novoAfiliado, contar } from './_base.mjs'
import { statusDoMes } from '../../lib/afiliados/status.js'
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { listarCupons } from '../../lib/gestao/cupons.js'

const url = (arq) => pathToFileURL(resolve(arq)).href
const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export function cookies() {}'),
  '@/lib/d1': modulo(`export const getDB = () => globalThis.__db; export const getEnv = () => ({})
    export const umaLinha = async (db, sql, ...v) => db.prepare(sql).bind(...v).first()
    export const executar = async (db, sql, ...v) => db.prepare(sql).bind(...v).run()`),
  '@/lib/mercadopago': modulo(`import { resumirPagamento as r } from '${url('lib/mercadopago.js')}'
    export const resumirPagamento = r
    export const chaveDaCompraNoPrazo = () => true
    export const assinaturaValida = async () => true
    export const idPagamentoValido = () => true
    export const mpConfigurado = () => true
    export const buscarPagamento = async (id) => globalThis.__pagamentos[id]`),
  '@/lib/confirmar': modulo(`import { resumirPagamento } from '${url('lib/mercadopago.js')}'
    export const confirmarPagamento = async (c) => resumirPagamento(globalThis.__pagamentos[c.payment_id])`),
  '@/lib/clientes': modulo(`import { registrarCompraNoBanco } from '${url('lib/gestao/cupons.js')}'
    export async function acharOuCriar({ email, nome }) {
      const db = globalThis.__db
      await db.prepare('INSERT OR IGNORE INTO clientes (email, nome) VALUES (?, ?)').bind(email, nome).run()
      return db.prepare('SELECT * FROM clientes WHERE email = ?').bind(email).first()
    }
    export const criarToken = async () => 'token'
    export const usarToken = async () => null
    export const salvarSupabaseId = async () => {}
    export const registrarCompra = (d) => registrarCompraNoBanco(globalThis.__db, d, { emails: globalThis.__emails })`),
  '@/lib/email': modulo('export async function enviarCriarSenha() { return true }'),
  '@/lib/meta': modulo('export async function enviarEventoMeta(e) { globalThis.__meta.push(e.nome); return { status: "ok" } }'),
  '@/lib/site': modulo("export const site = { url: 'https://trilhaviva.org' }"),
  '@/lib/carrinhos': modulo('export const marcarCarrinhosPagos = async () => {}'),
  '@/lib/leads': modulo('export const marcarLeadComprou = async () => {}'),
  '@/lib/rastreio-compra': modulo('export const gravarRastreioCompra = async () => {}'),
  '@/lib/teste': modulo(`export const ehTeste = async () => Boolean(globalThis.__teste)
    export const enviarMetaSeReal = async (t, e, enviar) => (t ? { status: 'teste' } : enviar(e))`),
  '@/lib/whatsapp-acesso': modulo("export const enviarAcessoLiberado = async () => 'desligado'"),
  '@/lib/senhas': modulo('export const senhasConfiguradas = () => true; export const criarConta = async () => ({ ok: true, id: "sb" })'),
  '@/lib/sessao': modulo('export const criarSessao = async () => {}; export const normalizarEmail = (v) => String(v || "").trim().toLowerCase()'),
  '@/lib/origem': modulo('export const mesmaOrigem = () => true'),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const webhook = await import('../../app/api/mercadopago/webhook/route.js')
const criar = await import('../../app/api/conta/criar/route.js')
const { temCompra } = await import('../../lib/sessao.js')

const REF = '6f1c2b8e-3a4d-4e5f-9a7b-1c2d3e4f5a6b'
const FIM_NOV = '2026-12-08T12:00:00Z'
let seq = 1000000

// Pagamento bruto do Mercado Pago, como buscarPagamento devolve.
function pagamento({ status = 'approved', afiliado = '', email = 'comprador@example.com', telefone = '27988887777', id } = {}) {
  seq += 1
  const pid = id ?? seq
  return {
    id: pid,
    status,
    external_reference: REF,
    transaction_amount: 89.9,
    currency_id: 'BRL',
    date_approved: '2026-11-10T12:00:00.000-03:00',
    fee_details: [{ type: 'mercadopago_fee', amount: 4.5 }, { type: 'financing_fee', amount: 0.5 }],
    transaction_details: { net_received_amount: 84.9 },
    metadata: { referencia: REF, email, nome: 'Comprador', cupom: '', afiliado, telefone },
    payer: { email },
  }
}

function montar({ teste = false, falharEmail = false } = {}) {
  const db = novoDb()
  globalThis.__db = db
  globalThis.__pagamentos = {}
  globalThis.__meta = []
  globalThis.__teste = teste
  globalThis.__enviados = []
  const enviar = (tipo) => async (d) => {
    globalThis.__enviados.push({ tipo, ...d })
    if (falharEmail) throw new Error('resend caiu')
  }
  globalThis.__emails = { subiuNivel: enviar('nivel'), venda: enviar('venda') }
  process.env.MP_WEBHOOK_SECRET = 'segredo'
  return db
}

const avisar = async (p) => {
  globalThis.__pagamentos[p.id] = p
  return webhook.POST(new Request(`https://trilhaviva.org/api/mercadopago/webhook?type=payment&data.id=${p.id}`, { method: 'POST' }))
}
const compraDe = (db, p) => db.banco.prepare('SELECT * FROM compras WHERE stripe_session_id = ?').get(`mp_${p.id}`)
const lancamentos = (db, tipo) => db.banco.prepare('SELECT * FROM afiliados_lancamentos WHERE tipo = ? ORDER BY id').all(tipo)
const eventos = (db, evento) => contar(db, 'SELECT COUNT(*) AS n FROM afiliados_eventos WHERE evento = ?', evento)
const clienteComprador = (db) => db.banco.prepare("SELECT id FROM clientes WHERE email = 'comprador@example.com'").get().id

test('venda com código gera 1 comissão de R$ 15, grava bruto, taxa e líquido e o evento', async () => {
  const db = montar()
  const af = novoAfiliado(db)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const p = pagamento({ afiliado: codigo })
  assert.equal((await avisar(p)).status, 200)
  const c = compraDe(db, p)
  assert.equal(c.afiliado_id, af.id)
  assert.equal(c.codigo_afiliado, codigo)
  assert.equal(c.valor_centavos, 8990)
  assert.deepEqual([c.bruto_centavos, c.taxa_mp_centavos, c.liquido_centavos], [8990, 500, 8490])
  const l = lancamentos(db, 'venda')
  assert.equal(l.length, 1)
  assert.equal(l[0].valor_centavos, 1500)
  assert.equal(l[0].compra_id, c.id)
  assert.equal(eventos(db, 'pagamento_aprovado'), 1)
  assert.equal(await temCompra(clienteComprador(db), db), true)
})

test('o mesmo pagamento pelo caminho /api/conta/criar (a /sucesso) também gera a comissão', async () => {
  const db = montar()
  const af = novoAfiliado(db)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const p = pagamento({ afiliado: codigo })
  globalThis.__pagamentos[p.id] = p
  const res = await criar.POST(
    new Request('https://trilhaviva.org/api/conta/criar', {
      method: 'POST',
      body: JSON.stringify({ senha: 'umasenhaboa1', payment_id: String(p.id), ref: REF }),
    }),
  )
  assert.equal(res.status, 200)
  assert.equal(lancamentos(db, 'venda').length, 1)
  assert.equal(lancamentos(db, 'venda')[0].valor_centavos, 1500)
  assert.equal(compraDe(db, p).afiliado_id, af.id)
  // O webhook do mesmo pagamento chega depois: nada duplica.
  await avisar(p)
  assert.equal(lancamentos(db, 'venda').length, 1)
  assert.equal(contar(db, 'SELECT COUNT(*) AS n FROM compras'), 1)
  assert.equal(eventos(db, 'pagamento_aprovado'), 1)
})

test('webhook repetido 3 vezes: 1 compra, 1 comissão, 1 evento, 1 e-mail de venda', async () => {
  const db = montar()
  const af = novoAfiliado(db)
  db.banco.prepare('UPDATE afiliados SET avisar_cada_venda = 1 WHERE id = ?').run(af.id)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const p = pagamento({ afiliado: codigo })
  for (let i = 0; i < 3; i++) assert.equal((await avisar(p)).status, 200)
  assert.equal(contar(db, 'SELECT COUNT(*) AS n FROM compras'), 1)
  assert.equal(lancamentos(db, 'venda').length, 1)
  assert.equal(eventos(db, 'pagamento_aprovado'), 1)
  assert.equal(globalThis.__enviados.filter((e) => e.tipo === 'venda').length, 1)
})

test('comprador igual ao afiliado: compra ok, sem comissão, com evento (e-mail, telefone ou cliente)', async () => {
  for (const variante of ['email', 'telefone']) {
    const db = montar()
    const af = novoAfiliado(db)
    const dados = db.banco.prepare('SELECT a.codigo, c.email FROM afiliados a JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ?').get(af.id)
    db.banco.prepare('UPDATE afiliados SET telefone = ? WHERE id = ?').run('27977776666', af.id)
    const p = pagamento(
      variante === 'email'
        ? { afiliado: dados.codigo, email: dados.email }
        : { afiliado: dados.codigo, telefone: '+55 (27) 97777-6666' },
    )
    assert.equal((await avisar(p)).status, 200)
    const c = compraDe(db, p)
    assert.equal(c.status, 'pago')
    assert.equal(c.afiliado_id, null)
    assert.equal(c.codigo_afiliado, null)
    assert.equal(lancamentos(db, 'venda').length, 0, variante)
    assert.equal(eventos(db, 'codigo_recusado_proprio'), 1, variante)
    await avisar(p) // repetição: não repete o evento
    assert.equal(eventos(db, 'codigo_recusado_proprio'), 1)
  }
})

test('código inativo, suspenso ou inexistente: compra ok, sem afiliado', async () => {
  const db = montar()
  const inativo = novoAfiliado(db, { status: 'pendente' })
  const cod = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(inativo.id).codigo
  const p1 = pagamento({ afiliado: cod })
  const p2 = pagamento({ afiliado: 'NAOEXISTE' })
  assert.equal((await avisar(p1)).status, 200)
  assert.equal((await avisar(p2)).status, 200)
  for (const p of [p1, p2]) {
    assert.equal(compraDe(db, p).status, 'pago')
    assert.equal(compraDe(db, p).afiliado_id, null)
  }
  assert.equal(lancamentos(db, 'venda').length, 0)
  assert.equal(eventos(db, 'codigo_recusado_inativo'), 1)
  assert.equal(contar(db, 'SELECT COUNT(*) AS n FROM afiliados_eventos'), 1)
})

test('compra de teste (teste = 1) não gera comissão nem evento de afiliado', async () => {
  const db = montar({ teste: true })
  const af = novoAfiliado(db)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const p = pagamento({ afiliado: codigo })
  assert.equal((await avisar(p)).status, 200)
  const c = compraDe(db, p)
  assert.equal(c.teste, 1)
  assert.equal(c.afiliado_id, null)
  assert.equal(lancamentos(db, 'venda').length, 0)
  assert.equal(contar(db, 'SELECT COUNT(*) AS n FROM afiliados_eventos'), 0)
})

test('subida de nível: 20ª venda grava o aviso e o e-mail com o valor do mês, uma vez só', async () => {
  const db = montar()
  const af = novoAfiliado(db)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  for (let i = 0; i < 19; i++) await avisar(pagamento({ afiliado: codigo }))
  assert.equal(contar(db, 'SELECT COUNT(*) AS n FROM afiliados_avisos'), 0)
  assert.equal(globalThis.__enviados.length, 0)
  const vigesima = pagamento({ afiliado: codigo })
  await avisar(vigesima)
  await avisar(vigesima)
  const avisos = db.banco.prepare('SELECT titulo, texto FROM afiliados_avisos').all()
  assert.equal(avisos.length, 1)
  assert.equal(avisos[0].titulo, 'Você subiu para PRATA!')
  assert.match(avisos[0].texto, /R\$ 400,00/) // 20 x R$ 20 passou a valer
  assert.equal(globalThis.__enviados.filter((e) => e.tipo === 'nivel').length, 1)
  assert.equal(globalThis.__enviados[0].para, db.banco.prepare('SELECT c.email FROM afiliados a JOIN clientes c ON c.id = a.cliente_id').get().email)
})

test('falha no e-mail do afiliado só gera log: pagamento, acesso e comissão ficam', async (t) => {
  const db = montar({ falharEmail: true })
  const erros = []
  t.mock.method(console, 'error', (...a) => erros.push(a))
  const af = novoAfiliado(db)
  db.banco.prepare('UPDATE afiliados SET avisar_cada_venda = 1 WHERE id = ?').run(af.id)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const p = pagamento({ afiliado: codigo })
  assert.equal((await avisar(p)).status, 200)
  assert.equal(compraDe(db, p).status, 'pago')
  assert.equal(lancamentos(db, 'venda').length, 1)
  assert.equal(await temCompra(clienteComprador(db), db), true)
  assert.ok(erros.some((e) => String(e[0]).startsWith('afiliado e-mail')))
  assert.ok(compraDe(db, p).acesso_enviado_em) // o acesso do comprador saiu
})

test('reembolso: muda o status, tira o acesso, cancela a comissão e a venda sai da meta', async () => {
  const db = montar()
  const af = novoAfiliado(db)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const ps = []
  for (let i = 0; i < 20; i++) ps.push(pagamento({ afiliado: codigo }))
  for (const p of ps) await avisar(p)
  assert.equal((await statusDoMes(db, af.id, '2026-11')).nivel.nome, 'Prata')
  const meta = globalThis.__meta.length

  const reembolsado = { ...ps[0], status: 'refunded' }
  assert.equal((await avisar(reembolsado)).status, 200)
  assert.equal((await avisar(reembolsado)).status, 200) // repetido: sem efeito novo
  assert.equal(compraDe(db, ps[0]).status, 'reembolsado')
  assert.equal(await temCompra(clienteComprador(db), db), true) // as outras 19 compras seguem pagas (mesmo comprador)
  assert.equal(db.banco.prepare("SELECT status FROM afiliados_lancamentos WHERE compra_id = ? AND tipo = 'venda'").get(compraDe(db, ps[0]).id).status, 'cancelada')
  const st = await statusDoMes(db, af.id, '2026-11')
  assert.equal(st.vendasValidas, 19)
  assert.equal(st.nivel.nome, 'Bronze')
  assert.equal(st.totalPrevisto, 28500)
  assert.equal(eventos(db, 'reembolso'), 1)
  assert.equal(globalThis.__meta.length, meta, 'reembolso não manda evento de compra à Meta')
})

test('acesso cai no reembolso (temCompra = false) e volta quando a mediação termina a favor da loja', async () => {
  const db = montar()
  const af = novoAfiliado(db)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const p = pagamento({ afiliado: codigo })
  await avisar(p)
  const cliente = clienteComprador(db)
  assert.equal(await temCompra(cliente, db), true)

  await avisar({ ...p, status: 'in_mediation' })
  assert.equal(compraDe(db, p).status, 'em_mediacao')
  assert.equal(await temCompra(cliente, db), false)
  assert.equal(lancamentos(db, 'venda')[0].status, 'cancelada')
  assert.equal(eventos(db, 'reembolso'), 1)

  await avisar({ ...p, status: 'approved' })
  assert.equal(compraDe(db, p).status, 'pago')
  assert.equal(await temCompra(cliente, db), true)
  assert.equal(lancamentos(db, 'venda')[0].status, 'pendente') // mês aberto: a comissão cancelada volta
  assert.equal(contar(db, 'SELECT COUNT(*) AS n FROM compras'), 1)
  assert.equal(lancamentos(db, 'venda').length, 1)

  await avisar({ ...p, status: 'charged_back' })
  assert.equal(compraDe(db, p).status, 'contestado')
  assert.equal(await temCompra(cliente, db), false)
  assert.equal(eventos(db, 'chargeback'), 1)
})

test('reembolso depois do fechamento do mês gera estorno negativo; mediação a favor da loja não recria a comissão', async () => {
  const db = montar()
  const af = novoAfiliado(db)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const p = pagamento({ afiliado: codigo })
  await avisar(p)
  const fech = await fecharMes(db, '2026-11', new Date(FIM_NOV))
  assert.equal(fech.fechados.length, 1)

  await avisar({ ...p, status: 'refunded' })
  const est = lancamentos(db, 'estorno')
  assert.equal(est.length, 1)
  assert.equal(est[0].valor_centavos, -1500)
  assert.equal(lancamentos(db, 'venda')[0].status, 'pendente')

  await avisar({ ...p, status: 'approved' })
  assert.equal(compraDe(db, p).status, 'pago') // o acesso volta
  assert.equal(lancamentos(db, 'estorno').length, 1) // limitação: o estorno fica e a comissão não volta sozinha
})

test('reembolso de pagamento que nunca virou compra, de compra sem afiliado e pagamento rejeitado', async () => {
  const db = montar()
  const solto = pagamento({ status: 'refunded' })
  assert.equal((await avisar(solto)).status, 200)
  assert.equal(contar(db, 'SELECT COUNT(*) AS n FROM compras'), 0)

  const comum = pagamento()
  await avisar(comum)
  await avisar({ ...comum, status: 'refunded' })
  assert.equal(compraDe(db, comum).status, 'reembolsado')
  assert.equal(await temCompra(clienteComprador(db), db), false)

  const rejeitado = pagamento({ status: 'rejected' })
  assert.equal((await avisar(rejeitado)).status, 200)
  assert.equal(compraDe(db, rejeitado), undefined)
  // approved com devolução parcial segue como aprovado: nada muda.
  const parcial = pagamento()
  await avisar({ ...parcial, transaction_amount_refunded: 10 })
  assert.equal(compraDe(db, parcial).status, 'pago')
})

test('faturamento por cupom não soma compra reembolsada (a vaga do cupom continua ocupada)', async () => {
  const db = montar()
  db.banco.exec(`INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por)
    VALUES ('PROMO10', 'percentual', 10, '2099-12-31 02:59:59', 5, 'm@example.com')`)
  const cli = db.banco.prepare("INSERT INTO clientes (email) VALUES ('c@example.com') RETURNING id").get().id
  db.banco.prepare("INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, cupom, status) VALUES (?, 'mp_1', 8000, 'PROMO10', 'pago'), (?, 'mp_2', 8000, 'PROMO10', 'reembolsado')").run(cli, cli)
  const [c] = await listarCupons(db)
  assert.equal(c.faturamento_centavos, 8000)
}) 
