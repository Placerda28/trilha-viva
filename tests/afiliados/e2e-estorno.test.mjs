// Fase 9: a história completa do estorno e do chargeback, chamando as ROTAS de verdade
// (checkout, webhook do Mercado Pago, painel, robô, saque e Gestão), com D1 local e módulos de rede falsos.
//
// O relógio do teste é o Date simulado (mock.timers). O relógio do SQLite não é: por isso, no fim, o teste
// põe nas compras e nos eventos a data certa da história (em produção as duas coincidem).
//
// A CONTA (cada comprador paga R$ 89,90; taxa do Mercado Pago R$ 5,00; líquido R$ 84,90):
//   20 vendas aprovadas em 10/11 -> Prata: garantido 20 x 15 = 300, bônus 20 x (20 - 15) = 100, total 400.
//   1 reembolso ANTES do fechamento -> 19 vendas = Bronze: 19 x 15 = 285, bônus 0.
//   Fechamento (8/12): Bronze, 19 vendas, base 285, bônus 0, total 285.
//   1 chargeback DEPOIS (9/12): estorno de -15 (valor por venda do nível FECHADO). O nível do mês fica Bronze.
//   Saldo disponível = 19 x 15 - 15 = 270. Saque de 270 pago pela Gestão (comprovante no B2 falso).
//   Mediação (11/12) e aprovação de novo (12/12) de outra compra: o acesso volta; o estorno de -15 fica.
//   Financeiro (nov a dez):
//     compras pagas  = 20 - 1 reembolso - 1 chargeback = 18
//     bruto 18 x 89,90 = 1.618,20 | taxas 18 x 5,00 = 90,00 | líquido 18 x 84,90 = 1.528,20
//     comissão base (venda não cancelada) = 19 x 15 = 285,00
//     estornos = -15 (chargeback) -15 (mediação) = -30,00
//     custo = 285 + 0 + 0 - 30 = 255,00 | lucro = 1.528,20 - 255,00 = 1.273,20
//     CPA = 255,00 / 18 = 14,1666... -> 14,17
//   Extrato: 20 vendas + 2 estornos = 22 lançamentos; soma 20 x 15 - 30 = 270 (a venda cancelada entra na soma).
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb, novoAfiliado, contar } from './_base.mjs'
import { statusDoMes } from '../../lib/afiliados/status.js'
import { dadosDoPainel } from '../../lib/afiliados/painel.js'
import { executarAfiliados } from '../../workers/recuperacao-carrinho/afiliados.js'

const url = (arq) => pathToFileURL(resolve(arq)).href
const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export async function cookies() { return { get() { return { value: "t" } } } }'),
  'next/navigation': modulo('export function notFound() { const e = new Error("404"); e.codigo = "NAO_ENCONTRADO"; throw e }'),
  '@/lib/d1': modulo(`export const getDB = () => globalThis.__db; export const getEnv = () => ({})
    export const umaLinha = async (db, sql, ...v) => db.prepare(sql).bind(...v).first()
    export const executar = async (db, sql, ...v) => db.prepare(sql).bind(...v).run()`),
  '@/lib/stripe': modulo('export const getStripe = () => null; export const PRODUCT_NAME = "Pacote"'),
  '@/lib/site': modulo("export const site = { price: 89.9, url: 'https://trilhaviva.org' }"),
  '@/lib/mercadopago': modulo(`import * as r from '${url('lib/mercadopago.js')}'
    export const resumirPagamento = r.resumirPagamento
    export const provedorAtivo = () => 'mercadopago'
    export async function criarPreferencia(d) { globalThis.__preferencias.push(d); return 'https://mp.test/pagar' }
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
  '@/lib/email': modulo('export async function enviarCriarSenha() { return true }; export async function enviarSaqueSolicitado(d) { globalThis.__solicitacoes.push(d) }'),
  '@/lib/meta': modulo(`export async function enviarEventoMeta() { return { status: "ok" } }
    export const ipDoPedido = () => '1.2.3.4'
    export const lerCookiesMeta = () => ({ fbp: '', fbc: '' })
    export const lerOrigemVisita = () => null`),
  '@/lib/carrinhos': modulo(`export const gravarCarrinho = async () => {}
    export const marcarCarrinhosPagos = async () => {}
    export const limparTelefone = (v) => String(v || '').replace(/\\D/g, '')
    export const limparUtm = () => ({ source: '', medium: '', campaign: '', content: '' })
    export const nomeValido = (n) => Boolean(n)
    export const origemDoCarrinho = () => 'direto'
    export const telefoneValido = (v) => String(v || '').replace(/\\D/g, '').length >= 10`),
  '@/lib/leads': modulo('export const marcarLeadComprou = async () => {}'),
  '@/lib/rastreio-compra': modulo('export const gravarRastreioCompra = async () => {}'),
  '@/lib/teste': modulo(`export const ehTeste = async () => false
    export const ehContatoTeste = async () => false
    export const enviarMetaSeReal = async (t, e, enviar) => enviar(e)`),
  '@/lib/whatsapp-acesso': modulo("export const enviarAcessoLiberado = async () => 'desligado'"),
  '@/lib/senhas': modulo('export const senhasConfiguradas = () => true; export const criarConta = async () => ({ ok: true, id: "sb" })'),
  '@/lib/sessao': modulo(`export const criarSessao = async () => {}
    export const normalizarEmail = (v) => String(v || "").trim().toLowerCase()
    export const clienteAtual = async () => globalThis.__cliente`),
  '@/lib/gestao/sessao': modulo('export const adminPeloToken = async () => globalThis.__admin'),
  '@/lib/origem': modulo('export const mesmaOrigem = () => true'),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const checkout = await import('../../app/api/checkout/route.js')
const webhook = await import('../../app/api/mercadopago/webhook/route.js')
const saqueRota = await import('../../app/api/afiliados/saque/route.js')
const saquesRota = await import('../../app/api/afiliados/saques/route.js')
const meuComprovante = await import('../../app/api/afiliados/saques/[id]/comprovante/route.js')
const gUpload = await import('../../app/api/interno/gestao/afiliados/saques/[id]/comprovante/route.js')
const gPagar = await import('../../app/api/interno/gestao/afiliados/saques/[id]/pagar/route.js')
const gDashboard = await import('../../app/api/interno/gestao/afiliados/dashboard/route.js')
const gFinanceiro = await import('../../app/api/interno/gestao/afiliados/financeiro/route.js')
const { temCompra } = await import('../../lib/sessao.js')
const { montarCorpoPreferencia } = await import('../../lib/mercadopago.js')

const HOST = 'https://trilhaviva.org'
const MASTER = { papel: 'master', precisa_trocar_senha: false, cliente: { id: 1, email: 'master@t.com' } }
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 10])
const dia = (iso) => new Date(iso)
const agoraEm = (iso) => mock.timers.setTime(dia(iso).getTime())

// B2 e Resend falsos no fetch global (as rotas de saque usam o fetch padrão).
function redeFalsa() {
  const r = { uploads: 0, emails: [] }
  const ok = (corpo, status = 200) => ({ ok: status < 400, status, json: async () => corpo, text: async () => '' })
  globalThis.fetch = async (u, init = {}) => {
    if (u.includes('b2_authorize_account')) {
      return ok({ authorizationToken: 'TA', apiInfo: { storageApi: { apiUrl: 'https://api.b2.test', downloadUrl: 'https://dl.b2.test', bucketId: 'bkt' } } })
    }
    if (u.endsWith('/b2_get_upload_url')) return ok({ uploadUrl: 'https://up.b2.test/u', authorizationToken: 'TU' })
    if (u === 'https://up.b2.test/u') {
      r.uploads += 1
      return ok({})
    }
    if (u.endsWith('/b2_get_download_authorization')) return ok({ authorizationToken: 'DL' })
    if (u === 'https://api.resend.com/emails') {
      r.emails.push(JSON.parse(init.body))
      return ok({ id: 'e1' })
    }
    throw new Error('fetch inesperado ' + u)
  }
  return r
}
Object.assign(process.env, {
  B2_KEY_ID: 'leitura', B2_APP_KEY: 'x', B2_COMPROVANTES_KEY_ID: 'escrita', B2_COMPROVANTES_APP_KEY: 'y',
  RESEND_API_KEY: 're_x', EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>', MP_WEBHOOK_SECRET: 'segredo',
  NEXT_PUBLIC_SITE_URL: HOST,
})

const ctx = (id) => ({ params: Promise.resolve({ id: String(id) }) })
const get = (rota, q = '') => rota.GET(new Request(`${HOST}/api/x${q}`))
const n = (db, sql, ...a) => contar(db, sql, ...a)

test('estorno e chargeback de ponta a ponta', async (t) => {
  mock.timers.enable({ apis: ['Date'], now: dia('2026-11-10T15:00:00Z') })
  t.after(() => mock.timers.reset())
  const rede = redeFalsa()
  const db = novoDb()
  globalThis.__db = db
  globalThis.__pagamentos = {}
  globalThis.__preferencias = []
  globalThis.__solicitacoes = []
  globalThis.__admin = MASTER
  const enviosEmail = []
  globalThis.__emails = { subiuNivel: async (d) => enviosEmail.push(['nivel', d.titulo]), venda: async () => {} }

  const af = novoAfiliado(db)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const dono = db.banco.prepare('SELECT id, email FROM clientes WHERE id = ?').get(af.clienteId)
  globalThis.__cliente = { id: Number(dono.id), email: dono.email, bloqueado: 0 }
  const pagamentos = [] // pagamento mais novo de cada compra, na ordem das compras
  const compraDe = (i) => db.banco.prepare('SELECT * FROM compras WHERE stripe_session_id = ?').get(`mp_${pagamentos[i].id}`)
  const clienteDe = (i) => Number(compraDe(i).cliente_id)
  const lancs = (tipo) => db.banco.prepare('SELECT * FROM afiliados_lancamentos WHERE tipo = ? ORDER BY id').all(tipo)
  const painel = (iso) => dadosDoPainel(db, af.id, dia(iso))
  let relogioMp = Date.parse('2026-11-10T15:00:00.000Z')
  const avisar = async (p) => {
    globalThis.__pagamentos[p.id] = p
    const res = await webhook.POST(new Request(`${HOST}/api/mercadopago/webhook?type=payment&data.id=${p.id}`, { method: 'POST' }))
    assert.equal(res.status, 200)
  }
  const mudar = async (i, status) => {
    pagamentos[i] = { ...pagamentos[i], status, date_last_updated: new Date((relogioMp += 60000)).toISOString() }
    await avisar(pagamentos[i])
  }

  await t.test('1. checkout com o código: preço cheio, código na preferência, evento gravado', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await checkout.POST(new Request(`${HOST}/api/checkout`, {
        method: 'POST',
        headers: { 'cf-connecting-ip': `9.9.9.${i + 1}` },
        body: JSON.stringify({ nome: 'Comprador', email: `comprador${i}@example.com`, telefone: '27988887777', codigo_afiliado: codigo }),
      }))
      assert.equal(res.status, 200)
      assert.equal((await res.json()).url, 'https://mp.test/pagar')
    }
    assert.equal(globalThis.__preferencias.length, 20)
    assert.ok(globalThis.__preferencias.every((p) => p.afiliado === codigo && p.valorCentavos === 8990))
    assert.equal(n(db, "SELECT COUNT(*) AS n FROM afiliados_eventos WHERE evento = 'checkout_iniciado'"), 20)
  })

  await t.test('2. webhook approved x 20: 20 vendas, Prata, R$ 400', async () => {
    globalThis.__preferencias.forEach((d, i) => {
      const corpo = montarCorpoPreferencia({ ...d, origem: HOST, titulo: 'Pacote', descricao: 'Acervo' })
      const p = {
        id: 5000000 + i, status: 'approved', external_reference: d.referencia, transaction_amount: 89.9, currency_id: 'BRL',
        date_approved: '2026-11-10T12:00:00.000-03:00', date_last_updated: '2026-11-10T12:00:00.000-03:00',
        fee_details: [{ type: 'mercadopago_fee', amount: 4.5 }, { type: 'financing_fee', amount: 0.5 }],
        transaction_details: { net_received_amount: 84.9 },
        metadata: corpo.metadata, payer: { email: d.email },
      }
      pagamentos.push(p)
    })
    for (const p of pagamentos) await avisar(p)
    assert.equal(n(db, "SELECT COUNT(*) AS n FROM compras WHERE status = 'pago' AND afiliado_id = ?", af.id), 20)
    const s = await statusDoMes(db, af.id, '2026-11', dia('2026-11-10T16:00:00Z'))
    assert.deepEqual([s.vendasValidas, s.nivel.nome, s.garantido, s.bonusPrevisto, s.totalPrevisto], [20, 'Prata', 30000, 10000, 40000])
    assert.deepEqual(enviosEmail.map((e) => e[0]), ['nivel'])
  })

  await t.test('3 a 5. reembolso antes do fechamento: painel 19 vendas, Bronze, R$ 285; comprador sem acesso', async () => {
    agoraEm('2026-11-20T15:00:00Z')
    assert.equal(await temCompra(clienteDe(0)), true)
    await mudar(0, 'refunded')
    assert.equal(compraDe(0).status, 'reembolsado')
    assert.equal(lancs('venda')[0].status, 'cancelada')
    assert.equal(lancs('estorno').length, 0) // antes do fechamento é cancelamento, não estorno
    const p = await painel('2026-11-21T15:00:00Z')
    assert.deepEqual([p.vendasValidas, p.nivel.nome, p.ganhos.garantido, p.ganhos.bonusPrevisto, p.ganhos.totalPrevisto], [19, 'Bronze', 28500, 0, 28500])
    assert.equal(p.proximo.nome, 'Prata')
    assert.equal(p.faltam, 1)
    assert.equal(await temCompra(clienteDe(0)), false) // quem pediu reembolso perde o acesso
    assert.equal(await temCompra(clienteDe(1)), true)
  })

  await t.test('6. o robô fecha no dia 8 (e não duplica na segunda rodada)', async () => {
    const env = { DB: db, MODO: 'ativo', TESTE_PARA: 'teste@t.com', RESEND_API_KEY: 'k', EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>', EMAIL_REPLY_TO: 'contato@trilhaviva.org', SITE_URL: HOST }
    const rodar = (iso) => executarAfiliados(env, { agora: dia(iso), logger: { log() {}, error() {} }, fetchImpl: async () => Response.json({ id: 'e' }) })
    await rodar('2026-12-07T12:00:00Z')
    assert.equal(n(db, 'SELECT COUNT(*) AS n FROM afiliados_fechamentos'), 0) // dia 7: cedo
    agoraEm('2026-12-08T12:00:00Z')
    await rodar('2026-12-08T12:00:00Z')
    await rodar('2026-12-08T12:10:00Z')
    const f = db.banco.prepare('SELECT * FROM afiliados_fechamentos').all()
    assert.equal(f.length, 1)
    assert.deepEqual([f[0].vendas_validas, f[0].base_centavos, f[0].bonus_centavos, f[0].total_centavos], [19, 28500, 0, 28500])
    assert.equal(JSON.parse(f[0].niveis_snapshot).nivel.nome, 'Bronze')
    assert.equal(n(db, "SELECT COALESCE(SUM(valor_centavos), 0) AS n FROM afiliados_lancamentos WHERE tipo = 'bonus_nivel'"), 0)
  })

  await t.test('7. chargeback depois do fechamento: estorno de -R$ 15, nível do mês não muda', async () => {
    agoraEm('2026-12-09T15:00:00Z')
    await mudar(1, 'charged_back')
    assert.equal(compraDe(1).status, 'contestado')
    assert.equal(await temCompra(clienteDe(1)), false)
    const est = lancs('estorno')
    assert.deepEqual(est.map((e) => e.valor_centavos), [-1500]) // valor por venda do nível FECHADO (Bronze)
    assert.equal(lancs('venda')[1].status, 'pendente') // a comissão fica; o estorno a desconta
    const s = await statusDoMes(db, af.id, '2026-11', dia('2026-12-09T16:00:00Z'))
    assert.deepEqual([s.fechado, s.vendasValidas, s.nivel.nome, s.totalPrevisto], [true, 19, 'Bronze', 28500])
    assert.equal(n(db, "SELECT COUNT(*) AS n FROM afiliados_eventos WHERE evento = 'chargeback'"), 1)
    await mudar(1, 'charged_back') // aviso repetido não estorna de novo
    assert.equal(lancs('estorno').length, 1)
  })

  await t.test('8. o saldo desconta o estorno: 19 x 15 - 15 = R$ 270', async () => {
    const p = await painel('2026-12-09T16:00:00Z')
    assert.equal(p.cartoes.disponivel, 27000)
    assert.deepEqual([p.saque.pode, p.saque.valor], [true, 27000])
  })

  let saqueId
  await t.test('9. saque pedido pelo afiliado e pago pela Gestão com comprovante', async () => {
    agoraEm('2026-12-10T15:00:00Z')
    const pedido = await saqueRota.POST(new Request(`${HOST}/api/afiliados/saque`, { method: 'POST', headers: { host: 'trilhaviva.org', origin: HOST } }))
    assert.equal(pedido.status, 200)
    const corpo = await pedido.json()
    assert.equal(corpo.valor_centavos, 27000)
    saqueId = db.banco.prepare('SELECT id FROM afiliados_saques').get().id
    assert.equal(globalThis.__solicitacoes.length, 1)

    const f = new FormData()
    f.append('arquivo', new File([PDF], 'c.pdf'))
    const tmp = new Response(f)
    const bytes = await tmp.arrayBuffer()
    const up = await gUpload.POST(new Request(`${HOST}/x`, {
      method: 'POST', body: bytes,
      headers: { host: 'trilhaviva.org', origin: HOST, 'content-type': tmp.headers.get('content-type'), 'content-length': String(bytes.byteLength) },
    }), ctx(saqueId))
    assert.equal(up.status, 200)
    assert.equal(rede.uploads, 1)
    agoraEm('2026-12-10T16:00:00Z')
    const pago = await gPagar.POST(new Request(`${HOST}/x`, { method: 'POST', headers: { host: 'trilhaviva.org', origin: HOST } }), ctx(saqueId))
    assert.deepEqual(await pago.json(), { ok: true, email_enviado: true })
    assert.equal(rede.emails.length, 1)

    const saques = await (await saquesRota.GET()).json()
    assert.deepEqual([saques.itens[0].status, saques.itens[0].valor_centavos, saques.itens[0].temComprovante], ['pago', 27000, true])
    const link = await meuComprovante.GET(new Request(`${HOST}/x`), ctx(saqueId))
    assert.equal(link.status, 302)
    assert.equal(link.headers.get('referrer-policy'), 'no-referrer')
    assert.match(link.headers.get('location'), /^https:\/\/dl\.b2\.test\/file\//)
    const p = await painel('2026-12-10T17:00:00Z')
    assert.deepEqual([p.cartoes.disponivel, p.cartoes.jaRecebido], [0, 27000])
  })

  await t.test('10. in_mediation seguido de approved devolve o acesso (o estorno de -R$ 15 fica)', async () => {
    agoraEm('2026-12-11T15:00:00Z')
    await mudar(2, 'in_mediation')
    assert.equal(compraDe(2).status, 'em_mediacao')
    assert.equal(await temCompra(clienteDe(2)), false)
    assert.equal(lancs('estorno').length, 2)
    agoraEm('2026-12-12T15:00:00Z')
    await mudar(2, 'approved')
    assert.equal(compraDe(2).status, 'pago')
    assert.equal(await temCompra(clienteDe(2)), true)
    // Limitação conhecida (docs/architecture.md, Fase 4): mediação ganha pela loja não devolve a comissão.
    assert.equal(lancs('estorno').length, 2)
    const p = await painel('2026-12-12T16:00:00Z')
    assert.equal(p.cartoes.disponivel, -1500)
    assert.equal(p.saque.pode, false)
  })

  await t.test('11. dashboard e financeiro da Gestão batem com a conta do comentário', async () => {
    // Datas do SQLite (que não segue o relógio do teste): ficam as da história.
    db.banco.exec("UPDATE compras SET criado_em = '2026-11-10 15:00:00'")
    db.banco.exec("UPDATE afiliados_eventos SET criado_em = '2026-11-10 15:00:00'")
    agoraEm('2026-12-15T15:00:00Z')
    const PER = '?de=2026-11-01&ate=2026-12-31'
    const d = await (await get(gDashboard, PER)).json()
    assert.equal(d.ok, true)
    const c = d.compensa
    assert.deepEqual([c.vendas_afiliados, c.vendas_total, c.pct_vendas_afiliados], [18, 18, 100])
    assert.equal(c.receita_liquida_afiliados_centavos, 152820)
    assert.deepEqual(c.custo_programa, { como_contado: c.custo_programa.como_contado, total_centavos: 25500, base_centavos: 28500, bonus_centavos: 0, ajustes_centavos: 0, estornos_centavos: -3000 })
    assert.equal(c.lucro_afiliados_centavos, 127320)
    assert.equal(c.cpa_centavos, 1417)
    assert.deepEqual([d.dinheiro.disponivel_centavos, d.dinheiro.liberando_centavos], [0, 0])
    assert.deepEqual(d.dinheiro.saques_pendentes, { quantidade: 0, valor_centavos: 0 })
    assert.deepEqual(d.dinheiro.pago_no_periodo, { quantidade: 1, valor_centavos: 27000 })
    const fu = d.series.funil
    assert.deepEqual([fu.checkouts, fu.estornos.reembolsos, fu.estornos.chargebacks, fu.estornos.total], [20, 2, 1, 3])
    assert.deepEqual([d.afiliados.cadastrados, d.afiliados.ativos, d.afiliados.venderam], [1, 1, 1])
    assert.deepEqual(d.series.top_afiliados.map((x) => [x.codigo, x.vendas]), [[codigo, 18]])

    const fin = await (await get(gFinanceiro, PER)).json()
    const [nov, dez] = fin.resumo_mensal.meses
    assert.deepEqual([nov.mes, nov.vendas, nov.bruto, nov.taxas, nov.liquido, nov.comissoes_base, nov.estornos], ['2026-11', 18, 161820, 9000, 152820, 28500, 0])
    assert.deepEqual([dez.mes, dez.vendas, dez.liquido, dez.comissoes_base, dez.estornos, dez.custo, dez.lucro], ['2026-12', 0, 0, 0, -3000, -3000, 3000])
    const tot = fin.resumo_mensal.totais
    assert.deepEqual([tot.custo, tot.lucro], [25500, 127320]) // igual ao dashboard
    assert.deepEqual([fin.extrato.total_itens, fin.extrato.soma_centavos], [22, 25500]) // soma sem as canceladas (1500 vão em canceladas_centavos)
  })
})
