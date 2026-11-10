import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { criarBanco, D1Local } from './_d1local.mjs'
import { consultarAvisos } from '../../lib/gestao/avisos.js'
import { explicarErroMeta, horasRestantes, dentroDaJanela } from '../../lib/instagram-meta.js'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export async function cookies() { return { get() { return { value: "t" } } } }'),
  'next/navigation': modulo('export function notFound() { const e = new Error("404"); e.codigo = "NAO_ENCONTRADO"; throw e }'),
  '@/lib/d1': modulo('export const getDB = () => globalThis.__db; export const getEnv = () => globalThis.__env || {}'),
  '@/lib/gestao/sessao': modulo('export const adminPeloToken = async () => globalThis.__admin'),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const lista = await import('../../app/api/interno/gestao/instagram/route.js')
const enviar = await import('../../app/api/interno/gestao/instagram/enviar/route.js')
const descartar = await import('../../app/api/interno/gestao/instagram/descartar/route.js')
const regenerar = await import('../../app/api/interno/gestao/instagram/regenerar/route.js')
const estado = await import('../../app/api/interno/gestao/instagram/estado/route.js')
const qualidade = await import('../../app/api/interno/gestao/instagram/qualidade/route.js')

const HOST = 'https://trilhaviva.org'
const ADMIN = { papel: 'master', precisa_trocar_senha: false, cliente: { id: 1, email: 'Paulo@T.com' } }
const MSG_JANELA = 'O Instagram só deixa responder até 24 h depois da última mensagem do cliente'

// Meta falsa no fetch global: guarda os pedidos e devolve o message_id combinado.
function metaFalsa({ messageId = 'mid-saida-1', falha = null } = {}) {
  const m = { pedidos: [] }
  globalThis.fetch = async (url, init) => {
    m.pedidos.push({ url, init, corpo: JSON.parse(init.body) })
    if (falha) return { ok: false, status: 400, json: async () => ({ error: falha }) }
    return { ok: true, status: 200, json: async () => ({ recipient_id: 'x', message_id: messageId }) }
  }
  return m
}

function montar(extra = '') {
  const banco = criarBanco()
  const db = new D1Local(banco)
  globalThis.__db = db
  globalThis.__admin = ADMIN
  globalThis.__env = { IG_TOKEN: 'segredo-ig', IG_PAGE_ID: '1789', IG_GRAPH_VERSION: 'v26.0' }
  banco.exec(`
    INSERT INTO instagram_mensagens (id, ig_msg_id, igsid, usuario, nome_perfil, direcao, texto, criado_em)
      VALUES (1, 'm1', 'u1', 'ana', 'Ana', 'entrada', 'Tem novidade?', datetime('now', '-2 hours'));
    INSERT INTO instagram_rascunhos (id, igsid, ate_mensagem_id, texto, situacao, status, motivo)
      VALUES (1, 'u1', 1, 'Oi, Ana! Tem sim.', 'S02_novidades', 'pendente', 'pergunta sobre novidades');
    ${extra}`)
  return { banco, db, meta: metaFalsa() }
}

const cab = (extra = {}) => ({ host: 'trilhaviva.org', origin: HOST, 'content-type': 'application/json', ...extra })
const post = (rota, corpo, cabecalhos = {}) =>
  rota.POST(new Request(`${HOST}/x`, { method: 'POST', headers: cab(cabecalhos), body: JSON.stringify(corpo) }))
const get = (rota, busca = '') => rota.GET(new Request(`${HOST}/x${busca}`, { headers: cab() }))
const um = (banco, sql, ...a) => banco.prepare(sql).get(...a)

test('não admin recebe 404 em todas as rotas; outra origem recebe 404 nos POSTs', async () => {
  const { meta } = montar()
  globalThis.__admin = null
  for (const rota of [lista, qualidade]) await assert.rejects(async () => get(rota), { codigo: 'NAO_ENCONTRADO' })
  for (const rota of [enviar, descartar, regenerar, estado]) {
    await assert.rejects(() => post(rota, { igsid: 'u1', texto: 'oi' }), { codigo: 'NAO_ENCONTRADO' })
  }
  globalThis.__admin = ADMIN
  for (const rota of [enviar, descartar, regenerar, estado]) {
    await assert.rejects(() => post(rota, { igsid: 'u1', texto: 'oi' }, { origin: 'https://outro.site' }), { codigo: 'NAO_ENCONTRADO' })
  }
  await assert.rejects(async () => get(enviar), { codigo: 'NAO_ENCONTRADO' })
  assert.equal(meta.pedidos.length, 0)
})

test('enviar o rascunho sem mudar: grava a saída, marca enviado e registra', async () => {
  const { banco, meta } = montar()
  const res = await post(enviar, { igsid: 'u1', texto: 'Oi, Ana! Tem sim.', rascunho_id: 1 })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('cache-control'), 'no-store, max-age=0')
  assert.deepEqual(await res.json(), { ok: true })
  assert.equal(meta.pedidos.length, 1)
  const p = meta.pedidos[0]
  assert.equal(p.url, 'https://graph.facebook.com/v26.0/1789/messages')
  assert.equal(p.init.headers.Authorization, 'Bearer segredo-ig')
  assert.deepEqual(p.corpo, { recipient: { id: 'u1' }, messaging_type: 'RESPONSE', message: { text: 'Oi, Ana! Tem sim.' } })
  const saida = um(banco, "SELECT * FROM instagram_mensagens WHERE direcao = 'saida'")
  assert.equal(saida.ig_msg_id, 'mid-saida-1')
  assert.equal(saida.enviado_por, 'paulo@t.com')
  assert.equal(saida.rascunho_id, 1)
  const r = um(banco, 'SELECT * FROM instagram_rascunhos WHERE id = 1')
  assert.equal(r.status, 'enviado')
  assert.equal(r.texto_enviado, 'Oi, Ana! Tem sim.')
  assert.equal(r.decidido_por, 'paulo@t.com')
  assert.ok(r.decidido_em)
  assert.equal(um(banco, "SELECT alvo FROM registro WHERE acao = 'instagram_respondido'").alvo, 'u1')
})

test('enviar texto diferente do rascunho marca editado', async () => {
  const { banco } = montar()
  await post(enviar, { igsid: 'u1', texto: 'Oi! Temos novidade sim.', rascunho_id: 1 })
  const r = um(banco, 'SELECT status, texto, texto_enviado FROM instagram_rascunhos WHERE id = 1')
  assert.deepEqual({ ...r }, { status: 'editado', texto: 'Oi, Ana! Tem sim.', texto_enviado: 'Oi! Temos novidade sim.' })
})

test('o eco da Meta chegou antes: a linha app é atualizada, sem erro nem duplicata', async () => {
  const { banco } = montar(`INSERT INTO instagram_mensagens (ig_msg_id, igsid, direcao, texto, enviado_por)
    VALUES ('mid-saida-1', 'u1', 'saida', 'Oi, Ana! Tem sim.', 'app');`)
  const res = await post(enviar, { igsid: 'u1', texto: 'Oi, Ana! Tem sim.', rascunho_id: 1 })
  assert.equal(res.status, 200)
  const saidas = banco.prepare("SELECT enviado_por, rascunho_id FROM instagram_mensagens WHERE direcao = 'saida'").all()
  assert.equal(saidas.length, 1)
  assert.deepEqual({ ...saidas[0] }, { enviado_por: 'paulo@t.com', rascunho_id: 1 })
})

test('janela vencida: 400 com a mensagem e nada vai para a Meta', async () => {
  const { banco, meta } = montar("UPDATE instagram_mensagens SET criado_em = datetime('now', '-25 hours');")
  const res = await post(enviar, { igsid: 'u1', texto: 'Oi', rascunho_id: 1 })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).erro, MSG_JANELA)
  assert.equal(meta.pedidos.length, 0)
  assert.equal(um(banco, 'SELECT status FROM instagram_rascunhos WHERE id = 1').status, 'pendente')
})

test('texto vazio, longo (1.000 bytes em UTF-8) e rascunho inválido dão 400', async () => {
  const { meta } = montar()
  const vazio = await post(enviar, { igsid: 'u1', texto: '   ' })
  assert.equal(vazio.status, 400)
  assert.equal((await post(enviar, { igsid: 'u1', texto: 'a'.repeat(1001) })).status, 400)
  const acentos = await post(enviar, { igsid: 'u1', texto: 'é'.repeat(600) }) // 600 letras, 1.200 bytes
  assert.equal(acentos.status, 400)
  assert.match((await acentos.json()).erro, /longo demais/)
  assert.equal((await post(enviar, { igsid: '../x', texto: 'oi' })).status, 400)
  assert.equal((await post(enviar, { igsid: 'u1', texto: 'oi', rascunho_id: 99 })).status, 400)
  assert.equal(meta.pedidos.length, 0)
  assert.equal((await post(enviar, { igsid: 'u1', texto: 'a'.repeat(1000) })).status, 200)
})

test('rascunho já tratado não envia de novo (409)', async () => {
  const { meta } = montar()
  assert.equal((await post(enviar, { igsid: 'u1', texto: 'Oi, Ana! Tem sim.', rascunho_id: 1 })).status, 200)
  const dois = await post(enviar, { igsid: 'u1', texto: 'Oi, Ana! Tem sim.', rascunho_id: 1 })
  assert.equal(dois.status, 409)
  assert.equal(meta.pedidos.length, 1)
})

test('erro da Meta: 502 em português, sem token, rascunho continua aberto', async () => {
  const { banco } = montar()
  const meta = metaFalsa({ falha: { code: 10, error_subcode: 2534022, message: 'fora da janela' } })
  const res = await post(enviar, { igsid: 'u1', texto: 'Oi', rascunho_id: 1 })
  assert.equal(res.status, 502)
  const corpo = await res.json()
  assert.match(corpo.erro, /24 h/)
  assert.ok(!JSON.stringify(corpo).includes('segredo-ig'))
  assert.equal(meta.pedidos.length, 1)
  assert.equal(um(banco, 'SELECT status FROM instagram_rascunhos WHERE id = 1').status, 'pendente')
  assert.equal(um(banco, "SELECT COUNT(*) AS n FROM instagram_mensagens WHERE direcao = 'saida'").n, 0)
})

test('descartar: vira descartado com quem e quando; segunda vez dá 409', async () => {
  const { banco } = montar()
  assert.equal((await post(descartar, { rascunho_id: 1 })).status, 200)
  const r = um(banco, 'SELECT status, decidido_por, decidido_em FROM instagram_rascunhos WHERE id = 1')
  assert.equal(r.status, 'descartado')
  assert.equal(r.decidido_por, 'paulo@t.com')
  assert.ok(r.decidido_em)
  assert.equal(um(banco, "SELECT COUNT(*) AS n FROM registro WHERE acao = 'instagram_descartado'").n, 1)
  assert.equal((await post(descartar, { rascunho_id: 1 })).status, 409)
  assert.equal((await post(descartar, { rascunho_id: 'x' })).status, 400)
})

test('regenerar: só marca substituido o rascunho da última pergunta (o robô escreve o novo)', async () => {
  const { banco } = montar(`INSERT INTO instagram_mensagens (id, igsid, direcao, texto) VALUES (2, 'u2', 'entrada', 'oi');
    INSERT INTO instagram_rascunhos (id, igsid, ate_mensagem_id, texto, status) VALUES (2, 'u2', 2, 'x', 'pendente');`)
  const pausada = await post(regenerar, { igsid: 'u1' }) // IA pausada: nada é marcado
  assert.equal(pausada.status, 409)
  assert.match((await pausada.json()).erro, /IA está pausada/)
  assert.equal(um(banco, 'SELECT status FROM instagram_rascunhos WHERE id = 1').status, 'pendente')
  banco.exec('UPDATE instagram_estado SET ia_ligada = 1')
  const res = await post(regenerar, { igsid: 'u1' })
  assert.equal(res.status, 200)
  assert.equal(um(banco, 'SELECT status FROM instagram_rascunhos WHERE id = 1').status, 'substituido')
  assert.equal(um(banco, 'SELECT status FROM instagram_rascunhos WHERE id = 2').status, 'pendente')
  assert.equal(um(banco, "SELECT COUNT(*) AS n FROM registro WHERE acao = 'instagram_regenerado'").n, 1)
  assert.equal((await post(regenerar, { igsid: 'u1' })).status, 409) // nada mais a trocar
  // rascunho de pergunta antiga não é tocado
  banco.exec("INSERT INTO instagram_mensagens (id, igsid, direcao, texto) VALUES (3, 'u1', 'entrada', 'e mais uma'); INSERT INTO instagram_rascunhos (id, igsid, ate_mensagem_id, texto, status) VALUES (3, 'u1', 3, 'y', 'falhou')")
  assert.equal((await post(regenerar, { igsid: 'u1' })).status, 200)
  assert.equal(um(banco, 'SELECT status FROM instagram_rascunhos WHERE id = 3').status, 'substituido')
})

test('estado: liga e desliga a IA, grava quem e o registro; valor torto dá 400', async () => {
  const { banco } = montar()
  assert.equal(um(banco, 'SELECT ia_ligada FROM instagram_estado').ia_ligada, 0)
  assert.equal((await post(estado, { ia_ligada: true })).status, 200)
  const e = um(banco, 'SELECT ia_ligada, atualizado_por FROM instagram_estado')
  assert.deepEqual({ ...e }, { ia_ligada: 1, atualizado_por: 'paulo@t.com' })
  assert.equal((await post(estado, { ia_ligada: false })).status, 200)
  assert.equal(um(banco, 'SELECT ia_ligada FROM instagram_estado').ia_ligada, 0)
  assert.equal(um(banco, "SELECT COUNT(*) AS n FROM registro WHERE acao = 'instagram_ia_ligada'").n, 1)
  assert.equal(um(banco, "SELECT COUNT(*) AS n FROM registro WHERE acao = 'instagram_ia_desligada'").n, 1)
  assert.equal((await post(estado, { ia_ligada: 'sim' })).status, 400)
  globalThis.__admin = { ...ADMIN, papel: 'membro' } // só o master liga/desliga
  const membro = await post(estado, { ia_ligada: true })
  assert.equal(membro.status, 403)
  assert.equal(um(banco, 'SELECT ia_ligada FROM instagram_estado').ia_ligada, 0)
})

test('envio duplo: duas chamadas ao mesmo tempo com o mesmo rascunho mandam 1 só vez', async () => {
  const { banco, meta } = montar()
  const corpo = { igsid: 'u1', texto: 'Oi, Ana! Tem sim.', rascunho_id: 1 }
  const [a, b] = await Promise.all([post(enviar, corpo), post(enviar, corpo)])
  assert.deepEqual([a.status, b.status].sort(), [200, 409])
  assert.equal(meta.pedidos.length, 1)
  const r = um(banco, 'SELECT status, texto_enviado FROM instagram_rascunhos WHERE id = 1')
  assert.deepEqual({ ...r }, { status: 'enviado', texto_enviado: 'Oi, Ana! Tem sim.' })
})

test('envio duplo sem rascunho: o mesmo texto no mesmo minuto manda 1 vez e 409; a trava vira o id real', async () => {
  const { banco, meta } = montar()
  const corpo = { igsid: 'u1', texto: 'Obrigado pelo contato!' }
  const [a, b] = await Promise.all([post(enviar, corpo), post(enviar, corpo)])
  assert.deepEqual([a.status, b.status].sort(), [200, 409])
  assert.equal(meta.pedidos.length, 1)
  const saidas = banco.prepare("SELECT ig_msg_id, enviado_por FROM instagram_mensagens WHERE direcao = 'saida'").all()
  assert.deepEqual(saidas.map((x) => ({ ...x })), [{ ig_msg_id: 'mid-saida-1', enviado_por: 'paulo@t.com' }])
})

test('envio sem rascunho com o eco já gravado: apaga a trava e atualiza a linha real', async () => {
  const { banco } = montar("INSERT INTO instagram_mensagens (ig_msg_id, igsid, direcao, texto, enviado_por) VALUES ('mid-saida-1', 'u1', 'saida', 'Oi', 'app');")
  const original = globalThis.fetch
  globalThis.fetch = async (...args) => { // o eco chega enquanto a Meta responde
    return original(...args)
  }
  assert.equal((await post(enviar, { igsid: 'u1', texto: 'Oi' })).status, 200)
  const saidas = banco.prepare("SELECT ig_msg_id, enviado_por FROM instagram_mensagens WHERE direcao = 'saida'").all()
  assert.deepEqual(saidas.map((x) => ({ ...x })), [{ ig_msg_id: 'mid-saida-1', enviado_por: 'paulo@t.com' }])
})

test('falha da Meta devolve o rascunho para pendente e apaga a trava (reenvio possível)', async () => {
  const { banco } = montar()
  metaFalsa({ falha: { code: 10, error_subcode: 2534022, message: 'x' } })
  assert.equal((await post(enviar, { igsid: 'u1', texto: 'Oi, Ana! Tem sim.', rascunho_id: 1 })).status, 502)
  const r = um(banco, 'SELECT status, decidido_por, decidido_em, texto_enviado FROM instagram_rascunhos WHERE id = 1')
  assert.deepEqual({ ...r }, { status: 'pendente', decidido_por: null, decidido_em: null, texto_enviado: null })
  assert.equal((await post(enviar, { igsid: 'u1', texto: 'Sem rascunho' })).status, 502)
  assert.equal(um(banco, "SELECT COUNT(*) AS n FROM instagram_mensagens WHERE ig_msg_id LIKE 'trava:%'").n, 0)
  const meta = metaFalsa()
  assert.equal((await post(enviar, { igsid: 'u1', texto: 'Oi, Ana! Tem sim.', rascunho_id: 1 })).status, 200)
  assert.equal(meta.pedidos.length, 1)
})

test('linhas trava: que sobrarem não aparecem na conversa nem na lista', async () => {
  const { banco } = montar("INSERT INTO instagram_mensagens (ig_msg_id, igsid, direcao, texto) VALUES ('trava:u1:x:2026', 'u1', 'saida', 'fantasma');")
  const c = await (await get(lista, '?conversa=u1')).json()
  assert.ok(c.conversa.mensagens.every((m) => m.texto !== 'fantasma'))
  const l = await (await get(lista)).json()
  assert.equal(l.conversas.find((x) => x.igsid === 'u1').esperando, true)
  assert.ok(banco)
})

test('lista e conversa: formato, limites (50 conversas, 30 mensagens) e LIMIT em toda consulta', async () => {
  const { banco, db } = montar()
  for (let i = 0; i < 60; i++) {
    banco.exec(`INSERT INTO instagram_mensagens (igsid, direcao, texto, criado_em) VALUES ('c${i}', 'entrada', 'oi ${i}', datetime('now', '-${i} minutes'))`)
  }
  for (let i = 0; i < 40; i++) banco.exec(`INSERT INTO instagram_mensagens (igsid, direcao, texto) VALUES ('u1', 'entrada', 'msg ${i}')`)
  const sqls = []
  const original = db.prepare.bind(db)
  db.prepare = (sql) => { sqls.push(sql); return original(sql) }

  const l = await (await get(lista)).json()
  assert.equal(l.ok, true)
  assert.equal(l.configurado, true)
  assert.deepEqual(l.estado.ia_ligada, false)
  assert.equal(l.conversas.length, 50)
  const u1 = l.conversas.find((c) => c.igsid === 'u1')
  assert.equal(u1.usuario, 'ana')
  assert.equal(u1.rascunho_pendente, true)
  assert.equal(u1.precisa_humano, false)
  assert.equal(u1.janela_aberta, true)
  assert.equal(u1.esperando, true)
  assert.ok(u1.horas_restantes > 21 && u1.horas_restantes <= 24)
  assert.equal(u1.ultima.texto, 'msg 39')

  const c = await (await get(lista, '?conversa=u1')).json()
  assert.equal(c.conversa.mensagens.length, 30)
  assert.equal(c.conversa.mensagens.at(-1).texto, 'msg 39') // da mais antiga para a mais nova
  assert.equal(c.conversa.rascunho.situacao, 'S02_novidades')
  assert.equal(c.conversa.rascunho.desatualizado, true) // chegaram 40 mensagens depois
  assert.equal(c.conversa.janela_aberta, true)
  assert.equal(JSON.stringify(c).includes('midia_url'), false)
  assert.equal((await get(lista, '?conversa=..%2F')).status, 400)
  assert.equal((await (await get(lista, '?conversa=naoexiste')).json()).conversa, null)

  const q = await (await get(qualidade)).json()
  assert.deepEqual(Object.keys(q).sort(), ['dias', 'modelos', 'ok', 'situacoes', 'total', 'ultimos_editados'])
  for (const sql of sqls) assert.match(sql, /LIMIT/i, sql)
})

test('qualidade: soma por situação nos últimos 30 dias e lista os editados', async () => {
  const { banco } = montar(`
    INSERT INTO instagram_rascunhos (igsid, ate_mensagem_id, texto, situacao, status, texto_enviado, provedor, modelo, decidido_em)
      VALUES ('a', 1, 'sug', 'S01_a', 'enviado', 'sug', 'workers-ai', 'm1', datetime('now')),
             ('b', 1, 'sug2', 'S01_a', 'editado', 'mudou', 'workers-ai', 'm1', datetime('now')),
             ('c', 1, NULL, 'S01_a', 'falhou', NULL, 'workers-ai', 'm1', NULL);
    UPDATE instagram_rascunhos SET erro = 'cota do dia' WHERE igsid = 'c';
    INSERT INTO instagram_rascunhos (igsid, ate_mensagem_id, texto, situacao, status, criado_em)
      VALUES ('d', 1, 'velho', 'S09_velha', 'enviado', datetime('now', '-40 days'));`)
  banco.exec("UPDATE instagram_rascunhos SET erro = 'cota do dia' WHERE igsid = 'c'")
  const q = await (await get(qualidade)).json()
  const s = q.situacoes.find((x) => x.situacao === 'S01_a')
  assert.deepEqual({ ...s }, { situacao: 'S01_a', gerados: 3, enviados_sem_mudanca: 1, editados: 1, descartados: 0, falhas_cota: 1 })
  assert.equal(q.situacoes.some((x) => x.situacao === 'S09_velha'), false)
  assert.deepEqual(q.modelos, [{ provedor: 'workers-ai', modelo: 'm1', total: 3 }, { provedor: '?', modelo: '?', total: 1 }])
  assert.equal(q.ultimos_editados[0].sugestao, 'sug2')
  assert.equal(q.ultimos_editados[0].enviado, 'mudou')
})

test('avisos: instagram_esperando conta conversas cuja última mensagem é do cliente dentro da janela', async () => {
  const { banco, db } = montar(`
    INSERT INTO instagram_mensagens (igsid, direcao, texto, criado_em) VALUES
      ('r', 'entrada', 'oi', datetime('now', '-3 hours')),
      ('r', 'saida', 'olá', datetime('now', '-2 hours')),
      ('v', 'entrada', 'velha', datetime('now', '-30 hours'));`)
  const antes = db.lotes
  const a = await consultarAvisos(db, {})
  assert.equal(a.instagram_esperando, 1) // só u1
  assert.equal(db.lotes - antes, 3) // sem lote novo
  banco.exec("INSERT INTO instagram_mensagens (igsid, direcao, texto) VALUES ('u1', 'saida', 'resp')")
  assert.equal((await consultarAvisos(db, {})).instagram_esperando, 0)
})

test('janela de 24 h e tradução dos erros da Meta', () => {
  const agora = new Date('2026-11-10T12:00:00Z')
  assert.equal(horasRestantes('2026-11-10 07:00:00', agora), 19)
  assert.equal(dentroDaJanela('2026-11-09 11:59:59', agora), false)
  assert.equal(dentroDaJanela(null, agora), false)
  const e = (codigo, subcodigo) => explicarErroMeta({ codigo, subcodigo })
  assert.match(e(10, 2534022), /24 h/)
  assert.match(e(10, 2018278), /24 h/)
  assert.match(e(190), /token/)
  assert.match(e(200), /permissão/)
  assert.match(e(200, 2018028), /acesso avançado/)
  assert.match(e(551), /não está disponível/)
  assert.match(e(100, 2534014), /identificador/)
  assert.match(e(200, 2534041), /desligou/)
  assert.match(e(10, 2534077), /ligadas/)
  assert.match(e(613, 2534040), /limite/)
  assert.match(explicarErroMeta({ name: 'AbortError' }), /a tempo/)
  assert.match(explicarErroMeta(new Error('x')), /Tente de novo/)
})
