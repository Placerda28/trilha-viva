import test from 'node:test'
import assert from 'node:assert/strict'
import { pedirSaque } from '../../lib/afiliados/saque.js'
import { gravarComprovante, listarSaques, marcarPago, recusar } from '../../lib/afiliados/saques-gestao.js'
import { enviarParaB2, caminhoValido, tipoPelosBytes } from '../../lib/b2-envio.js'
import { montarSaquePago, montarSaqueRecusado } from '../../lib/emails-afiliado.js'
import { consultarAvisos } from '../../lib/gestao/avisos.js'
import { FECHA, contar, fechar, novoAfiliado, novoDb, vendas } from './_base.mjs'

const AGORA = new Date('2026-12-10T12:00:00Z')

async function saqueDe(db, af = novoAfiliado(db), n = 2) {
  await vendas(db, af, n)
  await fechar(db)
  const r = await pedirSaque(db, af.id, FECHA)
  assert.equal(r.ok, true)
  return { af, id: r.saqueId, valor: r.valor_centavos }
}
const caminho = (id) => `afiliados-comprovantes/${id}-0b8e7f3a-1c2d-4e5f-8a9b-0c1d2e3f4a5b.pdf`

test('listarSaques: fila com Pix inteiro, créditos, dias esperando e resumo', async () => {
  const db = novoDb()
  const { id, valor } = await saqueDe(db)
  const l = await listarSaques(db, { status: 'pendentes', pagina: 1 }, AGORA)
  assert.equal(l.total, 1)
  const s = l.itens[0]
  assert.equal(s.id, id)
  assert.equal(s.valor_centavos, valor)
  assert.equal(s.dias_esperando, 2)
  assert.equal(s.pix.chave, '00000000000') // chave inteira: a Gestão precisa copiar
  assert.equal(s.pix.tipo_chave, 'cpf')
  assert.equal(s.comprovante, false)
  assert.equal(s.creditos.length, 2)
  assert.equal(s.creditos_qtd, 2)
  assert.deepEqual(
    [l.resumo.pendentes_qtd, l.resumo.pendentes_valor_centavos, l.resumo.pagos_30d_qtd, l.resumo.recusados_30d_qtd],
    [1, valor, 0, 0],
  )
  assert.equal((await listarSaques(db, { status: 'pagos' }, AGORA)).itens.length, 0)
  assert.equal((await listarSaques(db, { status: 'invalido' }, AGORA)).itens.length, 1) // cai em pendentes
})

test('listarSaques: pagos, recusados, todos, tempo médio e paginação', async () => {
  const db = novoDb()
  const a = await saqueDe(db)
  const b = await saqueDe(db)
  const c = await saqueDe(db)
  // a pedido em 08/12 12:00 UTC (FECHA); pago 12 h depois
  await gravarComprovante(db, { saqueId: a.id, caminho: caminho(a.id) })
  await marcarPago(db, { saqueId: a.id, quem: 'a@t.com', agora: new Date('2026-12-09T00:00:00Z') })
  await recusar(db, { saqueId: b.id, motivo: 'Pix errado', quem: 'a@t.com', agora: AGORA })
  const todos = await listarSaques(db, { status: 'todos' }, AGORA)
  assert.equal(todos.total, 3)
  assert.equal(todos.itens[0].id, c.id) // pendente primeiro
  const pagos = await listarSaques(db, { status: 'pagos' }, AGORA)
  assert.deepEqual([pagos.itens.length, pagos.itens[0].comprovante, pagos.resumo.tempo_medio_horas], [1, true, 12])
  assert.equal(pagos.resumo.pagos_30d_valor_centavos, a.valor)
  const rec = await listarSaques(db, { status: 'recusados' }, AGORA)
  assert.deepEqual([rec.itens.length, rec.itens[0].nota, rec.resumo.recusados_30d_qtd], [1, 'Pix errado', 1])
  assert.equal((await listarSaques(db, { status: 'todos', pagina: 2 }, AGORA)).itens.length, 0)
})

test('marcarPago: exige comprovante, paga os lançamentos, grava aviso e repetir não faz nada', async () => {
  const db = novoDb()
  const { af, id, valor } = await saqueDe(db)
  let r = await marcarPago(db, { saqueId: id, quem: 'x@t.com', agora: AGORA })
  assert.deepEqual([r.ok, r.semComprovante], [false, true])
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_saques WHERE status = 'solicitado'"), 1)

  assert.equal(await gravarComprovante(db, { saqueId: id, caminho: caminho(id) }), true)
  r = await marcarPago(db, { saqueId: id, quem: 'Master@T.com', agora: AGORA })
  assert.equal(r.ok, true)
  const s = db.banco.prepare('SELECT * FROM afiliados_saques WHERE id = ?').get(id)
  assert.deepEqual([s.status, s.pago_em, s.pago_por, s.comprovante_caminho], ['pago', '2026-12-10 12:00:00', 'master@t.com', caminho(id)])
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE saque_id = ? AND status = 'paga'", id), 2)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE status = 'em_saque'"), 0)
  const av = db.banco.prepare('SELECT * FROM afiliados_avisos WHERE afiliado_id = ?').all(af.id)
  assert.equal(av.length, 1)
  assert.equal(av[0].titulo, `Seu saque de R$ ${(valor / 100).toFixed(2).replace('.', ',')} foi pago`)

  // repetir (mesmo comprovante ou outro, agora diferente): sem efeito
  r = await marcarPago(db, { saqueId: id, quem: 'outro@t.com', agora: new Date('2026-12-11T12:00:00Z') })
  assert.deepEqual([r.ok, r.jaTratado], [false, true])
  assert.equal(db.banco.prepare('SELECT pago_por FROM afiliados_saques WHERE id = ?').get(id).pago_por, 'master@t.com')
  assert.equal(contar(db, 'SELECT COUNT(*) n FROM afiliados_avisos WHERE afiliado_id = ?', af.id), 1)

  // pago não pode ser recusado depois
  r = await recusar(db, { saqueId: id, motivo: 'tarde demais', quem: 'x@t.com', agora: AGORA })
  assert.deepEqual([r.ok, r.jaTratado], [false, true])
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE status = 'paga'"), 2)
  assert.equal((await marcarPago(db, { saqueId: 999, quem: 'x', agora: AGORA })).naoEncontrado, true)
})

test('recusar: motivo obrigatório, valores voltam ao saldo, aviso e pedirSaque liberado de novo', async () => {
  const db = novoDb()
  const { af, id, valor } = await saqueDe(db)
  assert.equal((await recusar(db, { saqueId: id, motivo: '  ', quem: 'x@t.com', agora: AGORA })).ok, false)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_saques WHERE status = 'solicitado'"), 1)

  const r = await recusar(db, { saqueId: id, motivo: 'Chave Pix não confere com o CPF', quem: 'x@t.com', agora: AGORA })
  assert.equal(r.ok, true)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE status = 'pendente' AND saque_id IS NULL"), 2)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE status = 'em_saque'"), 0)
  const av = db.banco.prepare('SELECT * FROM afiliados_avisos WHERE afiliado_id = ?').all(af.id)
  assert.equal(av.length, 1)
  assert.match(av[0].texto, /Chave Pix não confere com o CPF.*voltaram ao seu saldo/)

  // repetir não duplica aviso
  assert.equal((await recusar(db, { saqueId: id, motivo: 'Chave Pix não confere com o CPF', quem: 'x@t.com', agora: AGORA })).jaTratado, true)
  assert.equal(contar(db, 'SELECT COUNT(*) n FROM afiliados_avisos WHERE afiliado_id = ?', af.id), 1)

  // recusado não conta no limite de 1 saque por mês: dá para pedir de novo no dia seguinte, com o mesmo valor
  const novo = await pedirSaque(db, af.id, new Date('2026-12-09T12:00:00Z'))
  assert.deepEqual([novo.ok, novo.valor_centavos], [true, valor])
})

test('tipoPelosBytes e caminhoValido', () => {
  assert.equal(tipoPelosBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])).ext, 'pdf')
  assert.equal(tipoPelosBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])).ext, 'jpg')
  assert.equal(tipoPelosBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])).ext, 'png')
  assert.equal(tipoPelosBytes(new TextEncoder().encode('<html><script>')), null)
  assert.equal(tipoPelosBytes(new Uint8Array([0x47, 0x49, 0x46, 0x38])), null)
  assert.equal(caminhoValido(7, caminho(7)), true)
  assert.equal(caminhoValido(8, caminho(7)), false) // caminho de outro saque
  assert.equal(caminhoValido(7, caminho(7).replace('afiliados-comprovantes', 'acervo')), false)
  assert.equal(caminhoValido(7, caminho(7) + '/../x'), false)
  assert.equal(caminhoValido(7, 'afiliados-comprovantes/7-x.exe'), false)
  assert.equal(caminhoValido(7, caminho(7).replace('.pdf', 'xpdf')), false) // o ponto é ponto mesmo
})

test('enviarParaB2: chave restrita, sem SHA-1 e corpo cru; sem chave não chama a rede', async () => {
  const env = { B2_COMPROVANTES_KEY_ID: 'kid', B2_COMPROVANTES_APP_KEY: 'kapp' }
  const chamadas = []
  const fetchImpl = async (url, init = {}) => {
    chamadas.push({ url, init })
    const ok = (corpo) => ({ ok: true, status: 200, json: async () => corpo, text: async () => '' })
    if (url.includes('b2_authorize_account')) {
      return ok({ authorizationToken: 'TA', apiInfo: { storageApi: { apiUrl: 'https://api.b2.test', bucketId: 'bkt' } } })
    }
    if (url.endsWith('/b2_get_upload_url')) return ok({ uploadUrl: 'https://up.b2.test/u', authorizationToken: 'TU' })
    return ok({})
  }
  const corpo = new Uint8Array([1, 2, 3]).buffer
  const r = await enviarParaB2({ caminho: 'afiliados-comprovantes/1-x.pdf', corpo, mime: 'application/pdf' }, { env, fetchImpl })
  assert.equal(r.ok, true)
  assert.equal(chamadas[0].init.headers.Authorization, 'Basic ' + btoa('kid:kapp'))
  assert.equal(JSON.parse(chamadas[1].init.body).bucketId, 'bkt')
  const up = chamadas[2]
  assert.equal(up.url, 'https://up.b2.test/u')
  assert.equal(up.init.headers['X-Bz-Content-Sha1'], 'do_not_verify')
  assert.equal(up.init.headers['X-Bz-File-Name'], 'afiliados-comprovantes/1-x.pdf')
  assert.equal(up.init.body, corpo) // sem conversão

  const sem = []
  const r2 = await enviarParaB2({ caminho: 'x', corpo, mime: 'x' }, { env: {}, fetchImpl: async (u) => sem.push(u) })
  assert.deepEqual([r2.ok, sem.length], [false, 0])
  const r3 = await enviarParaB2({ caminho: 'x', corpo, mime: 'x' }, { env, fetchImpl: async () => ({ ok: false, status: 401, json: async () => null, text: async () => '' }) })
  assert.equal(r3.ok, false)
})

test('e-mails de saque: anexo por URL e nome escapado', () => {
  const env = { EMAIL_FROM: 'a@trilhaviva.org', SITE_URL: 'https://trilhaviva.org' }
  const pago = montarSaquePago(
    { para: 'x@t.com', nome: '<b>Ana</b>', valor: 3000, pagoEm: '10/12/2026', comprovanteUrl: 'https://dl.b2.test/f?a=1', comprovanteNome: 'c.pdf' },
    env,
  )
  assert.deepEqual(pago.attachments, [{ filename: 'c.pdf', path: 'https://dl.b2.test/f?a=1' }])
  assert.match(pago.subject, /Seu saque de R\$ 30,00 foi pago/)
  assert.doesNotMatch(pago.html, /<b>Ana/)
  const rec = montarSaqueRecusado({ para: 'x@t.com', nome: 'Ana', valor: 3000, motivo: 'Pix <errado>' }, env)
  assert.match(rec.html, /Pix &lt;errado&gt;/)
  assert.match(rec.text, /voltaram ao seu saldo/)
  assert.equal(rec.attachments, undefined)
})

test('consultarAvisos conta saques pendentes', async () => {
  const db = novoDb()
  assert.equal((await consultarAvisos(db)).afiliados_saques_pendentes, 0)
  const { id } = await saqueDe(db)
  await saqueDe(db)
  assert.equal((await consultarAvisos(db, { master: true })).afiliados_saques_pendentes, 2)
  await recusar(db, { saqueId: id, motivo: 'teste', quem: 'x', agora: AGORA })
  assert.equal((await consultarAvisos(db)).afiliados_saques_pendentes, 1)
})

test('gravarComprovante só vale para saque solicitado', async () => {
  const db = novoDb()
  const { id } = await saqueDe(db)
  assert.equal(await gravarComprovante(db, { saqueId: id, caminho: caminho(id) }), true)
  await recusar(db, { saqueId: id, motivo: 'teste', quem: 'x', agora: AGORA })
  assert.equal(await gravarComprovante(db, { saqueId: id, caminho: 'afiliados-comprovantes/outro.pdf' }), false)
  assert.equal(db.banco.prepare('SELECT comprovante_caminho c FROM afiliados_saques WHERE id = ?').get(id).c, caminho(id))
})

test('concorrência: só um vence entre pagar, pagar, recusar e recusar', async () => {
  const db = novoDb()
  const a = await saqueDe(db)
  await gravarComprovante(db, { saqueId: a.id, caminho: caminho(a.id) })
  const p = await Promise.all([
    marcarPago(db, { saqueId: a.id, quem: 'um@t.com', agora: AGORA }),
    marcarPago(db, { saqueId: a.id, quem: 'dois@t.com', agora: AGORA }),
    recusar(db, { saqueId: a.id, motivo: 'tarde', quem: 'tres@t.com', agora: AGORA }),
  ])
  assert.equal(p.filter((r) => r.ok).length, 1)
  assert.equal(p.filter((r) => r.jaTratado).length, 2)
  const b = await saqueDe(db)
  const r = await Promise.all([
    recusar(db, { saqueId: b.id, motivo: 'mesmo motivo', quem: 'x@t.com', agora: AGORA }),
    recusar(db, { saqueId: b.id, motivo: 'mesmo motivo', quem: 'x@t.com', agora: AGORA }),
  ])
  assert.equal(r.filter((x) => x.ok).length, 1)
  assert.equal(contar(db, "SELECT COUNT(*) n FROM afiliados_avisos WHERE tipo = 'saque_recusado' AND afiliado_id = ?", b.af.id), 1)
})
