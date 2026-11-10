import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { D1Local, criarBanco } from '../gestao/_d1local.mjs'
import { atenderInstagram } from '../../workers/recuperacao-carrinho/instagram-webhook.js'
import worker from '../../workers/recuperacao-carrinho/index.js'

const CONTA = '17841400000000001'
const CLIENTE = '17841400000000999'
const SEGREDO = 'segredo-do-app'
const mudo = { log() {}, error() {} }

function montar(extra = {}) {
  const db = new D1Local(criarBanco())
  const chamadas = []
  const pendentes = []
  const env = { DB: db, IG_ACCOUNT_ID: CONTA, IG_VERIFY_TOKEN: 'token-ok', WA_APP_SECRET: SEGREDO, IG_TOKEN: 'tk', IG_GRAPH_VERSION: 'v26.0', ...extra }
  const gerarRascunho = async (_env, igsid) => { chamadas.push(igsid); return { status: 'pendente' } }
  const ctx = { waitUntil: (p) => pendentes.push(p) }
  const urls = []
  const fetchImpl = async (url) => {
    urls.push(String(url))
    return new Response(JSON.stringify({ name: 'Maria Silva', username: 'maria.s' }), { status: 200 })
  }
  const opcoes = { gerarRascunho, fetchImpl, logger: mudo }
  const enviar = async (corpo, { assinar = true, cabecalho } = {}) => {
    const cru = typeof corpo === 'string' ? corpo : JSON.stringify(corpo)
    const assinatura = cabecalho ?? (assinar ? 'sha256=' + createHmac('sha256', SEGREDO).update(cru).digest('hex') : undefined)
    const r = await atenderInstagram(
      new Request('https://x.workers.dev/instagram', { method: 'POST', body: cru, headers: assinatura ? { 'x-hub-signature-256': assinatura } : {} }),
      env, ctx, opcoes)
    await Promise.all(pendentes.splice(0))
    return r
  }
  const linhas = () => db.banco.prepare('SELECT * FROM instagram_mensagens ORDER BY id').all()
  return { db, env, ctx, opcoes, chamadas, urls, enviar, linhas }
}

// Formato do Instagram Messaging (entry[].messaging[]) da documentação da Meta.
const aviso = (item, entryId = CONTA) => ({ object: 'instagram', entry: [{ id: entryId, time: 1760000000000, messaging: [item] }] })
const entrada = (mid, message, de = CLIENTE) => aviso({ sender: { id: de }, recipient: { id: CONTA }, timestamp: 1760000000000, message: { mid, ...message } })
const eco = (mid, text = 'oi', timestamp = Date.now()) => aviso({ sender: { id: CONTA }, recipient: { id: CLIENTE }, timestamp, message: { mid, text, is_echo: true } })

const get = (env, qs) => atenderInstagram(new Request('https://x.workers.dev/instagram?' + qs), env, undefined, { logger: mudo })

test('GET: verificação certa devolve o desafio; token errado, modo errado e sem segredo = 404', async () => {
  const s = montar()
  const ok = await get(s.env, 'hub.mode=subscribe&hub.verify_token=token-ok&hub.challenge=12345')
  assert.equal(ok.status, 200)
  assert.equal(await ok.text(), '12345')
  assert.equal((await get(s.env, 'hub.mode=subscribe&hub.verify_token=errado&hub.challenge=1')).status, 404)
  assert.equal((await get(s.env, 'hub.mode=outro&hub.verify_token=token-ok&hub.challenge=1')).status, 404)
  assert.equal((await get({}, 'hub.mode=subscribe&hub.verify_token=&hub.challenge=1')).status, 404)
})

test('POST sem assinatura, com assinatura errada ou de outro corpo = 401 e nada é gravado', async () => {
  const s = montar()
  const corpo = entrada('m1', { text: 'oi' })
  assert.equal((await s.enviar(corpo, { assinar: false })).status, 401)
  assert.equal((await s.enviar(corpo, { cabecalho: 'sha256=' + '0'.repeat(64) })).status, 401)
  assert.equal((await s.enviar(corpo, { cabecalho: 'sha256=' + createHmac('sha256', 'outro').update(JSON.stringify(corpo)).digest('hex') })).status, 401)
  assert.equal(s.linhas().length, 0)
  assert.equal(s.chamadas.length, 0)
})

test('corpo de 300 KB sem content-length = 413 sem tocar no D1', async () => {
  const s = montar()
  const grande = JSON.stringify({ object: 'instagram', lixo: 'x'.repeat(300 * 1024) })
  const pedido = new Request('https://x.workers.dev/instagram', {
    method: 'POST', headers: { 'x-hub-signature-256': 'sha256=' + createHmac('sha256', SEGREDO).update(grande).digest('hex') },
    body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(grande)); c.close() } }), duplex: 'half',
  })
  assert.equal(pedido.headers.get('content-length'), null)
  assert.equal((await atenderInstagram(pedido, s.env, s.ctx, s.opcoes)).status, 413)
  assert.equal(s.db.consultas, 0)
})

test('IG_APP_SECRET tem prioridade; sem ele vale WA_APP_SECRET', async () => {
  const s = montar({ IG_APP_SECRET: 'outro-segredo' })
  const corpo = entrada('m1', { text: 'oi' })
  assert.equal((await s.enviar(corpo)).status, 401) // assinado com WA_APP_SECRET
  const cru = JSON.stringify(corpo)
  const ok = await s.enviar(cru, { cabecalho: 'sha256=' + createHmac('sha256', 'outro-segredo').update(cru).digest('hex') })
  assert.equal(ok.status, 200)
  assert.equal(s.linhas().length, 1)
  const t = montar() // só WA_APP_SECRET
  assert.equal((await t.enviar(entrada('m1', { text: 'oi' }))).status, 200)
})

test('corpo acima de 256 KB = 413 antes de qualquer gravação', async () => {
  const s = montar()
  const r = await s.enviar('x'.repeat(256 * 1024 + 1))
  assert.equal(r.status, 413)
  assert.equal(s.linhas().length, 0)
})

test('texto grava 1 linha de entrada e pede 1 rascunho; perfil buscado uma vez', async () => {
  const s = montar()
  assert.equal((await s.enviar(entrada('m1', { text: 'Oi, tem curso de teclado?' }))).status, 200)
  const l = s.linhas()
  assert.equal(l.length, 1)
  assert.equal(l[0].direcao, 'entrada')
  assert.equal(l[0].igsid, CLIENTE)
  assert.equal(l[0].texto, 'Oi, tem curso de teclado?')
  assert.equal(l[0].usuario, 'maria.s')
  assert.equal(l[0].nome_perfil, 'Maria Silva')
  assert.deepEqual(s.chamadas, [CLIENTE])
  assert.equal(s.urls.length, 1)
  assert.match(s.urls[0], /graph\.facebook\.com\/v26\.0\/17841400000000999\?fields=name,username/)
  // segunda mensagem da mesma pessoa: não busca o perfil de novo
  await s.enviar(entrada('m2', { text: 'e o preço?' }))
  assert.equal(s.urls.length, 1)
  assert.equal(s.chamadas.length, 2)
})

test('texto acentuado assinado sobre os bytes brutos (UTF-8) é aceito e gravado inteiro', async () => {
  const s = montar()
  const cru = JSON.stringify(entrada('m1', { text: 'ação, música é ótima 🎶' }))
  const assinatura = 'sha256=' + createHmac('sha256', SEGREDO).update(Buffer.from(cru, 'utf8')).digest('hex')
  assert.equal((await s.enviar(cru, { cabecalho: assinatura })).status, 200)
  assert.equal(s.linhas()[0].texto, 'ação, música é ótima 🎶')
})

test('o mesmo aviso duas vezes = 1 linha e 1 chamada de rascunho', async () => {
  const s = montar()
  await s.enviar(entrada('m1', { text: 'oi' }))
  await s.enviar(entrada('m1', { text: 'oi' }))
  assert.equal(s.linhas().length, 1)
  assert.equal(s.chamadas.length, 1)
})

test('falha ao buscar o perfil: grava mesmo assim e pede o rascunho', async () => {
  const s = montar()
  s.opcoes.fetchImpl = async () => { throw new Error('rede') }
  await s.enviar(entrada('m1', { text: 'oi' }))
  assert.equal(s.linhas().length, 1)
  assert.equal(s.linhas()[0].usuario, null)
  assert.equal(s.chamadas.length, 1)
})

test('rascunho que falha não derruba o aviso: ainda 200', async () => {
  const s = montar()
  s.opcoes.gerarRascunho = async () => { throw new Error('IA fora') }
  assert.equal((await s.enviar(entrada('m1', { text: 'oi' }))).status, 200)
  assert.equal(s.linhas().length, 1)
})

test('eco do app grava saída com enviado_por=app e marca o rascunho aberto como respondido_no_app', async () => {
  const s = montar()
  s.db.banco.prepare("INSERT INTO instagram_mensagens (ig_msg_id, igsid, direcao, texto) VALUES ('m1', ?, 'entrada', 'oi')").run(CLIENTE)
  s.db.banco.prepare("INSERT INTO instagram_rascunhos (igsid, ate_mensagem_id, texto, status) VALUES (?, 1, 'sugestão', 'pendente')").run(CLIENTE)
  assert.equal((await s.enviar(eco('e1', 'Oi! Temos sim.'))).status, 200)
  const saida = s.linhas().find((x) => x.ig_msg_id === 'e1')
  assert.equal(saida.direcao, 'saida')
  assert.equal(saida.enviado_por, 'app')
  assert.equal(saida.igsid, CLIENTE)
  const r = s.db.banco.prepare('SELECT status, decidido_por FROM instagram_rascunhos').get()
  assert.equal(r.status, 'respondido_no_app')
  assert.equal(s.chamadas.length, 0) // eco nunca pede rascunho
  assert.equal(s.urls.length, 0)
})

test('eco de mid que a Gestão já gravou NÃO marca o rascunho e não muda a linha', async () => {
  const s = montar()
  s.db.banco.prepare("INSERT INTO instagram_mensagens (ig_msg_id, igsid, direcao, texto, enviado_por) VALUES ('e1', ?, 'saida', 'texto da gestão', 'paulo@x.com')").run(CLIENTE)
  s.db.banco.prepare("INSERT INTO instagram_rascunhos (igsid, ate_mensagem_id, texto, status) VALUES (?, 1, 'sugestão', 'pendente')").run(CLIENTE)
  await s.enviar(eco('e1', 'texto da gestão'))
  assert.equal(s.db.banco.prepare('SELECT status FROM instagram_rascunhos').get().status, 'pendente')
  const l = s.linhas()
  assert.equal(l.length, 1)
  assert.equal(l[0].enviado_por, 'paulo@x.com')
})

test('eco repetido não marca de novo um rascunho gerado depois', async () => {
  const s = montar()
  await s.enviar(eco('e1'))
  s.db.banco.prepare("INSERT INTO instagram_rascunhos (igsid, ate_mensagem_id, texto, status) VALUES (?, 1, 'novo', 'pendente')").run(CLIENTE)
  await s.enviar(eco('e1'))
  assert.equal(s.db.banco.prepare('SELECT status FROM instagram_rascunhos').get().status, 'pendente')
})

test('eco atrasado (anterior a uma pergunta nova) não marca o rascunho novo', async () => {
  const s = montar()
  s.db.banco.prepare("INSERT INTO instagram_mensagens (ig_msg_id, igsid, direcao, texto) VALUES ('m2', ?, 'entrada', 'pergunta nova')").run(CLIENTE)
  s.db.banco.prepare("INSERT INTO instagram_rascunhos (igsid, ate_mensagem_id, texto, status) VALUES (?, 1, 'novo', 'pendente')").run(CLIENTE)
  await s.enviar(eco('e1', 'resposta da pergunta antiga', Date.now() - 120000))
  assert.equal(s.db.banco.prepare('SELECT status FROM instagram_rascunhos').get().status, 'pendente')
  const saida = s.linhas().find((x) => x.ig_msg_id === 'e1')
  assert.equal(saida.enviado_por, 'app') // a saída é gravada, com a hora do aviso
  assert.ok(saida.criado_em < s.linhas()[0].criado_em)
})

test('lote grande: grava até 30, responde 500, no máximo 3 rascunhos e nunca passa de 50 consultas', async () => {
  const s = montar()
  s.opcoes.gerarRascunho = async (env, igsid) => {
    s.chamadas.push(igsid)
    for (let i = 0; i < 10; i++) await env.DB.prepare('SELECT 1').all()
    return { status: 'pendente' }
  }
  const itens = Array.from({ length: 40 }, (_, i) => ({
    sender: { id: String(5000 + i) }, recipient: { id: CONTA }, timestamp: Date.now(), message: { mid: 'lote' + i, text: 'oi' },
  }))
  const r = await s.enviar({ object: 'instagram', entry: [{ id: CONTA, messaging: itens }] })
  assert.equal(r.status, 500) // nunca 200 descartando mensagem
  assert.equal(s.linhas().length, 30)
  assert.ok(s.chamadas.length >= 1 && s.chamadas.length <= 3)
  assert.ok(s.db.consultas <= 50, `gastou ${s.db.consultas}`)
  // reenvio de um lote que cabe: nada duplica
  const pequeno = { object: 'instagram', entry: [{ id: CONTA, messaging: itens.slice(0, 5) }] }
  assert.equal((await s.enviar(pequeno)).status, 200)
  assert.equal(s.linhas().length, 30)
})

test('aviso de outra conta é ignorado (entrada, eco e object diferente)', async () => {
  const s = montar()
  await s.enviar(aviso({ sender: { id: CLIENTE }, recipient: { id: '999' }, message: { mid: 'a', text: 'oi' } }))
  await s.enviar(aviso({ sender: { id: '999' }, recipient: { id: CLIENTE }, message: { mid: 'b', text: 'oi', is_echo: true } }))
  await s.enviar({ ...entrada('c', { text: 'oi' }), object: 'page' })
  assert.equal(s.linhas().length, 0)
  assert.equal(s.chamadas.length, 0)
})

test('sem IG_ACCOUNT_ID configurado o webhook ignora tudo (200, nada gravado)', async () => {
  const s = montar({ IG_ACCOUNT_ID: '' })
  assert.equal((await s.enviar(entrada('m1', { text: 'oi' }))).status, 200)
  assert.equal(s.linhas().length, 0)
})

test('resposta a story vira texto legível', async () => {
  const s = montar()
  await s.enviar(entrada('m1', { text: 'que música é essa?', reply_to: { story: { url: 'https://cdn.exemplo/story.jpg', id: '178' } } }))
  const l = s.linhas()[0]
  assert.equal(l.texto, '[respondeu ao seu story] que música é essa?')
  assert.equal(l.midia_tipo, 'story_reply')
})

test('anexos (foto, vídeo, áudio, post, Reel, menção de story) viram texto legível com tipo e URL', async () => {
  const s = montar()
  const casos = [
    ['image', '[enviou uma foto]'],
    ['video', '[enviou um vídeo]'],
    ['audio', '[enviou um áudio]'],
    ['share', '[compartilhou um post]'],
    ['ig_reel', '[compartilhou um Reel]'],
    ['reel', '[compartilhou um Reel]'],
    ['story_mention', '[mencionou você no story]'],
    ['file', '[enviou um arquivo]'],
    ['ephemeral', '[mídia temporária]'],
    ['coisa_nova', '[enviou um anexo]'],
  ]
  for (const [i, [tipo]] of casos.entries()) {
    await s.enviar(entrada('a' + i, { attachments: [{ type: tipo, payload: { url: 'https://cdn.exemplo/' + tipo } }] }))
  }
  const l = s.linhas()
  assert.equal(l.length, casos.length)
  casos.forEach(([tipo, rotulo], i) => {
    assert.equal(l[i].texto, rotulo)
    assert.equal(l[i].midia_tipo, tipo)
    assert.equal(l[i].midia_url, 'https://cdn.exemplo/' + tipo)
  })
})

test('URL de mídia que não é https não é guardada', async () => {
  const s = montar()
  await s.enviar(entrada('m1', { attachments: [{ type: 'image', payload: { url: 'javascript:alert(1)' } }] }))
  assert.equal(s.linhas()[0].midia_url, null)
})

test('mensagem sem texto nem anexo grava um aviso legível', async () => {
  const s = montar()
  await s.enviar(entrada('m1', {}))
  assert.equal(s.linhas()[0].texto, '[mensagem sem texto]')
})

test('read, reaction, message_edit e mensagem apagada não quebram nem gravam', async () => {
  const s = montar()
  const base = { sender: { id: CLIENTE }, recipient: { id: CONTA }, timestamp: 1 }
  for (const item of [
    { ...base, read: { mid: 'm9' } },
    { ...base, reaction: { mid: 'm9', action: 'react', reaction: 'love' } },
    { ...base, message_edit: { mid: 'm9', text: 'editado', num_edit: 1 } },
    { ...base, message: { mid: 'm9', is_deleted: true } },
    { ...base, message: { mid: 'm8', is_unsupported: true } },
    { ...base, postback: { mid: 'p', payload: 'x' } },
  ]) assert.equal((await s.enviar(aviso(item))).status, 200)
  assert.equal(s.linhas().length, 0)
  assert.equal(s.chamadas.length, 0)
})

test('estruturas estranhas (entry sem messaging, itens nulos) = 200', async () => {
  const s = montar()
  assert.equal((await s.enviar({ object: 'instagram', entry: [{ id: CONTA }, null, { messaging: [null, 1, 'x'] }] })).status, 200)
  assert.equal((await s.enviar({ object: 'instagram' })).status, 200)
  assert.equal((await s.enviar('[]')).status, 200)
})

test('JSON inválido com assinatura correta = 200', async () => {
  const s = montar()
  assert.equal((await s.enviar('{isto não é json')).status, 200)
  assert.equal(s.linhas().length, 0)
})

test('erro do D1 = 500 (a Meta reenvia) e o reenvio grava uma vez só', async () => {
  const s = montar()
  const prepare = s.db.prepare.bind(s.db)
  s.db.prepare = () => { throw new Error('D1 fora do ar') }
  assert.equal((await s.enviar(entrada('m1', { text: 'oi' }))).status, 500)
  assert.equal(s.chamadas.length, 0)
  s.db.prepare = prepare
  assert.equal((await s.enviar(entrada('m1', { text: 'oi' }))).status, 200)
  assert.equal(s.linhas().length, 1)
  assert.equal(s.chamadas.length, 1)
})

test('logs não trazem o texto do cliente nem o id inteiro', async () => {
  const s = montar()
  const saidas = []
  s.opcoes.logger = { log: (...a) => saidas.push(a.join(' ')), error: (...a) => saidas.push(a.join(' ')) }
  s.opcoes.gerarRascunho = async () => ({ status: 'pendente' })
  await s.enviar(entrada('m1', { text: 'segredo-do-cliente-123' }))
  const tudo = saidas.join('\n')
  assert.ok(tudo.length > 0)
  assert.ok(!tudo.includes('segredo-do-cliente-123'))
  assert.ok(!tudo.includes(CLIENTE))
})

test('consultas ao D1 por aviso: entrada nova 1 no pedido; eco 2', async () => {
  const s = montar({ IG_TOKEN: '' })
  const antes = s.db.consultas
  await s.enviar(entrada('m1', { text: 'oi' }))
  assert.equal(s.db.consultas - antes, 2) // 1 no pedido + 1 de "perfil já conhecido?" em segundo plano
  const meio = s.db.consultas
  await s.enviar(eco('e1'))
  assert.equal(s.db.consultas - meio, 2)
})

test('index.js: /instagram chega ao webhook com ctx; /whatsapp segue; outro caminho = 404', async () => {
  const s = montar()
  const ctx = { waitUntil: () => {} }
  const r = await worker.fetch(new Request('https://x.workers.dev/instagram?hub.mode=subscribe&hub.verify_token=token-ok&hub.challenge=7'), s.env, ctx)
  assert.equal(await r.text(), '7')
  assert.equal((await worker.fetch(new Request('https://x.workers.dev/whatsapp?hub.mode=subscribe&hub.verify_token=x&hub.challenge=7'), { ...s.env, WA_VERIFY_TOKEN: 'w' }, ctx)).status, 404)
  assert.equal((await worker.fetch(new Request('https://x.workers.dev/outro'), s.env, ctx)).status, 404)
})
