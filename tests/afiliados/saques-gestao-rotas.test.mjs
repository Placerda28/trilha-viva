import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb, novoAfiliado, vendas, FECHA, fechar } from './_base.mjs'
import { pedirSaque } from '../../lib/afiliados/saque.js'

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
const lista = await import('../../app/api/interno/gestao/afiliados/saques/route.js')
const upload = await import('../../app/api/interno/gestao/afiliados/saques/[id]/comprovante/route.js')
const pagar = await import('../../app/api/interno/gestao/afiliados/saques/[id]/pagar/route.js')
const recusar = await import('../../app/api/interno/gestao/afiliados/saques/[id]/recusar/route.js')
const meu = await import('../../app/api/afiliados/saques/[id]/comprovante/route.js')

const HOST = 'https://trilhaviva.org'
const ADMIN = { papel: 'master', precisa_trocar_senha: false, cliente: { id: 1, email: 'Master@T.com' } }
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 10])
Object.assign(process.env, {
  B2_KEY_ID: 'leitura', B2_APP_KEY: 'x', B2_COMPROVANTES_KEY_ID: 'escrita', B2_COMPROVANTES_APP_KEY: 'y',
  RESEND_API_KEY: 're_x', EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>',
})

// B2 e Resend falsos no fetch global (as rotas usam o fetch padrão).
function redeFalsa() {
  const r = { uploads: [], emails: [], resendFalha: false, uploadFalha: false }
  const ok = (corpo, status = 200) => ({ ok: status < 400, status, json: async () => corpo, text: async () => '' })
  globalThis.fetch = async (url, init = {}) => {
    if (url.includes('b2_authorize_account')) {
      return ok({ authorizationToken: 'TA', apiInfo: { storageApi: { apiUrl: 'https://api.b2.test', downloadUrl: 'https://dl.b2.test', bucketId: 'bkt' } } })
    }
    if (url.endsWith('/b2_get_upload_url')) return ok({ uploadUrl: 'https://up.b2.test/u', authorizationToken: 'TU' })
    if (url === 'https://up.b2.test/u') {
      if (r.uploadFalha) return ok({}, 500)
      r.uploads.push({ cab: init.headers, tamanho: init.body.byteLength })
      return ok({})
    }
    if (url.endsWith('/b2_get_download_authorization')) return ok({ authorizationToken: 'DL' })
    if (url === 'https://api.resend.com/emails') {
      if (r.resendFalha) return ok({}, 500)
      r.emails.push(JSON.parse(init.body))
      return ok({ id: 'e1' })
    }
    throw new Error('fetch inesperado ' + url)
  }
  return r
}

function montar() {
  const db = novoDb()
  globalThis.__db = db
  globalThis.__admin = ADMIN
  globalThis.__cliente = null
  return { db, rede: redeFalsa() }
}
async function comSaque(db) {
  const af = novoAfiliado(db)
  await vendas(db, af, 2)
  await fechar(db)
  const s = await pedirSaque(db, af.id, FECHA)
  return { af, id: s.saqueId, valor: s.valor_centavos }
}
const ctx = (id) => ({ params: Promise.resolve({ id: String(id) }) })
const cab = (extra = {}) => ({ host: 'trilhaviva.org', origin: HOST, ...extra })
// Serializa o multipart para mandar com Content-Length (como o navegador faz). `semTamanho` omite o cabeçalho.
const enviarArquivo = async (rota, id, bytes, nome = 'c.pdf', cabecalhos = {}, semTamanho = false) => {
  const f = new FormData()
  if (bytes) f.append('arquivo', new File([bytes], nome))
  const tmp = new Response(f)
  const tipo = tmp.headers.get('content-type')
  const corpo = await tmp.arrayBuffer()
  const h = cab({ 'content-type': tipo, ...(semTamanho ? {} : { 'content-length': String(corpo.byteLength) }), ...cabecalhos })
  return rota.POST(new Request(`${HOST}/x`, { method: 'POST', headers: h, body: corpo }), ctx(id))
}
const json = (rota, id, corpo, cabecalhos = {}) =>
  rota.POST(new Request(`${HOST}/x`, { method: 'POST', headers: cab({ 'content-type': 'application/json', ...cabecalhos }), body: JSON.stringify(corpo) }), ctx(id))
const status404 = async (fn) => {
  await assert.rejects(fn, (e) => e.codigo === 'NAO_ENCONTRADO')
}
const n = (db, sql, ...a) => Number(db.banco.prepare(sql).get(...a).n)

test('upload: PDF válido vai ao B2 com a chave de escrita e devolve o caminho', async () => {
  const { db, rede } = montar()
  const { id } = await comSaque(db)
  const res = await enviarArquivo(upload, id, PDF)
  assert.equal(res.status, 200)
  const c = await res.json()
  assert.equal(c.ok, true)
  assert.match(c.caminho, new RegExp(`^afiliados-comprovantes/${id}-[0-9a-f-]{36}\\.pdf$`))
  assert.equal(rede.uploads.length, 1)
  assert.equal(rede.uploads[0].cab['X-Bz-Content-Sha1'], 'do_not_verify')
  assert.equal(rede.uploads[0].cab['Content-Type'], 'application/pdf')
  assert.equal(n(db, "SELECT COUNT(*) n FROM registro WHERE acao = 'afiliado_comprovante' AND quem = 'master@t.com'"), 1)
})

test('upload: tipo errado pelos bytes, vazio, maior que 5 MB, saque já pago, não admin, outra origem, sem chave', async () => {
  const { db, rede } = montar()
  const { id } = await comSaque(db)
  // nome .pdf mas conteúdo HTML
  let res = await enviarArquivo(upload, id, new TextEncoder().encode('<html>oi</html>'), 'falso.pdf')
  assert.deepEqual([res.status, (await res.json()).erro], [400, 'Envie um PDF, JPG ou PNG.'])
  res = await enviarArquivo(upload, id, null)
  assert.equal(res.status, 400)
  const grande = new Uint8Array(5 * 1024 * 1024 + 1)
  grande.set(PDF)
  res = await enviarArquivo(upload, id, grande)
  assert.equal(res.status, 413)
  res = await enviarArquivo(upload, id, PDF, 'c.pdf', { 'content-length': String(6 * 1024 * 1024) })
  assert.equal(res.status, 413)
  assert.equal(rede.uploads.length, 0)

  res = await enviarArquivo(upload, 9999, PDF)
  assert.equal(res.status, 404)

  // outra origem e não admin: 404 do Next
  await status404(() => enviarArquivo(upload, id, PDF, 'c.pdf', { origin: 'https://evil.test' }))
  globalThis.__admin = null
  await status404(() => enviarArquivo(upload, id, PDF))
  globalThis.__admin = ADMIN

  // sem chave configurada: 503 e mensagem pedida
  const guarda = process.env.B2_COMPROVANTES_APP_KEY
  delete process.env.B2_COMPROVANTES_APP_KEY
  res = await enviarArquivo(upload, id, PDF)
  assert.deepEqual([res.status, (await res.json()).erro], [503, 'Armazenamento de comprovantes não configurado'])
  process.env.B2_COMPROVANTES_APP_KEY = guarda

  // B2 recusa: 502, nada gravado
  rede.uploadFalha = true
  assert.equal((await enviarArquivo(upload, id, PDF)).status, 502)
  rede.uploadFalha = false

  // saque já pago: 409
  db.banco.prepare("UPDATE afiliados_saques SET status = 'pago' WHERE id = ?").run(id)
  assert.equal((await enviarArquivo(upload, id, PDF)).status, 409)
})

test('pagar: sem comprovante, caminho de outro saque, ok com anexo por URL, repetir sem efeito', async () => {
  const { db, rede } = montar()
  const a = await comSaque(db)
  const b = await comSaque(db)
  const caminhoA = (await (await enviarArquivo(upload, a.id, PDF)).json()).caminho

  let res = await json(pagar, b.id, {}) // b nunca teve upload
  assert.equal(res.status, 400)
  res = await json(pagar, b.id, { caminho: caminhoA }) // comprovante do saque A no saque B
  assert.equal(res.status, 400)
  // caminho forjado com formato certo, sem upload: 400 (vale só o gravado no banco)
  res = await json(pagar, b.id, { caminho: `afiliados-comprovantes/${b.id}-0b8e7f3a-1c2d-4e5f-8a9b-0c1d2e3f4a5b.pdf` })
  assert.equal(res.status, 400)
  assert.equal(n(db, "SELECT COUNT(*) n FROM afiliados_saques WHERE status = 'pago'"), 0)
  await status404(() => json(pagar, a.id, { caminho: caminhoA }, { origin: 'https://evil.test' }))

  res = await json(pagar, a.id, { caminho: caminhoA })
  assert.deepEqual([res.status, (await res.json())], [200, { ok: true, email_enviado: true }])
  assert.equal(rede.emails.length, 1)
  const em = rede.emails[0]
  assert.match(em.to[0], /^a\d+@t\.com$/)
  assert.equal(em.attachments.length, 1)
  assert.equal(em.attachments[0].filename, `comprovante-saque-${a.id}.pdf`)
  assert.match(em.attachments[0].path, /^https:\/\/dl\.b2\.test\/file\/.+afiliados-comprovantes\/.+Authorization=DL/)
  assert.equal(em.attachments[0].content, undefined) // por URL, nunca base64
  assert.match(em.subject, /foi pago/)
  assert.equal(n(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE saque_id = ? AND status = 'paga'", a.id), 2)
  assert.equal(n(db, "SELECT COUNT(*) n FROM afiliados_avisos WHERE afiliado_id = ? AND tipo = 'saque_pago'", a.af.id), 1)
  assert.equal(n(db, "SELECT COUNT(*) n FROM registro WHERE acao = 'afiliado_saque_pago'"), 1)

  res = await json(pagar, a.id, { caminho: caminhoA })
  assert.equal(res.status, 409)
  assert.equal(rede.emails.length, 1) // sem segundo e-mail
  assert.equal(n(db, "SELECT COUNT(*) n FROM afiliados_avisos WHERE afiliado_id = ?", a.af.id), 1)
})

test('pagar: falha do e-mail não desfaz o pagamento', async () => {
  const { db, rede } = montar()
  const a = await comSaque(db)
  const caminho = (await (await enviarArquivo(upload, a.id, PDF)).json()).caminho
  rede.resendFalha = true
  const res = await json(pagar, a.id, { caminho })
  assert.deepEqual([res.status, (await res.json()).email_enviado], [200, false])
  assert.equal(db.banco.prepare('SELECT status FROM afiliados_saques WHERE id = ?').get(a.id).status, 'pago')
})

test('recusar: motivo obrigatório, e-mail com o motivo, valores voltam ao saldo', async () => {
  const { db, rede } = montar()
  const a = await comSaque(db)
  assert.equal((await json(recusar, a.id, { motivo: '' })).status, 400)
  await status404(() => json(recusar, a.id, { motivo: 'x y z' }, { origin: 'https://evil.test' }))
  const res = await json(recusar, a.id, { motivo: 'Chave Pix inválida' })
  assert.deepEqual([res.status, (await res.json()).email_enviado], [200, true])
  assert.match(rede.emails[0].html, /Chave Pix inválida/)
  assert.equal(rede.emails[0].attachments, undefined)
  assert.equal(n(db, "SELECT COUNT(*) n FROM afiliados_lancamentos WHERE status = 'pendente' AND saque_id IS NULL"), 2)
  assert.equal((await pedirSaque(db, a.af.id, new Date('2026-12-09T12:00:00Z'))).ok, true)
  assert.equal((await json(recusar, a.id, { motivo: 'Chave Pix inválida' })).status, 409)
  assert.equal(n(db, "SELECT COUNT(*) n FROM registro WHERE acao = 'afiliado_saque_recusado'"), 1)
})

test('lista da Gestão e comprovante: só admin; afiliado só baixa o próprio saque pago', async () => {
  const { db } = montar()
  const a = await comSaque(db)
  const b = await comSaque(db)
  const res = await lista.GET(new Request(`${HOST}/x?status=pendentes&pagina=1`))
  const c = await res.json()
  assert.deepEqual([res.status, c.ok, c.itens.length, c.resumo.pendentes_qtd], [200, true, 2, 2])
  assert.equal(res.headers.get('cache-control'), 'no-store, max-age=0')
  globalThis.__admin = null
  await status404(() => lista.GET(new Request(`${HOST}/x`)))
  await status404(() => upload.GET(new Request(`${HOST}/x`), ctx(a.id)))
  globalThis.__admin = ADMIN

  const caminhoA = (await (await enviarArquivo(upload, a.id, PDF)).json()).caminho
  assert.equal((await upload.GET(new Request(`${HOST}/x`), ctx(a.id))).status, 302) // gravado pelo upload
  await json(pagar, a.id, { caminho: caminhoA })

  const g = await upload.GET(new Request(`${HOST}/x`), ctx(a.id))
  assert.equal(g.status, 302)
  assert.match(g.headers.get('location'), /^https:\/\/dl\.b2\.test\/file\/.+Authorization=DL/)
  assert.equal(g.headers.get('cache-control'), 'no-store, max-age=0')

  const entrar = (af) => {
    const cli = db.banco.prepare('SELECT id, email FROM clientes WHERE id = ?').get(af.clienteId)
    globalThis.__cliente = { id: Number(cli.id), email: cli.email, nome: 'X', bloqueado: 0 }
  }
  entrar(a.af)
  const dono = await meu.GET(new Request(`${HOST}/x`), ctx(a.id))
  assert.equal(dono.status, 302)
  assert.equal(dono.headers.get('referrer-policy'), 'no-referrer')
  assert.equal((await meu.GET(new Request(`${HOST}/x`), ctx(b.id))).status, 404) // de outro afiliado
  entrar(b.af)
  assert.equal((await meu.GET(new Request(`${HOST}/x`), ctx(a.id))).status, 404) // não é o dono
  assert.equal((await meu.GET(new Request(`${HOST}/x`), ctx(b.id))).status, 404) // pendente, sem comprovante
  globalThis.__cliente = null
  assert.equal((await meu.GET(new Request(`${HOST}/x`), ctx(a.id))).status, 401)
})

test('upload: sem Content-Length dá 411 e não lê o corpo; grava o caminho no banco', async () => {
  const { db, rede } = montar()
  const { id } = await comSaque(db)
  const res = await enviarArquivo(upload, id, PDF, 'c.pdf', {}, true)
  assert.equal(res.status, 411)
  assert.equal(rede.uploads.length, 0)
  const ok = await (await enviarArquivo(upload, id, PDF)).json()
  assert.equal(db.banco.prepare('SELECT comprovante_caminho c FROM afiliados_saques WHERE id = ?').get(id).c, ok.caminho)
})

test('pagar ignora o caminho do cliente e usa o gravado', async () => {
  const { db } = montar()
  const a = await comSaque(db)
  const gravado = (await (await enviarArquivo(upload, a.id, PDF)).json()).caminho
  const res = await json(pagar, a.id, { caminho: `afiliados-comprovantes/${a.id}-ffffffff-1c2d-4e5f-8a9b-0c1d2e3f4a5b.pdf` })
  assert.equal(res.status, 200)
  assert.equal(db.banco.prepare('SELECT comprovante_caminho c FROM afiliados_saques WHERE id = ?').get(a.id).c, gravado)
})

test('pagar e recusar simultâneos: um só efeito, um só e-mail, Idempotency-Key', async () => {
  const { db, rede } = montar()
  const chaves = []
  const base = globalThis.fetch
  globalThis.fetch = async (url, init = {}) => {
    if (url === 'https://api.resend.com/emails') chaves.push(init.headers['Idempotency-Key'])
    return base(url, init)
  }
  const a = await comSaque(db)
  await enviarArquivo(upload, a.id, PDF)
  const rs = await Promise.all([json(pagar, a.id, {}), json(pagar, a.id, {}), json(recusar, a.id, { motivo: 'tarde demais' })])
  assert.deepEqual(rs.map((r) => r.status).sort(), [200, 409, 409])
  assert.equal(rede.emails.length, 1)
  assert.equal(n(db, "SELECT COUNT(*) n FROM registro WHERE acao IN ('afiliado_saque_pago', 'afiliado_saque_recusado')"), 1)
  assert.match(chaves[0], /^saque-(pago|recusado):\d+$/)
  globalThis.fetch = base
})

test('membro: vê a fila com a chave Pix mascarada, mas pagar, recusar e anexar comprovante dão 403 sem efeito', async () => {
  const { db } = montar()
  const a = await comSaque(db)
  const inteira = (await (await lista.GET(new Request(`${HOST}/x`))).json()).itens[0].pix.chave
  globalThis.__admin = { papel: 'membro', precisa_trocar_senha: false, cliente: { id: 2, email: 'equipe@t.com' } }
  const l = await lista.GET(new Request(`${HOST}/x`))
  const c = await l.json()
  assert.deepEqual([l.status, c.itens.length], [200, 1])
  assert.notEqual(c.itens[0].pix.chave, inteira)
  assert.ok(!JSON.stringify(c).includes(inteira))
  const msg = { ok: false, erro: 'Só o Administrador Master pode fazer esta ação.' }
  for (const [rota, nome] of [[pagar, 'pagar'], [recusar, 'recusar']]) {
    const r = await json(rota, a.id, { motivo: 'x' })
    assert.equal(r.status, 403, nome)
    assert.deepEqual(await r.json(), msg, nome)
  }
  const up = await enviarArquivo(upload, a.id, PDF)
  assert.equal(up.status, 403)
  assert.deepEqual(await up.json(), msg)
  assert.equal(n(db, "SELECT COUNT(*) AS n FROM afiliados_saques WHERE id = ? AND status = 'solicitado' AND comprovante_caminho IS NULL", a.id), 1)
})
