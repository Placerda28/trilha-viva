// Rotas da Gestão: dashboard, financeiro (com CSV) e alertas. Permissão real (soAdmin) com sessão falsa.
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb } from './_base.mjs'
import { montarCenario } from './_cenario.mjs'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export async function cookies() { return { get() { return { value: "t" } } } }'),
  'next/navigation': modulo('export function notFound() { const e = new Error("404"); e.codigo = "NAO_ENCONTRADO"; throw e }'),
  '@/lib/d1': modulo('export const getDB = () => globalThis.__db'),
  '@/lib/gestao/sessao': modulo('export const adminPeloToken = async () => globalThis.__admin'),
  '@/lib/sessao': modulo('export const clienteAtual = async () => globalThis.__cliente'),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const B = '../../app/api/interno/gestao/afiliados'
const dash = await import(`${B}/dashboard/route.js`)
const fin = await import(`${B}/financeiro/route.js`)
const csv = await import(`${B}/financeiro/csv/route.js`)
const alertas = await import(`${B}/alertas/route.js`)
const resolver = await import(`${B}/alertas/[id]/resolver/route.js`)

const HOST = 'https://trilhaviva.org'
const ADMIN = { papel: 'master', precisa_trocar_senha: false, cliente: { id: 1, email: 'Master@T.com' } }
const MEMBRO = { papel: 'membro', precisa_trocar_senha: false, cliente: { id: 2, email: 'membro@t.com' } }
const get = (rota, q = '') => rota.GET(new Request(`${HOST}/api/x${q}`))
const post = (rota, id, cab = {}) =>
  rota.POST(new Request(`${HOST}/api/x`, { method: 'POST', headers: { host: 'trilhaviva.org', ...cab } }), { params: Promise.resolve({ id }) })
const nao = async (promessa) => assert.rejects(Promise.resolve().then(() => promessa), (e) => e.codigo === 'NAO_ENCONTRADO')
const PER = '?de=2026-11-01&ate=2026-11-30'

let base
async function preparar(admin = ADMIN) {
  if (!base) {
    base = novoDb()
    await montarCenario(base)
  }
  globalThis.__db = base
  globalThis.__admin = admin
  return base
}

test('quem não é admin recebe 404 em todas as rotas, e a troca de senha pendente também', async () => {
  await preparar(null)
  await nao(get(dash, PER))
  await nao(get(fin, PER))
  await nao(get(csv, `${PER}&tipo=comissoes`))
  await nao(get(alertas))
  await nao(post(resolver, 'saque_atrasado:1'))
  globalThis.__admin = { ...ADMIN, precisa_trocar_senha: true }
  await nao(get(dash, PER))
})

test('membro autorizado lê tudo e resolve alerta; métodos errados dão 404', async () => {
  await preparar(MEMBRO)
  assert.equal((await get(dash, PER)).status, 200)
  assert.equal((await get(alertas)).status, 200)
  await nao(Promise.resolve().then(() => dash.POST()))
  await nao(Promise.resolve().then(() => csv.POST()))
  await nao(Promise.resolve().then(() => resolver.GET()))
})

test('dashboard: 200 com no-store, período obrigatório e válido', async () => {
  await preparar()
  const r = await get(dash, PER)
  assert.equal(r.status, 200)
  assert.match(r.headers.get('cache-control'), /no-store/)
  const corpo = await r.json()
  assert.equal(corpo.ok, true)
  assert.equal(corpo.compensa.vendas_afiliados, 101)
  assert.equal(corpo.compensa.lucro_afiliados_centavos, 596990)
  assert.equal((await get(dash)).status, 400)
  assert.equal((await get(dash, '?de=2026-11-30&ate=2026-11-01')).status, 400)
  assert.equal((await get(dash, '?de=2026-01-01&ate=2028-12-31')).status, 400)
})

test('financeiro: extrato e resumo mensal no mesmo retorno, com filtros validados', async () => {
  await preparar()
  const r = await (await get(fin, `${PER}&tipo=estorno`)).json()
  assert.equal(r.ok, true)
  assert.equal(r.extrato.total_itens, 1)
  assert.equal(r.extrato.soma_centavos, -1500)
  assert.equal(r.resumo_mensal.meses.length, 1)
  assert.equal(r.resumo_mensal.meses[0].liquido, 757990)
  assert.equal((await get(fin, `${PER}&tipo=outro`)).status, 400)
  assert.equal((await get(fin, `${PER}&afiliado=abc`)).status, 400)
  assert.equal((await get(fin, '?de=x&ate=y')).status, 400)
})

test('CSV de comissões: BOM, ponto e vírgula, proteção contra fórmula e registro de quem exportou', async () => {
  const db = await preparar()
  const r = await get(csv, `${PER}&tipo=comissoes`)
  assert.equal(r.status, 200)
  assert.match(r.headers.get('content-type'), /text\/csv; charset=utf-8/)
  assert.match(r.headers.get('content-disposition'), /afiliados-comissoes-2026-11-01-a-2026-11-30\.csv/)
  assert.match(r.headers.get('cache-control'), /no-store/)
  const bytes = new Uint8Array(await r.arrayBuffer())
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]) // BOM que o Excel espera
  const linhas = new TextDecoder().decode(bytes).trim().split('\r\n') // o decodificador tira o BOM
  assert.equal(linhas[0], 'Data;Afiliado;Código;Tipo;Mês de referência;Valor;Status;Compra;Descrição')
  // 151+ lançamentos de novembro (vendas, bônus de outubro criado em 30/11, estorno e ajuste)
  assert.ok(linhas.length > 100)
  const doA2 = linhas.filter((l) => l.includes("'=HYPERLINK(x)"))
  assert.ok(doA2.length >= 5, 'nome que começa com = tem de ser protegido com aspas simples')
  assert.ok(!linhas.some((l) => l.split(';')[1] === '=HYPERLINK(x)'))
  assert.ok(linhas.some((l) => /;Bônus de nível;2026-10;100,00;/.test(l)))
  const reg = db.banco.prepare("SELECT * FROM registro WHERE acao = 'afiliados_exportar' ORDER BY id DESC").get()
  assert.equal(reg.quem, 'master@t.com')
  assert.equal(reg.alvo, 'comissoes')
  assert.deepEqual(JSON.parse(reg.detalhe), { tipo: 'comissoes', de: '2026-11-01', ate: '2026-11-30', linhas: linhas.length - 1 })
})

test('CSV de saques pagos: CPF e chave Pix de quem recebeu, chave com + protegida', async () => {
  await preparar()
  const texto = await (await get(csv, `${PER}&tipo=saques_pagos`)).text()
  const [cab, linha, resto] = texto.trim().split('\r\n')
  assert.equal(cab, 'Pago em;Afiliado;CPF do afiliado;Titular da chave Pix;CPF do titular;Tipo da chave;Chave Pix;Valor;Pedido em;Pago por')
  assert.equal(resto, undefined)
  assert.equal(linha, "20/11/2026 12:00;Duda Souza;111.111.111-03;Duda Souza;123.456.789-01;email;'+5527999990000;400,00;10/11/2026 09:00;master@t.com")
})

test('CSV do resumo mensal tem uma linha por mês e o total', async () => {
  await preparar()
  const texto = await (await get(csv, '?de=2026-10-01&ate=2026-11-30&tipo=resumo_mensal')).text()
  const linhas = texto.trim().split('\r\n')
  assert.equal(linhas.length, 4)
  assert.equal(linhas[1], '10/2026;25;1997,50;122,50;1875,00;375,00;100,00;0,00;0,00;1400,00;0')
  assert.equal(linhas[2], '11/2026;101;8069,90;490,00;7579,90;1530,00;0,00;-5,00;-15,00;6069,90;1')
  assert.equal(linhas[3], 'Total;126;10067,40;612,50;9454,90;1905,00;100,00;-5,00;-15,00;7469,90;1')
})

test('CSV: tipo e período inválidos dão 400; mais de 5.000 linhas é recusado em vez de cortado', async () => {
  const db = await preparar()
  assert.equal((await get(csv, `${PER}&tipo=x`)).status, 400)
  assert.equal((await get(csv, '?tipo=comissoes')).status, 400)
  const grande = novoDb()
  grande.banco.exec(`INSERT INTO clientes (email) VALUES ('g@t.com');
    INSERT INTO afiliados (cliente_id, codigo, nome, cpf) VALUES (1, 'GRANDE1', 'G', '1');
    WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5001)
    INSERT INTO afiliados_lancamentos (afiliado_id, tipo, mes_referencia, valor_centavos, criado_em) SELECT 1, 'ajuste', '2026-11', 1, '2026-11-15 12:00:00' FROM n;`)
  globalThis.__db = grande
  const r = await get(csv, `${PER}&tipo=comissoes`)
  assert.equal(r.status, 400)
  assert.match((await r.json()).erro, /mais de 5000 linhas/)
  assert.equal(Number(grande.banco.prepare("SELECT COUNT(*) AS n FROM registro WHERE acao = 'afiliados_exportar'").get().n), 0)
  globalThis.__db = db
})

test('alertas: lista, resolve (idempotente), 404 de outra origem e chave inválida', async () => {
  const db = novoDb()
  const af = Number(db.banco.prepare("INSERT INTO clientes (email) VALUES ('a@t.com') RETURNING id").get().id)
  const a = Number(db.banco.prepare("INSERT INTO afiliados (cliente_id, codigo, nome, cpf) VALUES (?, 'ROTA1XX', 'Rota', '12345678909') RETURNING id").get(af).id)
  const pedido = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 19).replace('T', ' ')
  const s = Number(db.banco.prepare("INSERT INTO afiliados_saques (afiliado_id, chave, valor_centavos, status, pix_snapshot, pedido_em) VALUES (?, 'c', 5000, 'solicitado', '{}', ?) RETURNING id").get(a, pedido).id)
  globalThis.__db = db
  globalThis.__admin = ADMIN
  const lista = await (await get(alertas)).json()
  assert.equal(lista.ok, true)
  assert.deepEqual(lista.alertas.map((x) => x.chave), [`saque_atrasado:${s}`])
  assert.deepEqual(Object.keys(lista.alertas[0]).sort(), ['afiliado_id', 'chave', 'gravidade', 'link', 'texto', 'tipo'])
  assert.deepEqual(lista.por_gravidade, { alta: 0, media: 1, baixa: 0 })

  await nao(post(resolver, `saque_atrasado:${s}`, { origin: 'https://outro.com' })) // outra origem
  assert.equal((await get(alertas).then((r) => r.json())).total, 1)
  assert.equal((await post(resolver, 'ruim chave!')).status, 400)
  assert.equal((await post(resolver, 'saque_atrasado:999')).status, 404)

  const ok = await post(resolver, encodeURIComponent(`saque_atrasado:${s}`), { origin: HOST })
  assert.equal(ok.status, 200)
  assert.deepEqual(await ok.json(), { ok: true })
  assert.equal((await get(alertas).then((r) => r.json())).total, 0)
  assert.equal((await post(resolver, `saque_atrasado:${s}`)).status, 404) // já resolvido
  const reg = db.banco.prepare("SELECT * FROM registro WHERE acao = 'afiliados_alerta_resolvido'").all()
  assert.equal(reg.length, 1)
  assert.deepEqual([reg[0].quem, reg[0].alvo], ['master@t.com', `saque_atrasado:${s}`])
})

test('CSV com CPF e Pix não sai se o registro de quem exportou falhar', async () => {
  const db = novoDb()
  await montarCenario(db)
  db.banco.exec('DROP TABLE registro') // gravarRegistro passa a falhar
  globalThis.__db = db
  globalThis.__admin = ADMIN
  for (const tipo of ['saques_pagos', 'comissoes']) {
    const r = await get(csv, `${PER}&tipo=${tipo}`)
    assert.equal(r.status, 503)
    assert.match(r.headers.get('content-type'), /json/)
    assert.match((await r.json()).erro, /registrar a exportação/)
  }
})
