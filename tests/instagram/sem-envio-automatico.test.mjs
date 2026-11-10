import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { D1Local, criarBanco } from '../gestao/_d1local.mjs'

// REGRA DE OURO da Fase 1: a IA e o robô só escrevem rascunho. O único envio
// é o clique de um admin na Gestão (lib/instagram-meta.js, usado só por
// lib/gestao/instagram-envio.js).

const PASTAS = ['workers/recuperacao-carrinho', 'lib/instagram-ia']
// A API da Anthropic usa /v1/messages (permitido); a da Graph não leva /v1.
const PROIBIDO = [/instagram-meta/, /instagram-envio/, /(?<!\/v1)\/messages/]

function arquivos(pasta) {
  if (!existsSync(pasta)) return []
  return readdirSync(pasta, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && /\.(m?js|jsx|cjs|ts)$/.test(e.name))
    .map((e) => join(e.parentPath ?? e.path, e.name))
}

test('o código do robô e da IA não importa o envio nem fala com /messages da Graph API', () => {
  const lidos = PASTAS.flatMap(arquivos)
  for (const arquivo of lidos) {
    const codigo = readFileSync(arquivo, 'utf8')
    for (const regra of PROIBIDO) assert.ok(!regra.test(codigo), `${arquivo} contém ${regra}`)
  }
  // O envio existe e é só da Gestão.
  assert.ok(readFileSync('lib/gestao/instagram-envio.js', 'utf8').includes('instagram-meta'))
})

const temWebhook = existsSync('workers/recuperacao-carrinho/instagram-webhook.js')
const temRascunho = existsSync('lib/instagram-ia/rascunho.js')

// Fetch falso: se alguém chamar /messages, o teste cai. O resto (perfil do cliente) responde.
function redeVigiada(chamadas) {
  return async (url) => {
    chamadas.push(String(url))
    if (String(url).includes('/messages')) throw new Error('ENVIO PROIBIDO: ' + url)
    return new Response(JSON.stringify({ name: 'Maria', username: 'maria.s' }), { status: 200 })
  }
}

test('webhook e cron rodando com a IA ligada nunca chamam /messages', { skip: !(temWebhook && temRascunho) && 'robô ou IA ainda não existem' }, async () => {
  const { default: worker, executarRodada } = await import('../../workers/recuperacao-carrinho/index.js')
  const CONTA = '17841400000000001'
  const SEGREDO = 'segredo-do-app'
  const db = new D1Local(criarBanco())
  db.banco.exec('UPDATE instagram_estado SET ia_ligada = 1 WHERE id = 1')
  const env = { DB: db, MODO: 'ativo', TESTE_PARA: 't@example.com', SITE_URL: 'https://trilhaviva.org', TETO_DIA: '40', TETO_MES: '1100', RESEND_API_KEY: 'k', LEMBRETE_SEGREDO: 'segredo', IG_ACCOUNT_ID: CONTA, IG_PAGE_ID: '99', IG_VERIFY_TOKEN: 't', WA_APP_SECRET: SEGREDO, IG_TOKEN: 'tk', IG_GRAPH_VERSION: 'v26.0' }
  const chamadas = []
  const original = globalThis.fetch
  globalThis.fetch = redeVigiada(chamadas)
  const mudo = { log() {}, error() {}, warn() {} }
  try {
    const corpo = JSON.stringify({
      object: 'instagram',
      entry: [{ id: CONTA, time: 1, messaging: [{ sender: { id: '17841400000000999' }, recipient: { id: CONTA }, timestamp: 1, message: { mid: 'mid-1', text: 'Oi, tem novidade?' } }] }],
    })
    const pendentes = []
    const resposta = await worker.fetch(
      new Request('https://x.workers.dev/instagram', {
        method: 'POST',
        body: corpo,
        headers: { 'x-hub-signature-256': 'sha256=' + createHmac('sha256', SEGREDO).update(corpo).digest('hex') },
      }),
      env,
      { waitUntil: (p) => pendentes.push(p) }
    )
    await Promise.all(pendentes)
    assert.equal(resposta.status, 200)
    assert.equal(db.banco.prepare('SELECT COUNT(*) AS n FROM instagram_mensagens').get().n, 1)

    // A rodada do cron, com a conversa na fila de rascunhos e a IA ligada.
    await executarRodada(env, { agora: new Date(), logger: mudo, fetchImpl: redeVigiada(chamadas) })
  } finally {
    globalThis.fetch = original
  }
  assert.ok(chamadas.every((u) => !u.includes('/messages')))
  assert.equal(db.banco.prepare("SELECT COUNT(*) AS n FROM instagram_mensagens WHERE direcao = 'saida'").get().n, 0)
})
