import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  fbcDoFbclid,
  juntarOrigem,
  lerCookie,
  lerCookieOrigem,
  montarCustomData,
  montarUserData,
  normalizarTelefoneMeta,
  origemDoEndereco,
  partesDoNome,
  rotuloOrigem,
} from '../../lib/rastreio.js'
import { enviarEventoMeta } from '../../lib/meta.js'
import { montarCorpoPreferencia, resumirPagamento } from '../../lib/mercadopago.js'

const hash = (t) => createHash('sha256').update(t).digest('hex')

test('fbc é montado a partir do fbclid no formato da Meta', () => {
  assert.equal(fbcDoFbclid('IwAR123_abc-XYZ', 1760000000123), 'fb.1.1760000000123.IwAR123_abc-XYZ')
  assert.equal(fbcDoFbclid(''), '')
  assert.equal(fbcDoFbclid('curto'), '')
  assert.equal(fbcDoFbclid('tem espaço<script>'), '')
})

test('origem do endereço lê as UTM do anúncio e o fbclid', () => {
  const r = origemDoEndereco(
    '?utm_source=meta&utm_medium=paid&utm_campaign=box-12-10&utm_content=box-banda&fbclid=TESTE123abc'
  )
  assert.deepEqual(r.origem, { source: 'meta', medium: 'paid', campaign: 'box-12-10', content: 'box-banda' })
  assert.equal(r.fbclid, 'TESTE123abc')
  // Só fbclid (link da Meta sem UTM): fonte "meta".
  assert.equal(origemDoEndereco('?fbclid=TESTE123abc').origem.source, 'meta')
  // Sem nada: não mexe no cookie.
  assert.equal(origemDoEndereco('?cupom=X'), null)
})

test('cookie de origem guarda a primeira e a última visita', () => {
  const um = juntarOrigem(null, { source: 'meta', campaign: 'box-12-10', content: 'box-video' }, 1)
  const dois = juntarOrigem(um, { source: 'email', medium: 'lembrete', campaign: 'carrinho' }, 2)
  assert.equal(dois.primeiro.content, 'box-video')
  assert.equal(dois.ultimo.source, 'email')
  const lido = lerCookieOrigem(encodeURIComponent(JSON.stringify(dois)))
  assert.equal(lido.primeiro.campaign, 'box-12-10')
  assert.equal(lido.ultimo.campaign, 'carrinho')
  // Cookie estragado ou adulterado não derruba nada.
  assert.equal(lerCookieOrigem('%7Bquebrado'), null)
  assert.equal(lerCookieOrigem(encodeURIComponent('{"ultimo":{"source":"<x>"}}')).ultimo.source, 'x')
  assert.equal(lerCookie('a=1; tv_origem=abc; _fbc=fb.1.2.x', 'tv_origem'), 'abc')
})

test('telefone vai só com dígitos e o 55 na frente', () => {
  assert.equal(normalizarTelefoneMeta('(11) 98765-4321'), '5511987654321')
  assert.equal(normalizarTelefoneMeta('5511987654321'), '5511987654321')
  assert.equal(normalizarTelefoneMeta('1133334444'), '551133334444')
  assert.equal(normalizarTelefoneMeta('123'), '')
})

test('nome vira primeiro e último, minúsculo e sem acento', () => {
  assert.deepEqual(partesDoNome('  José  da Conceição Araújo '), { fn: 'jose', ln: 'araujo' })
  assert.deepEqual(partesDoNome('Ângela'), { fn: 'angela', ln: '' })
  assert.deepEqual(partesDoNome(''), { fn: '', ln: '' })
})

test('dados da pessoa vão para a Meta só em SHA-256', async () => {
  const u = await montarUserData({
    email: ' Ana@Example.com ',
    telefone: '11987654321',
    nome: 'Ana Lúcia Souza',
    ip: '1.2.3.4',
    ua: 'navegador',
    fbp: 'fb.1.1.2',
    fbc: 'fb.1.3.abc',
  })
  assert.deepEqual(u.em, [hash('ana@example.com')])
  assert.deepEqual(u.external_id, [hash('ana@example.com')])
  assert.deepEqual(u.ph, [hash('5511987654321')])
  assert.deepEqual(u.fn, [hash('ana')])
  assert.deepEqual(u.ln, [hash('souza')])
  assert.deepEqual(u.country, [hash('br')])
  assert.equal(u.client_ip_address, '1.2.3.4')
  assert.equal(u.fbc, 'fb.1.3.abc')
  // Nada em texto aberto.
  assert.ok(!JSON.stringify(u).includes('ana@example.com'))
  assert.ok(!JSON.stringify(u).includes('987654321'))
})

test('custom_data leva produto, quantidade e o número do pedido', () => {
  assert.deepEqual(montarCustomData({ valor: 89.9, moeda: 'BRL', referencia: 'ref-1' }), {
    value: 89.9,
    currency: 'BRL',
    content_ids: ['pacote-2000-vs'],
    content_type: 'product',
    num_items: 1,
    order_id: 'ref-1',
  })
})

test('o servidor usa o mesmo id que a página /sucesso usa no Pixel', () => {
  const ref = '11111111-1111-4111-8111-111111111111'
  const corpo = montarCorpoPreferencia({
    email: 'ana@example.com',
    nome: 'Ana',
    referencia: ref,
    origem: 'https://trilhaviva.org',
    titulo: 'T',
    descricao: 'D',
    valorCentavos: 8990,
    rastreio: { fbp: 'fb.1.1.2', fbc: '', ip: '1.2.3.4', ua: 'x' },
    telefone: '11987654321',
    utm: { source: 'meta', medium: 'paid', campaign: 'box-12-10', content: 'box-banda' },
  })
  // A página /sucesso recebe external_reference no retorno e usa como eventID.
  assert.equal(corpo.external_reference, ref)
  const r = resumirPagamento({
    id: 123456789,
    status: 'approved',
    external_reference: corpo.external_reference,
    transaction_amount: 89.9,
    metadata: corpo.metadata,
  })
  // Id do Purchase no webhook: r.referencia || r.compraId.
  assert.equal(r.referencia || r.compraId, ref)
  assert.equal(r.telefone, '11987654321')
  assert.deepEqual(r.utm, { source: 'meta', medium: 'paid', campaign: 'box-12-10', content: 'box-banda' })
})

test('rastreamento que falha nunca lança erro (checkout e webhook seguem)', async () => {
  process.env.META_CAPI_TOKEN = 'teste'
  try {
    const caiu = await enviarEventoMeta({
      nome: 'Purchase',
      id: 'ref-1',
      email: 'ana@example.com',
      valor: 1,
      fetchImpl: async () => {
        throw new Error('rede caiu')
      },
    })
    assert.deepEqual(caiu, { enviado: false, status: 'falhou' })

    const recusou = await enviarEventoMeta({
      nome: 'Purchase',
      id: 'ref-1',
      fetchImpl: async () => new Response('{"error":"token"}', { status: 400 }),
    })
    assert.deepEqual(recusou, { enviado: false, status: 'http_400' })

    let enviado
    const ok = await enviarEventoMeta({
      nome: 'Purchase',
      id: 'ref-1',
      email: 'ana@example.com',
      telefone: '11987654321',
      nomeCliente: 'Ana Souza',
      valor: 89.9,
      referencia: 'ref-1',
      fetchImpl: async (_url, opcoes) => {
        enviado = JSON.parse(opcoes.body)
        return new Response('{}', { status: 200 })
      },
    })
    assert.deepEqual(ok, { enviado: true, status: 'ok' })
    assert.equal(enviado.data[0].event_id, 'ref-1')
    assert.equal(enviado.data[0].custom_data.order_id, 'ref-1')
    assert.deepEqual(enviado.data[0].user_data.ph, [hash('5511987654321')])
  } finally {
    delete process.env.META_CAPI_TOKEN
  }
})

test('sem token, não manda nada e não quebra', async () => {
  delete process.env.META_CAPI_TOKEN
  const r = await enviarEventoMeta({ nome: 'Purchase', id: 'x' })
  assert.deepEqual(r, { enviado: false, status: 'nao_configurado' })
})

test('rótulo da origem na gestão: anúncio, campanha, fonte ou direto', () => {
  assert.equal(rotuloOrigem({ utm_source: 'meta', utm_campaign: 'box-12-10', utm_content: 'box-banda' }), 'box-banda')
  assert.equal(rotuloOrigem({ utm_source: 'meta', utm_campaign: 'box-12-10' }), 'box-12-10')
  assert.equal(rotuloOrigem({ utm_source: 'email' }), 'email')
  assert.equal(rotuloOrigem({}), 'direto')
})

// ---- Gravação no banco (SQLite em memória com o esquema real) ----
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { gravarRastreioCompra } from '../../lib/rastreio-compra.js'
import { gravarCarrinho } from '../../lib/carrinhos.js'

function bancoDeTeste() {
  const banco = new DatabaseSync(':memory:')
  for (const m of ['0000_esquema_atual', '0001_gestao_fase1', '0002_cupons', '0004_carrinhos', '0012_rastreio', '0013_testes']) {
    banco.exec(readFileSync(`migrations/${m}.sql`, 'utf8'))
  }
  const db = {
    prepare(sql) {
      const p = banco.prepare(sql)
      let v = []
      return {
        bind(...n) {
          v = n
          return this
        },
        async first() {
          return p.get(...v) || null
        },
        async run() {
          return { meta: { changes: p.run(...v).changes } }
        },
      }
    },
  }
  return { banco, db }
}

test('compra guarda a origem e o envio à Meta; um ok não é apagado por falha numa repetição', async () => {
  const { banco, db } = bancoDeTeste()
  banco.exec("INSERT INTO clientes (email) VALUES ('ana@example.com')")
  banco.exec("INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos) VALUES (1, 'mp_1', 8990)")
  const origem = { source: 'meta', medium: 'paid', campaign: 'box-12-10', content: 'box-banda' }

  await gravarRastreioCompra(db, { compraId: 'mp_1', origem, metaStatus: 'http_500' })
  let c = banco.prepare("SELECT * FROM compras WHERE stripe_session_id = 'mp_1'").get()
  assert.equal(c.meta_status, 'http_500')
  assert.equal(c.meta_enviado_em, null)
  assert.equal(c.utm_content, 'box-banda')

  await gravarRastreioCompra(db, { compraId: 'mp_1', origem, metaStatus: 'ok' })
  c = banco.prepare("SELECT * FROM compras WHERE stripe_session_id = 'mp_1'").get()
  assert.equal(c.meta_status, 'ok')
  assert.ok(c.meta_enviado_em)
  const primeiroEnvio = c.meta_enviado_em

  await gravarRastreioCompra(db, { compraId: 'mp_1', origem: {}, metaStatus: 'falhou' })
  c = banco.prepare("SELECT * FROM compras WHERE stripe_session_id = 'mp_1'").get()
  assert.equal(c.meta_status, 'ok')
  assert.equal(c.meta_enviado_em, primeiroEnvio)
  assert.equal(c.utm_campaign, 'box-12-10')
})

test('carrinho grava a origem e os identificadores da Meta', async () => {
  const { banco, db } = bancoDeTeste()
  await gravarCarrinho(db, {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
    nome: 'Ana',
    telefone: '11987654321',
    origem: 'utm=meta/paid/teste/teste',
    utm: { source: 'meta', medium: 'paid', campaign: 'teste', content: 'teste' },
    fbp: 'fb.1.1.2',
    fbc: 'fb.1.1760000000000.TESTE123',
    ip: '1.2.3.4',
    ua: 'navegador',
  })
  const k = banco.prepare('SELECT * FROM carrinhos').get()
  assert.equal(k.utm_campaign, 'teste')
  assert.equal(k.fbc, 'fb.1.1760000000000.TESTE123')
  assert.equal(k.fbp, 'fb.1.1.2')
  assert.equal(k.ip, '1.2.3.4')
})
