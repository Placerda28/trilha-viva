// Fase 11 (segurança), parte 1: quem pode usar cada rota nova. Sessão e permissão são as de verdade
// (cookie falso -> sessoes no D1 local -> adminPeloToken real); só o resto da rede é falso.
// Casos marcados LACUNA descrevem o que o código faz hoje e que o Paulo precisa decidir (ver tasks/afiliados-seguranca.md).
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { cenario, entrarComo, sair, redeFalsa, req, ctx, HOST, MASTER_EMAIL, MEMBRO_EMAIL, CPF, PIX } from './_seg.mjs'

const rotasEm = (raiz) => {
  const achar = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? achar(join(dir, e.name)) : e.name === 'route.js' ? [join(dir, e.name)] : [],
    )
  return achar(raiz).map((arq) => ({ nome: relative(raiz, arq).split(sep).slice(0, -1).join('/'), mod: import(pathToFileURL(arq).href) }))
}
const AFIL = await Promise.all(rotasEm('app/api/afiliados').map(async (r) => ({ ...r, mod: await r.mod })))
const GEST = await Promise.all(rotasEm('app/api/interno/gestao/afiliados').map(async (r) => ({ ...r, mod: await r.mod })))
const rota = (lista, nome) => lista.find((r) => r.nome === nome).mod
const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
const PUBLICAS = ['conta', 'clique'] // anônimas de propósito (cadastro de conta com Turnstile e clique do link)
// Recebe uma função: o 404 do Next sai como exceção, às vezes síncrona.
const nao = async (fn) => assert.rejects(async () => fn(), (e) => e.codigo === 'NAO_ENCONTRADO')
const semCache = (res) => assert.match(res.headers.get('cache-control') || '', /no-store/)

test('inventário: 12 rotas do afiliado e 17 da Gestão (se aparecer rota nova, este teste lembra de revisar a tabela)', () => {
  assert.equal(AFIL.length, 12)
  assert.equal(GEST.length, 17)
})

test('anônimo: toda rota logada do afiliado responde 401 sem dado e com no-store', async () => {
  await cenario()
  sair()
  for (const r of AFIL.filter((x) => !PUBLICAS.includes(x.nome))) {
    for (const m of METODOS.filter((x) => typeof r.mod[x] === 'function')) {
      const res = await r.mod[m](req(m, { corpo: m === 'POST' ? {} : undefined }), ctx(1))
      assert.equal(res.status, 401, `${m} ${r.nome}`)
      assert.deepEqual(await res.json(), { ok: false, erro: 'Entre na sua conta.' })
      semCache(res)
    }
  }
})

test('anônimo e afiliado comum: toda rota da Gestão devolve o 404 do Next (qualquer método)', async () => {
  const c = await cenario()
  for (const quem of ['anônimo', 'afiliado']) {
    if (quem === 'anônimo') sair()
    else entrarComo(c.db, c.A.email)
    for (const r of GEST) {
      for (const m of METODOS.filter((x) => typeof r.mod[x] === 'function')) {
        await nao(() => r.mod[m](req(m, { corpo: m === 'POST' ? {} : undefined }), ctx(c.A.saqueId)))
      }
    }
  }
})

test('A não lê, não saca, não troca Pix e não baixa comprovante de B (o id vem da sessão, nunca da requisição)', async () => {
  const c = await cenario()
  const rede = redeFalsa()
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-12-30T15:00:00Z') })
  try {
    entrarComo(c.db, c.A.email)
    const ler = async (nome, q = '') => {
      const res = await rota(AFIL, nome).GET(req('GET', { url: `${HOST}/api/afiliados/${nome}${q}` }))
      assert.equal(res.status, 200, nome)
      semCache(res)
      return res.json()
    }
    // Tentativa de enganar com ids de B na URL: a resposta é a mesma de quem não mandou nada.
    for (const nome of ['vendas', 'ganhos', 'saques', 'pix']) {
      const limpo = await ler(nome)
      const forjado = await ler(nome, `?afiliado_id=${c.B.id}&id=${c.B.id}&afiliado=${c.B.codigo}`)
      assert.deepEqual(forjado, limpo, nome)
      const texto = JSON.stringify(limpo)
      for (const dadoDeB of [c.B.codigo, CPF.B, PIX.B, 'Afiliado B', 'Titular B', c.B.caminho]) {
        assert.equal(texto.includes(dadoDeB), false, `${nome} vazou ${dadoDeB}`)
      }
    }
    // Comprovante de B: 404 sem link. O do próprio A: 302.
    for (const id of [c.B.saqueId, 'abc', '1e3', '-1']) {
      const res = await rota(AFIL, 'saques/[id]/comprovante').GET(req(), ctx(id))
      assert.equal(res.status, 404, `id ${id}`)
      assert.equal(res.headers.get('location'), null)
    }
    assert.equal((await rota(AFIL, 'saques/[id]/comprovante').GET(req(), ctx(c.A.saqueId))).status, 302)
    assert.equal(rede.autorizacoes.length, 1) // só o de A chegou a pedir link ao B2

    // Avisos de B: A manda o id e nada muda.
    const avisoB = c.db.banco.prepare("INSERT INTO afiliados_avisos (afiliado_id, tipo, titulo, texto) VALUES (?, 'x', 't', 'x') RETURNING id").get(c.B.id).id
    const avisoA = c.db.banco.prepare("INSERT INTO afiliados_avisos (afiliado_id, tipo, titulo, texto) VALUES (?, 'y', 't', 'x') RETURNING id").get(c.A.id).id
    const av = await rota(AFIL, 'avisos').POST(req('POST', { corpo: { ids: [Number(avisoB), Number(avisoA)], afiliado_id: c.B.id } }))
    assert.equal(av.status, 200)
    const lido = (id) => c.db.banco.prepare('SELECT lido_em FROM afiliados_avisos WHERE id = ?').get(id).lido_em
    assert.equal(lido(avisoB), null)
    assert.notEqual(lido(avisoA), null)

    // Preferências e Pix: o corpo pode trazer afiliado_id de B; só A muda.
    await rota(AFIL, 'preferencias').POST(req('POST', { corpo: { avisar_cada_venda: true, afiliado_id: c.B.id } }))
    const flag = (id) => c.db.banco.prepare('SELECT avisar_cada_venda AS f FROM afiliados WHERE id = ?').get(id).f
    assert.deepEqual([flag(c.A.id), flag(c.B.id)], [1, 0])
    const pix = await rota(AFIL, 'pix').POST(req('POST', {
      corpo: { afiliado_id: c.B.id, tipo_chave: 'email', chave: 'novo.a@exemplo.com', titular_nome: 'Titular A', titular_cpf: CPF.A, senha: 'senha-certa' },
    }))
    assert.equal(pix.status, 200)
    const chavePix = (id) => c.db.banco.prepare('SELECT chave FROM afiliados_pix WHERE afiliado_id = ?').get(id).chave
    assert.deepEqual([chavePix(c.A.id), chavePix(c.B.id)], ['novo.a@exemplo.com', PIX.B])
    // Pix de outro CPF (o de B) na conta de A: recusado.
    const roubo = await rota(AFIL, 'pix').POST(req('POST', {
      corpo: { tipo_chave: 'email', chave: 'ladrao@exemplo.com', titular_nome: 'Titular B', titular_cpf: CPF.B, senha: 'senha-certa' },
    }))
    assert.equal(roubo.status, 400)
    assert.equal(chavePix(c.A.id), 'novo.a@exemplo.com')

    // Saque: sai o saldo de A (2 vendas x R$ 15) e os lançamentos de B ficam como estavam.
    const pendentesB = () => c.db.banco.prepare("SELECT COUNT(*) AS n FROM afiliados_lancamentos WHERE afiliado_id = ? AND status = 'pendente'").get(c.B.id).n
    const antesB = pendentesB()
    const sq = await rota(AFIL, 'saque').POST(req('POST', { corpo: { afiliado_id: c.B.id } }))
    assert.equal(sq.status, 200)
    assert.equal((await sq.json()).valor_centavos, 3000)
    assert.equal(pendentesB(), antesB)
    assert.equal(c.db.banco.prepare('SELECT COUNT(*) AS n FROM afiliados_saques WHERE afiliado_id = ? AND status = ?').get(c.B.id, 'solicitado').n, 0)
  } finally {
    mock.timers.reset()
  }
})

test('membro: ações restritas ao master dão 403/404 e não mudam nada; aprovar e anotar ele pode', async () => {
  const c = await cenario()
  entrarComo(c.db, MEMBRO_EMAIL)
  const acao = (corpo) => rota(GEST, 'acao').POST(req('POST', { corpo: { id: c.A.id, ...corpo } }))
  const estado = () => c.db.banco.prepare('SELECT status, codigo, nivel_fixo_id FROM afiliados WHERE id = ?').get(c.A.id)
  const antes = { ...estado() }
  for (const corpo of [
    { acao: 'suspender', motivo: 'teste' }, { acao: 'reativar' }, { acao: 'travar_nivel', nivel_id: 1 },
    { acao: 'trocar_codigo', codigo: 'NOVOCOD1' }, { acao: 'ajuste', valor_centavos: 5000, motivo: 'presente' },
  ]) {
    const res = await acao(corpo)
    assert.equal(res.status, 403, corpo.acao)
    assert.match((await res.json()).erro, /Só o Administrador Master/)
  }
  assert.deepEqual({ ...estado() }, antes)
  assert.equal(c.db.banco.prepare("SELECT COUNT(*) AS n FROM afiliados_lancamentos WHERE tipo = 'ajuste'").get().n, 0)
  // Rotas inteiras de master: 404 do Next, sem gravar.
  await nao(() => rota(GEST, 'config').POST(req('POST', { corpo: { carencia_dias: 0 } })))
  await nao(() => rota(GEST, 'metas').POST(req('POST', { corpo: { niveis: [] } })))
  await nao(() => rota(GEST, 'fechamento').POST(req('POST', { corpo: { mes: '2026-11' } })))
  assert.equal(c.db.banco.prepare('SELECT carencia_dias AS d FROM afiliados_config').get().d, 7)
  assert.equal(c.db.banco.prepare('SELECT COUNT(*) AS n FROM afiliados_fechamentos').get().n, 0)
  // O que o membro pode:
  assert.equal((await acao({ acao: 'anotar', texto: 'ligou pedindo ajuda' })).status, 200)
  c.db.banco.prepare("UPDATE afiliados SET status = 'pendente' WHERE id = ?").run(c.A.id)
  assert.equal((await acao({ acao: 'aprovar' })).status, 200)
  assert.equal(estado().status, 'ativo')
  // Leitura da Gestão: o membro vê (e o afiliado A, que não é da equipe, já levou 404 no teste anterior).
  assert.equal((await rota(GEST, 'lista').GET(req())).status, 200)
})

test('LACUNA: o membro paga e recusa saque, anexa comprovante, revela CPF/Pix inteiros e exporta CSV com Pix (só "ações de dinheiro" do Master ficaram barradas)', async () => {
  const c = await cenario()
  redeFalsa()
  entrarComo(c.db, MEMBRO_EMAIL)
  // Saque aberto novo para A (o de antes já foi pago).
  c.db.banco.prepare("INSERT INTO afiliados_saques (afiliado_id, chave, valor_centavos, status, pix_snapshot, pedido_em) VALUES (?, 'k1', 3000, 'solicitado', '{}', datetime('now'))").run(c.A.id)
  const s = Number(c.db.banco.prepare("SELECT id FROM afiliados_saques WHERE chave = 'k1'").get().id)
  const rec = await rota(GEST, 'saques/[id]/recusar').POST(req('POST', { corpo: { motivo: 'Pix incorreto' } }), ctx(s))
  assert.equal(rec.status, 200)
  const rev = await rota(GEST, 'ficha/revelar').POST(req('POST', { corpo: { id: c.A.id, campo: 'cpf' } }))
  assert.equal((await rev.json()).cpf, '529.982.247-25')
  const pix = await (await rota(GEST, 'ficha/revelar').POST(req('POST', { corpo: { id: c.A.id, campo: 'pix' } }))).json()
  assert.equal(pix.pix.chave, PIX.A)
  const csv = await rota(GEST, 'financeiro/csv').GET(req('GET', { url: `${HOST}/x?tipo=saques_pagos&de=2026-11-01&ate=2026-11-30` }))
  const texto = await csv.text()
  assert.ok(texto.includes('529.982.247-25') && texto.includes(PIX.A))
  // Fica registrado quem fez (é a única proteção hoje):
  assert.equal(c.db.banco.prepare("SELECT COUNT(*) AS n FROM registro WHERE quem = ? AND acao IN ('afiliado_dado_revelado','afiliados_exportar','afiliado_saque_recusado')").get(MEMBRO_EMAIL).n, 4)
})

test('POST de outro site (Origin diferente): 403 nas rotas do afiliado e 404 na Gestão; sem Origin passa (LACUNA conhecida do mesmaOrigem)', async () => {
  const c = await cenario()
  entrarComo(c.db, c.A.email)
  const corpos = { avisos: { ids: [1] }, preferencias: { avisar_cada_venda: true }, saque: {}, pix: {}, cadastro: {} }
  for (const [nome, corpo] of Object.entries(corpos)) {
    const res = await rota(AFIL, nome).POST(req('POST', { corpo, origem: 'https://evil.test' }))
    assert.equal(res.status, 403, nome)
  }
  const sem = await rota(AFIL, 'preferencias').POST(req('POST', { corpo: { avisar_cada_venda: true }, origem: null }))
  assert.equal(sem.status, 200)
  // O hostname parecido também não passa (comparação exata do host):
  const parecido = await rota(AFIL, 'preferencias').POST(req('POST', { corpo: { avisar_cada_venda: true }, origem: 'https://trilhaviva.org.evil.test' }))
  assert.equal(parecido.status, 403)

  entrarComo(c.db, MASTER_EMAIL)
  const postsGestao = GEST.filter((r) => typeof r.mod.POST === 'function' && !/naoEncontrado/.test(String(r.mod.POST.name)))
  let verificadas = 0
  for (const r of postsGestao) {
    try {
      const res = await r.mod.POST(req('POST', { corpo: {}, origem: 'https://evil.test' }), ctx(c.A.saqueId))
      assert.fail(`${r.nome} aceitou a origem errada (${res.status})`)
    } catch (e) {
      if (e.codigo !== 'NAO_ENCONTRADO') throw e
      verificadas += 1
    }
  }
  assert.ok(verificadas >= 8, `só ${verificadas} POSTs da Gestão verificados`)
})

test('toda resposta de leitura (afiliado e Gestão) sai com no-store', async () => {
  const c = await cenario()
  redeFalsa()
  entrarComo(c.db, c.A.email)
  for (const nome of ['vendas', 'ganhos', 'saques', 'pix']) semCache(await rota(AFIL, nome).GET(req()))
  semCache(await rota(AFIL, 'codigo').GET(req('GET', { url: `${HOST}/x?c=ZZZZ99` })))
  semCache(await rota(AFIL, 'saques/[id]/comprovante').GET(req(), ctx(c.A.saqueId)))
  semCache(await rota(AFIL, 'saques/[id]/comprovante').GET(req(), ctx(c.B.saqueId)))
  entrarComo(c.db, MASTER_EMAIL)
  const per = `?de=2026-11-01&ate=2026-11-30`
  const urls = {
    alertas: '', config: '', dashboard: per, financeiro: per, lista: '', metas: '', saques: '?status=todos',
    ficha: `?id=${c.A.id}`, fechamento: '?mes=2026-11', 'fechamento/csv': '?mes=2026-11', 'financeiro/csv': `${per}&tipo=comissoes`,
  }
  for (const [nome, q] of Object.entries(urls)) {
    const res = await rota(GEST, nome).GET(req('GET', { url: `${HOST}/x${q}` }))
    assert.equal(res.status, 200, nome)
    semCache(res)
  }
  semCache(await rota(GEST, 'saques/[id]/comprovante').GET(req(), ctx(c.A.saqueId)))
})
