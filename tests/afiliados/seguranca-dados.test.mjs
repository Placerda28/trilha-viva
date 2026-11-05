// Fase 11 (segurança), parte 2: comprovantes privados, dados pessoais e consultas ao D1 por requisição.
import test from 'node:test'
import assert from 'node:assert/strict'
import { cenario, entrarComo, sair, redeFalsa, req, ctx, HOST, MASTER_EMAIL, criarCliente, CPF, PIX, COMPRADOR, novoDb } from './_seg.mjs'
import { montarCenario } from './_cenario.mjs'
import { dadosDoPainel } from '../../lib/afiliados/painel.js'
import { marcarPago } from '../../lib/afiliados/saques-gestao.js'
import { consultarAvisos } from '../../lib/gestao/avisos.js'

const AFIL = (nome) => import(`../../app/api/afiliados/${nome}/route.js`)
const GEST = (nome) => import(`../../app/api/interno/gestao/afiliados/${nome}/route.js`)
const meu = await AFIL('saques/[id]/comprovante')
const gMeu = await GEST('saques/[id]/comprovante')
const pagar = await GEST('saques/[id]/pagar')
const clique = await AFIL('clique')
const cadastro = await AFIL('cadastro')
const pixRota = await AFIL('pix')
const revelar = await GEST('ficha/revelar')
const ficha = await GEST('ficha')

const UUID = '0b8e7f3a-1c2d-4e5f-8a9b-0c1d2e3f4a5b'

test('comprovante: link do B2 curto (300 s), preso ao arquivo exato, 302 com no-referrer e no-store', async () => {
  const c = await cenario()
  const rede = redeFalsa()
  entrarComo(c.db, c.A.email)
  const res = await meu.GET(req(), ctx(c.A.saqueId))
  assert.equal(res.status, 302)
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer')
  assert.match(res.headers.get('cache-control'), /no-store/)
  assert.equal(res.headers.get('x-robots-tag'), 'noindex')
  assert.match(res.headers.get('location'), /^https:\/\/dl\.b2\.test\/file\/.*afiliados-comprovantes\/.*Authorization=DL/)
  assert.deepEqual(rede.autorizacoes.map((a) => [a.fileNamePrefix, a.validDurationInSeconds]), [[c.A.caminho, 300]])
  entrarComo(c.db, MASTER_EMAIL)
  const g = await gMeu.GET(req(), ctx(c.B.saqueId))
  assert.equal(g.status, 302)
  assert.equal(g.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(rede.autorizacoes[1].validDurationInSeconds, 300)
})

test('comprovante: caminho gravado fora do prefixo/formato nunca vira link (afiliado, Gestão e pagar)', async () => {
  const c = await cenario()
  const rede = redeFalsa()
  const ruins = (id, outro) => [
    '../acervo/x.zip', 'acervo/Artista - Musica.zip', `afiliados-comprovantes/../acervo/x.zip`, `afiliados-comprovantes/${id}-x.pdf`,
    `afiliados-comprovantes/${outro}-${UUID}.pdf`, // arquivo de OUTRO saque
    `afiliados-comprovantes/${id}-${UUID}.pdf/../../x`, `afiliados-comprovantes/${id}-${UUID}.exe`, `/afiliados-comprovantes/${id}-${UUID}.pdf`,
  ]
  for (const ruim of ruins(c.A.saqueId, c.B.saqueId)) {
    c.db.banco.prepare('UPDATE afiliados_saques SET comprovante_caminho = ? WHERE id = ?').run(ruim, c.A.saqueId)
    entrarComo(c.db, c.A.email)
    assert.equal((await meu.GET(req(), ctx(c.A.saqueId))).status, 404, `afiliado: ${ruim}`)
    entrarComo(c.db, MASTER_EMAIL)
    assert.equal((await gMeu.GET(req(), ctx(c.A.saqueId))).status, 404, `gestão: ${ruim}`)
  }
  assert.equal(rede.autorizacoes.length, 0)
  // Pagar um saque aberto cujo comprovante gravado está ruim: recusa e não paga.
  c.db.banco.prepare("INSERT INTO afiliados_saques (afiliado_id, chave, valor_centavos, status, pix_snapshot, pedido_em, comprovante_caminho) VALUES (?, 'k9', 3000, 'solicitado', '{}', datetime('now'), '../acervo/x.zip')").run(c.A.id)
  const id = Number(c.db.banco.prepare("SELECT id FROM afiliados_saques WHERE chave = 'k9'").get().id)
  const r = await marcarPago(c.db, { saqueId: id, quem: MASTER_EMAIL })
  assert.equal(r.ok, false)
  assert.equal(r.semComprovante, true)
  const res = await pagar.POST(req('POST'), ctx(id))
  assert.equal(res.status, 400)
  assert.equal(c.db.banco.prepare('SELECT status FROM afiliados_saques WHERE id = ?').get(id).status, 'solicitado')
  assert.equal(rede.emails.length, 0)
})

test('CPF e Pix ficam mascarados para o afiliado e na ficha da Gestão; só "revelar" mostra inteiro e grava quem pediu', async () => {
  const c = await cenario()
  redeFalsa()
  entrarComo(c.db, c.A.email)
  const textos = []
  for (const nome of ['vendas', 'ganhos', 'saques', 'pix']) textos.push(JSON.stringify(await (await (await AFIL(nome)).GET(req())).json()))
  textos.push(JSON.stringify(await dadosDoPainel(c.db, c.A.id, new Date('2026-12-30T15:00:00Z'))))
  const pix = JSON.parse(textos[3])
  assert.match(pix.pix.chave_mascarada, /\*/)
  assert.match(pix.pix.titular_cpf_mascarado, /\*/)
  for (const t of textos) {
    for (const segredo of [CPF.A, PIX.A, '529.982.247-25', COMPRADOR]) assert.equal(t.includes(segredo), false, `vazou ${segredo}`)
  }
  assert.match(textos[0], /co\*\*\*@exemplo\.com/) // e-mail do comprador sempre mascarado
  entrarComo(c.db, MASTER_EMAIL)
  const f = JSON.stringify(await (await ficha.GET(req('GET', { url: `${HOST}/x?id=${c.A.id}` }))).json())
  for (const segredo of [CPF.A, PIX.A, '529.982.247-25']) assert.equal(f.includes(segredo), false, `ficha vazou ${segredo}`)
  const r = await (await revelar.POST(req('POST', { corpo: { id: c.A.id, campo: 'pix' } }))).json()
  assert.equal(r.pix.chave, PIX.A)
  const log = c.db.banco.prepare("SELECT quem, alvo, detalhe FROM registro WHERE acao = 'afiliado_dado_revelado'").all()
  assert.deepEqual(log.map((l) => [l.quem, l.alvo, JSON.parse(l.detalhe)]), [[MASTER_EMAIL, c.A.codigo, { campo: 'pix' }]])
})

test('o registro (auditoria) nunca guarda CPF nem chave Pix em claro, depois de cadastro, Pix, saque, revelar e ajuste', async () => {
  const c = await cenario()
  redeFalsa()
  const NOVO_CPF = '39053344705'
  const novo = criarCliente(c.db, 'novo@exemplo.com')
  entrarComo(c.db, 'novo@exemplo.com')
  const cad = await cadastro.POST(req('POST', { corpo: { nome: 'Novo Afiliado', cpf: '390.533.447-05', telefone: '27988887777', aceite: true, codigo: 'NOVOCOD1' } }))
  assert.equal(cad.status, 200)
  const p = await pixRota.POST(req('POST', { corpo: { tipo_chave: 'email', chave: 'pix.novo@exemplo.com', titular_nome: 'Novo Afiliado', titular_cpf: NOVO_CPF, senha: 'senha-certa' } }))
  assert.equal(p.status, 200)
  entrarComo(c.db, MASTER_EMAIL)
  await revelar.POST(req('POST', { corpo: { id: c.A.id, campo: 'cpf' } }))
  const acao = await GEST('acao')
  await acao.POST(req('POST', { corpo: { id: c.A.id, acao: 'ajuste', valor_centavos: 500, motivo: 'bônus de teste' } }))
  const tudo = JSON.stringify(c.db.banco.prepare('SELECT * FROM registro').all())
  assert.ok(c.db.banco.prepare('SELECT COUNT(*) AS n FROM registro').get().n >= 4)
  for (const segredo of [NOVO_CPF, '390.533.447-05', CPF.A, CPF.B, PIX.A, PIX.B, 'pix.novo@exemplo.com', String(novo) + 'x']) {
    assert.equal(tudo.includes(segredo), false, `registro guarda ${segredo}`)
  }
})

test('cliques: só o hash do visitante é gravado (nunca o IP); mesmo visitante em 24 h = 1 clique', async () => {
  const c = await cenario()
  sair()
  const IP = '203.0.113.77'
  const clicar = (ip, ua) => clique.POST(req('POST', { corpo: { codigo: c.A.codigo, caminho: '/musicas/x' }, cab: { 'cf-connecting-ip': ip, 'user-agent': ua } }))
  assert.equal((await clicar(IP, 'Mozilla/5.0 (iPhone)')).status, 204)
  assert.equal((await clicar(IP, 'Mozilla/5.0 (iPhone)')).status, 204)
  const linhas = c.db.banco.prepare('SELECT * FROM afiliados_cliques').all()
  assert.equal(linhas.length, 1)
  assert.match(linhas[0].visitante_hash, /^[0-9a-f]{64}$/)
  assert.equal(JSON.stringify(linhas).includes(IP), false)
  assert.equal(linhas[0].dispositivo, 'celular')
  // Código que não existe: 204 igual (não revela se o código existe).
  const res = await clique.POST(req('POST', { corpo: { codigo: 'NAOEXISTE' } }))
  assert.equal(res.status, 204)
})

test('LACUNA: quem troca o user-agent a cada pedido gera um clique novo por pedido (infla "cliques" e escreve no D1 sem limite)', async () => {
  const c = await cenario()
  sair()
  for (let i = 0; i < 30; i++) {
    await clique.POST(req('POST', { corpo: { codigo: c.A.codigo }, cab: { 'cf-connecting-ip': '198.51.100.9', 'user-agent': `bot-${i}` } }))
  }
  assert.equal(c.db.banco.prepare('SELECT COUNT(*) AS n FROM afiliados_cliques WHERE afiliado_id = ?').get(c.A.id).n, 30)
})

// ---------------------------------------------------------------- consultas ao D1 por requisição
const LIMITE_D1 = 50

test('consultas ao D1 por requisição: painel, ficha, dashboard, lista e demais telas ficam abaixo de 50', async (t) => {
  const db = novoDb()
  globalThis.__db = db
  redeFalsa()
  await montarCenario(db)
  const contar = async (nome, fn) => {
    const antes = db.consultas
    const res = await fn()
    const usadas = db.consultas - antes
    if (res && typeof res.status === 'number') assert.ok(res.status < 400, `${nome} respondeu ${res.status}`)
    return [nome, usadas]
  }
  const medidas = []
  const lista = (nome, q = '') => [`${HOST}/api/x${q}`, nome]
  entrarComo(db, 'afiliado1@t.com')
  const a1 = db.banco.prepare("SELECT id FROM afiliados WHERE codigo = 'COD1XXX'").get().id
  for (const nome of ['vendas', 'ganhos', 'saques', 'pix']) {
    const rota = await AFIL(nome)
    medidas.push(await contar(`/api/afiliados/${nome}`, () => rota.GET(req())))
  }
  medidas.push(await contar('painel (dadosDoPainel)', () => dadosDoPainel(db, Number(a1), new Date('2026-11-30T15:00:00Z'))))
  criarCliente(db, MASTER_EMAIL)
  entrarComo(db, MASTER_EMAIL)
  const per = '?de=2026-11-01&ate=2026-11-30'
  for (const [nome, q] of [['dashboard', per], ['financeiro', per], ['lista', ''], ['alertas', ''], ['metas', ''], ['saques', '?status=todos'], ['fechamento', '?mes=2026-11'], ['ficha', `?id=${a1}`]]) {
    const rota = await GEST(nome)
    medidas.push(await contar(`/gestao/afiliados/${nome}`, () => rota.GET(req('GET', { url: lista(nome, q)[0] }))))
  }
  medidas.push(await contar('contador do menu (consultarAvisos)', () => consultarAvisos(db, { agora: new Date('2026-11-30T15:00:00Z') })))
  t.diagnostic(medidas.map(([n, q]) => `${n}: ${q}`).join(' | '))
  for (const [nome, usadas] of medidas) assert.ok(usadas < LIMITE_D1, `${nome} usou ${usadas} consultas (limite ${LIMITE_D1})`)
})
