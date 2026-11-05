import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb, novoAfiliado, vendas } from './_base.mjs'
import { fecharMes } from '../../lib/afiliados/fechamento.js'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export async function cookies() { return { get() { return { value: "t" } } } }'),
  'next/navigation': modulo('export function notFound() { const e = new Error("404"); e.codigo = "NAO_ENCONTRADO"; throw e }'),
  '@/lib/d1': modulo('export const getDB = () => globalThis.__db'),
  '@/lib/gestao/sessao': modulo('export const adminPeloToken = async () => globalThis.__admin'),
  '@/lib/sessao': modulo('export const clienteAtual = async () => null'),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const R = {
  lista: await import('../../app/api/interno/gestao/afiliados/lista/route.js'),
  ficha: await import('../../app/api/interno/gestao/afiliados/ficha/route.js'),
  revelar: await import('../../app/api/interno/gestao/afiliados/ficha/revelar/route.js'),
  acao: await import('../../app/api/interno/gestao/afiliados/acao/route.js'),
  metas: await import('../../app/api/interno/gestao/afiliados/metas/route.js'),
  config: await import('../../app/api/interno/gestao/afiliados/config/route.js'),
  csv: await import('../../app/api/interno/gestao/afiliados/fechamento/csv/route.js'),
}

const HOST = 'https://trilhaviva.org'
const MASTER = { papel: 'master', precisa_trocar_senha: false, cliente: { id: 1, email: 'Master@T.com' } }
const MEMBRO = { papel: 'membro', precisa_trocar_senha: false, cliente: { id: 2, email: 'equipe@t.com' } }
Object.assign(process.env, { RESEND_API_KEY: 're_x', EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>' })

function montar(admin = MASTER) {
  const db = novoDb()
  globalThis.__db = db
  globalThis.__admin = admin
  const emails = []
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails')
    emails.push(JSON.parse(init.body))
    return { ok: true, status: 200, text: async () => '' }
  }
  return { db, emails }
}
const get = (rota, q = '') => rota.GET(new Request(`${HOST}/x${q}`))
const post = (rota, corpo, cab = {}) =>
  rota.POST(new Request(`${HOST}/x`, { method: 'POST', headers: { host: 'trilhaviva.org', origin: HOST, 'content-type': 'application/json', ...cab }, body: JSON.stringify(corpo) }))
const status404 = async (fn) => assert.rejects(fn, (e) => e.codigo === 'NAO_ENCONTRADO')
const reg = (db, acao) => db.banco.prepare('SELECT * FROM registro WHERE acao = ? ORDER BY id').all(acao)
const n = (db, sql, ...a) => Number(db.banco.prepare(sql).get(...a).n)

test('quem não é admin recebe 404 em todas as rotas de gestão de afiliados', async () => {
  montar(null)
  await status404(() => get(R.lista))
  await status404(() => get(R.ficha, '?id=1'))
  await status404(() => get(R.metas))
  await status404(() => get(R.config))
  await status404(() => get(R.csv, '?mes=2026-01'))
  for (const r of [R.revelar, R.acao, R.metas, R.config]) await status404(() => post(r, { id: 1 }))
  // membro que ainda precisa trocar a senha também não entra
  globalThis.__admin = { ...MEMBRO, precisa_trocar_senha: true }
  await status404(() => get(R.lista))
})

test('POST de outra origem recebe 404 e não muda nada', async () => {
  const { db } = montar()
  const af = novoAfiliado(db)
  const outra = { origin: 'https://evil.test' }
  await status404(() => post(R.acao, { id: af.id, acao: 'anotar', texto: 'x' }, outra))
  await status404(() => post(R.revelar, { id: af.id, campo: 'cpf' }, outra))
  await status404(() => post(R.metas, { niveis: [{ nome: 'A', vendas_minimas: 1, valor_por_venda_centavos: 1000 }] }, outra))
  await status404(() => post(R.config, { carencia_dias: 1 }, outra))
  assert.equal(n(db, 'SELECT COUNT(*) n FROM registro'), 0)
  assert.equal(n(db, 'SELECT COUNT(*) n FROM afiliados_anotacoes'), 0)
  assert.equal(n(db, 'SELECT carencia_dias n FROM afiliados_config'), 7)
})

test('lista: membro lê; filtros e ordem chegam do endereço', async () => {
  const { db } = montar(MEMBRO)
  const a = novoAfiliado(db)
  const b = novoAfiliado(db)
  await vendas(db, b, 2, new Date())
  const r = await get(R.lista, '?ordem=vendas&dir=desc&vendeu=sim')
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('cache-control'), 'no-store, max-age=0')
  const c = await r.json()
  assert.equal(c.ok, true)
  assert.deepEqual(c.itens.map((i) => i.id), [b.id])
  assert.equal(c.itens[0].vendas_mes, 2)
  assert.equal((await (await get(R.lista, `?q=${encodeURIComponent(c.itens[0].codigo.toLowerCase())}`)).json()).total, 1)
  assert.equal((await (await get(R.lista)).json()).total, 2)
  assert.ok(a.id)
})

test('ficha: dados mascarados, id inválido ou inexistente dá 404', async () => {
  const { db } = montar(MEMBRO)
  const af = novoAfiliado(db)
  db.banco.prepare("UPDATE afiliados SET cpf = '12345678909' WHERE id = ?").run(af.id)
  const r = await get(R.ficha, `?id=${af.id}`)
  assert.equal(r.status, 200)
  const c = await r.json()
  assert.equal(c.afiliado.cpf, '***.456.789-**')
  assert.ok(!JSON.stringify(c).includes('12345678909'))
  assert.equal((await get(R.ficha, '?id=999')).status, 404)
  assert.equal((await get(R.ficha, '?id=abc')).status, 404)
  assert.equal((await get(R.ficha)).status, 404)
})

test('revelar: membro recebe 403 e nada é gravado', async () => {
  const { db } = montar(MEMBRO)
  const af = novoAfiliado(db)
  for (const campo of ['cpf', 'pix']) {
    const r = await post(R.revelar, { id: af.id, campo })
    assert.equal(r.status, 403)
    assert.deepEqual(await r.json(), { ok: false, erro: 'Só o Administrador Master pode fazer esta ação.' })
  }
  assert.equal(reg(db, 'afiliado_dado_revelado').length, 0)
})

test('revelar: devolve o dado inteiro e grava quem revelou; sem registro não revela', async () => {
  const { db } = montar(MASTER)
  const af = novoAfiliado(db)
  db.banco.prepare("UPDATE afiliados SET cpf = '12345678909' WHERE id = ?").run(af.id)
  const codigo = db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  let r = await post(R.revelar, { id: af.id, campo: 'cpf' })
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { ok: true, campo: 'cpf', cpf: '123.456.789-09' })
  r = await post(R.revelar, { id: af.id, campo: 'pix' })
  const pix = (await r.json()).pix
  assert.equal(pix.chave, '00000000000')
  const linhas = reg(db, 'afiliado_dado_revelado')
  assert.equal(linhas.length, 2)
  assert.deepEqual([linhas[0].quem, linhas[0].alvo, linhas[0].detalhe], ['master@t.com', codigo, '{"campo":"cpf"}'])
  assert.equal(linhas[1].detalhe, '{"campo":"pix"}')
  assert.equal((await post(R.revelar, { id: af.id, campo: 'senha' })).status, 400)
  assert.equal((await post(R.revelar, { id: 999, campo: 'cpf' })).status, 404)
  assert.equal((await post(R.revelar, { campo: 'cpf' })).status, 404)
  const semPix = novoAfiliado(db, { pix: false })
  assert.equal((await post(R.revelar, { id: semPix.id, campo: 'pix' })).status, 404)
  assert.equal(reg(db, 'afiliado_dado_revelado').length, 2) // pedidos recusados não gravam

  // registro indisponível: o dado não sai
  db.banco.exec('ALTER TABLE registro RENAME TO registro_x')
  const falhou = await post(R.revelar, { id: af.id, campo: 'cpf' })
  assert.equal(falhou.status, 503)
  assert.ok(!JSON.stringify(await falhou.json()).includes('123.456'))
})

test('ações pela rota: cada uma grava o registro; aprovar manda o e-mail', async () => {
  const { db, emails } = montar()
  const af = novoAfiliado(db, { status: 'pendente' })
  const codigo = () => db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo
  const velho = codigo()

  let r = await post(R.acao, { id: af.id, acao: 'aprovar' })
  let c = await r.json()
  assert.deepEqual([r.status, c.ok, c.afiliado.status, c.email_enviado], [200, true, 'ativo', true])
  assert.equal(emails.length, 1)
  assert.match(emails[0].subject, /cadastro de afiliado foi aprovado/)
  assert.ok(emails[0].html.includes(velho))
  assert.equal(emails[0].bcc, undefined)
  assert.equal((await post(R.acao, { id: af.id, acao: 'aprovar' })).status, 409)
  assert.equal(emails.length, 1)

  assert.equal((await post(R.acao, { id: af.id, acao: 'suspender', motivo: 'Fraude' })).status, 200)
  assert.equal((await post(R.acao, { id: af.id, acao: 'reativar' })).status, 200)
  assert.equal((await post(R.acao, { id: af.id, acao: 'travar_nivel', nivel_id: 2 })).status, 200)
  assert.equal((await post(R.acao, { id: af.id, acao: 'ajuste', valor_centavos: 2500, motivo: 'Campanha' })).status, 200)
  assert.equal((await post(R.acao, { id: af.id, acao: 'anotar', texto: 'Contato por WhatsApp' })).status, 200)
  r = await post(R.acao, { id: af.id, acao: 'trocar_codigo', codigo: 'NOVOCOD1' })
  c = await r.json()
  assert.equal(c.link_novo, 'https://trilhaviva.org/?ref=NOVOCOD1')
  assert.match(c.aviso, new RegExp(velho))

  for (const a of ['afiliado_aprovado', 'afiliado_suspenso', 'afiliado_reativado', 'afiliado_nivel_travado', 'afiliado_ajuste', 'afiliado_anotacao', 'afiliado_codigo_trocado']) {
    assert.equal(reg(db, a).length, 1, a)
    assert.equal(reg(db, a)[0].quem, 'master@t.com')
  }
  assert.equal(reg(db, 'afiliado_codigo_trocado')[0].alvo, 'NOVOCOD1')
  assert.equal(reg(db, 'afiliado_anotacao')[0].detalhe.includes('WhatsApp'), false)
  // erros não gravam registro
  assert.equal((await post(R.acao, { id: af.id, acao: 'ajuste', valor_centavos: 0, motivo: 'x' })).status, 400)
  assert.equal((await post(R.acao, { id: 999, acao: 'anotar', texto: 'x' })).status, 404)
  assert.equal((await post(R.acao, { acao: 'anotar', texto: 'x' })).status, 404)
  assert.equal((await post(R.acao, { id: af.id, acao: 'explodir' })).status, 400)
  assert.equal(reg(db, 'afiliado_ajuste').length, 1)
})

test('ações pela rota: membro faz aprovar e anotar; o resto é 403 e não grava nada', async () => {
  const { db, emails } = montar(MEMBRO)
  const af = novoAfiliado(db)
  const pend = novoAfiliado(db, { status: 'pendente' })
  for (const corpo of [
    { acao: 'suspender', motivo: 'Teste' }, { acao: 'reativar' }, { acao: 'travar_nivel', nivel_id: 2 },
    { acao: 'trocar_codigo', codigo: 'OUTROCOD' }, { acao: 'ajuste', valor_centavos: 100, motivo: 'Teste' },
  ]) {
    const r = await post(R.acao, { id: af.id, ...corpo })
    assert.equal(r.status, 403, corpo.acao)
    assert.match((await r.json()).erro, /Administrador Master/)
  }
  assert.equal(n(db, 'SELECT COUNT(*) n FROM registro'), 0)
  assert.equal(db.banco.prepare('SELECT status FROM afiliados WHERE id = ?').get(af.id).status, 'ativo')
  assert.equal((await post(R.acao, { id: pend.id, acao: 'aprovar' })).status, 200)
  assert.equal(emails.length, 1)
  assert.equal((await post(R.acao, { id: af.id, acao: 'anotar', texto: 'ok' })).status, 200)
  assert.equal(reg(db, 'afiliado_anotacao')[0].quem, 'equipe@t.com')
})

test('metas: master grava valendo no mês seguinte; membro lê mas não grava; entrada inválida é 400', async () => {
  const { db } = montar(MEMBRO)
  const antes = await (await get(R.metas)).json()
  assert.equal(antes.ok, true)
  assert.equal(antes.vigente.niveis.length, 3)
  assert.deepEqual(antes.proximas, [])
  assert.equal(antes.fechamentos.length, 6)
  assert.ok(antes.projecao.explicacao.length > 20)
  const novos = [
    { nome: 'Base', vendas_minimas: 1, valor_por_venda_centavos: 1600, cor: '#b45309' },
    { nome: 'Topo', vendas_minimas: 30, valor_por_venda_centavos: 2600 },
  ]
  await status404(() => post(R.metas, { niveis: novos }))

  globalThis.__admin = MASTER
  const invalido = await post(R.metas, { niveis: [novos[1], novos[0]] })
  assert.equal(invalido.status, 400)
  assert.equal((await post(R.metas, {})).status, 400)
  assert.equal(n(db, "SELECT COUNT(*) n FROM afiliados_niveis WHERE valido_desde_mes > '2026-01'"), 0)

  const r = await post(R.metas, { niveis: novos })
  const c = await r.json()
  assert.equal(r.status, 200)
  assert.match(c.valido_desde_mes, /^\d{4}-\d{2}$/)
  assert.match(c.aviso, /mês seguinte/)
  const depois = await (await get(R.metas)).json()
  assert.equal(depois.vigente.niveis.length, 3) // o mês corrente não mudou
  assert.equal(depois.proximas[0].valido_desde_mes, c.valido_desde_mes)
  assert.deepEqual(depois.proximas[0].niveis.map((x) => x.nome), ['Base', 'Topo'])
  assert.equal(depois.proximas[0].criado_por, 'master@t.com')
  const linhas = reg(db, 'afiliados_metas')
  assert.equal(linhas.length, 1)
  assert.equal(linhas[0].alvo, c.valido_desde_mes)
})

test('config: membro lê; master grava, registra e recebe o aviso; valor fora do limite é 400', async () => {
  const { db } = montar(MEMBRO)
  const lida = await (await get(R.config)).json()
  assert.deepEqual([lida.ok, lida.carencia_dias, lida.aprovacao_automatica, lida.aviso], [true, 7, true, 'Mudanças não alteram meses já fechados.'])
  await status404(() => post(R.config, { carencia_dias: 3 }))
  assert.equal(n(db, 'SELECT carencia_dias n FROM afiliados_config'), 7)

  globalThis.__admin = MASTER
  const r = await post(R.config, { carencia_dias: 3, aprovacao_automatica: false })
  const c = await r.json()
  assert.equal(r.status, 200)
  assert.deepEqual([c.alterado, c.carencia_dias, c.aprovacao_automatica, c.atualizado_por], [true, 3, false, 'master@t.com'])
  assert.equal(c.aviso, 'Mudanças não alteram meses já fechados.')
  assert.equal(reg(db, 'afiliados_config').length, 1)
  const repetido = await (await post(R.config, { carencia_dias: 3 })).json()
  assert.equal(repetido.alterado, false)
  assert.equal(reg(db, 'afiliados_config').length, 1)
  const ruim = await post(R.config, { dia_fechamento: 30 })
  assert.deepEqual([ruim.status, (await ruim.json()).campo], [400, 'dia_fechamento'])
})

test('CSV do fechamento: baixa, registra a exportação e recusa mês inválido', async () => {
  const { db } = montar(MEMBRO)
  const x = novoAfiliado(db)
  await vendas(db, x, 20, new Date('2026-01-10T15:00:00Z'))
  await fecharMes(db, '2026-01', new Date('2026-02-09T12:00:00Z'))
  assert.equal((await get(R.csv, '?mes=2026-13')).status, 400)
  assert.equal((await get(R.csv)).status, 400)
  assert.equal(reg(db, 'afiliados_exportar').length, 0)
  const r = await get(R.csv, '?mes=2026-01')
  assert.equal(r.status, 200)
  assert.match(r.headers.get('content-type'), /^text\/csv/)
  assert.match(r.headers.get('content-disposition'), /afiliados-fechamento-2026-01\.csv/)
  assert.equal(r.headers.get('cache-control'), 'no-store, max-age=0')
  const texto = await r.text()
  assert.equal(texto.trim().split('\r\n').length, 2)
  assert.match(texto, /;20;0;Prata;300,00;100,00;400,00;/)
  const linhas = reg(db, 'afiliados_exportar')
  assert.deepEqual([linhas.length, linhas[0].quem, linhas[0].alvo], [1, 'equipe@t.com', '2026-01'])
})

test('toda ação gravada pela Gestão de afiliados tem tradução legível no Registro', async () => {
  const { readFileSync } = await import('node:fs')
  const { runInNewContext } = await import('node:vm')
  const fonte = readFileSync('components/gestao/Registro.jsx', 'utf8').replace(/\r\n/g, '\n')
  const acoes = runInNewContext('(' + fonte.match(/export const ACOES = (\{[\s\S]*?\n\})/)[1] + ')')
  for (const a of [
    'afiliado_aprovado', 'afiliado_suspenso', 'afiliado_reativado', 'afiliado_nivel_travado', 'afiliado_codigo_trocado',
    'afiliado_ajuste', 'afiliado_anotacao', 'afiliado_dado_revelado', 'afiliados_metas', 'afiliados_config', 'afiliados_exportar',
  ]) {
    assert.equal(typeof acoes[a], 'string', a)
    assert.ok(!acoes[a].includes('_'), a)
    assert.ok(fonte.includes(`'${a}'`), `${a} fora do filtro por tipo`)
  }
  assert.equal(acoes.afiliados_exportar, 'Exportou relatório de afiliados')
})
