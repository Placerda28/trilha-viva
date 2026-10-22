import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { criarBanco, D1Local } from './_d1local.mjs'
import { inicioDoDiaBrasilia, periodoAnterior, validarPeriodo } from '../../lib/gestao/datas.js'
import { consultarAvisos } from '../../lib/gestao/avisos.js'
import { agruparFontes, consultarPainel, rotuloFonte } from '../../lib/gestao/painel.js'
import { buscarPessoas, termoBusca } from '../../lib/gestao/busca.js'
import { consultarClienteDetalhe, idClienteValido } from '../../lib/gestao/cliente-detalhe.js'
import { consultarCampanhas, montarCampanhas } from '../../lib/gestao/campanhas.js'
import { consultarDownloads } from '../../lib/gestao/downloads.js'

const AGORA = new Date('2026-10-22T15:00:00Z') // 12h em Brasília

function seed() {
  const b = criarBanco()
  b.exec(`
    INSERT INTO clientes (id, email, nome, supabase_id, bloqueado, ultimo_acesso, criado_em) VALUES
      (1, 'ana@example.com', 'Ana', 'sup1', 0, '2026-10-10 12:00:00', '2026-10-02 12:00:00'),
      (2, 'bia@example.com', 'Bia', NULL, 0, NULL, '2026-10-03 12:00:00'),
      (3, 'caio@example.com', 'Caio', 'sup3', 0, NULL, '2026-10-04 12:00:00');
    INSERT INTO compras (id, cliente_id, stripe_session_id, valor_centavos, moeda, status, criado_em, utm_source, utm_medium, utm_campaign, utm_content, meta_status, forma_pagamento, teste) VALUES
      (1, 1, 'mp_1', 19700, 'brl', 'pago', '2026-10-05 12:00:00', 'ig', NULL, 'pascoa', 'ad1', 'ok', 'pix', 0),
      (2, 2, 'mp_2', 19700, 'brl', 'pago', '2026-10-06 12:00:00', NULL, NULL, NULL, NULL, 'http_400', 'pix', 0),
      (3, 3, 'mp_3', 9900, 'brl', 'pago', '2026-10-07 12:00:00', 'email', 'lead', 'vs-gratis-3', NULL, 'ok', 'cartao', 0),
      (4, 1, 'mp_4', 5000, 'brl', 'pago', '2026-10-08 12:00:00', 'ig', NULL, 'pascoa', 'ad2', 'ok', 'pix', 1),
      (5, 3, 'mp_5', 19700, 'brl', 'pago', '2026-09-20 12:00:00', NULL, NULL, NULL, NULL, NULL, NULL, 0);
    INSERT INTO carrinhos (id, email, nome, telefone, criado_em, status, pago_em, etapa_email, utm_source, utm_campaign, utm_content, ip, teste) VALUES
      ('a', 'ana@example.com', 'Ana', '27999990001', '2026-10-05 10:00:00', 'pago', '2026-10-05 12:00:00', 1, 'ig', 'pascoa', 'ad1', '1.1.1.1', 0),
      ('b', 'bia@example.com', 'Bia', '27999990002', '2026-10-06 10:00:00', 'pago', '2026-10-06 12:00:00', 0, NULL, NULL, NULL, '1.1.1.2', 0),
      ('d', 'dora@example.com', 'Dora', '27999990004', '2026-10-20 10:00:00', 'lembrado', NULL, 1, 'ig', 'pascoa', 'ad2', '1.1.1.3', 0),
      ('v', 'velha@example.com', 'Velha', NULL, '2026-09-01 10:00:00', 'aberto', NULL, 0, NULL, NULL, NULL, NULL, 0),
      ('t', 'teste@example.com', 'Teste', NULL, '2026-10-08 10:00:00', 'aberto', NULL, 0, 'ig', 'pascoa', 'ad1', '1.1.1.4', 1);
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em) VALUES
      ('a', 'email', 1, '2026-10-05 11:00:00'),
      ('d', 'email', 1, '2026-10-20 11:00:00');
    INSERT INTO leads (id, nome, email, whatsapp, consentimento, token_hash, token_expira_em, criado_em, origem, campanha, comprou) VALUES
      (1, 'Maria Souza', 'maria@example.com', '27996253839', 1, 'h1', '2026-12-01', '2026-10-10 12:00:00', 'ig', 'pascoa', 0),
      (2, 'Caio', 'caio@example.com', '27999990003', 1, 'h2', '2026-12-01', '2026-10-11 12:00:00', 'vs', 'x', 1);
    INSERT INTO downloads (cliente_id, arquivo, slug, ip, criado_em) VALUES
      (1, 'a.zip', 'musica-a', '9.9.9.9', '2026-10-21 12:00:00'),
      (1, 'b.zip', 'musica-b', '9.9.9.9', '2026-10-22 13:00:00'),
      (1, 'c.zip', 'musica-a', '9.9.9.9', '2026-10-22 14:00:00'),
      (3, 'd.zip', 'musica-a', '8.8.8.8', '2026-10-22 14:30:00');
    INSERT INTO registro (quem, acao, alvo, criado_em) VALUES
      ('paulo@x.com', 'corrigir_email', 'ana@example.com', '2026-10-09 10:00:00'),
      ('paulo@x.com', 'cupom_criado', 'PASCOA', '2026-10-09 11:00:00');
    INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por) VALUES
      ('LOGO', 'percentual', 10, datetime('now', '+30 days'), 100, 'a'),
      ('QUASE', 'percentual', 10, '2099-01-01 02:59:59', 5, 'a'),
      ('LONGE', 'percentual', 10, '2099-01-01 02:59:59', 100, 'a');
    UPDATE compras SET cupom = 'QUASE' WHERE id IN (1, 2, 3, 4);
    INSERT INTO whatsapp_mensagens (telefone, direcao, texto, criado_em) VALUES
      ('27999990001', 'entrada', 'oi', datetime('now', '-1 hours')),
      ('27999990002', 'entrada', 'oi', datetime('now', '-3 hours')),
      ('27999990002', 'saida', 'olá', datetime('now', '-2 hours')),
      ('27999990009', 'entrada', 'velha', datetime('now', '-30 hours'));
    INSERT INTO equipe (email, criado_por, precisa_trocar_senha) VALUES ('novo@x.com', 'm', 1);
    UPDATE whatsapp_estado SET estado = 'pausado', modelo_status = 'APPROVED' WHERE id = 1;
  `)
  return { b, db: new D1Local(b) }
}

const outubro = validarPeriodo('2026-10-01', '2026-10-31')

test('datas: período anterior com o mesmo tamanho e início do dia de Brasília', () => {
  const p = periodoAnterior('2026-10-08', '2026-10-14')
  assert.equal(p.de, '2026-10-01')
  assert.equal(p.ate, '2026-10-07')
  assert.equal(p.dias, 7)
  assert.equal(periodoAnterior('2026-10-01', '2026-10-31').de, '2026-08-31')
  assert.equal(periodoAnterior('x', 'y'), null)
  assert.equal(inicioDoDiaBrasilia(new Date('2026-10-22T02:59:00Z')), '2026-10-21 03:00:00')
  assert.equal(inicioDoDiaBrasilia(new Date('2026-10-22T03:00:00Z')), '2026-10-22 03:00:00')
})

test('lib/cota.js e datas.js calculam o mesmo início do dia', () => {
  const cota = readFileSync('lib/cota.js', 'utf8')
  assert.match(cota, /3 \* 3600000/)
  assert.match(cota, /dia \+ ' 03:00:00'/)
})

test('rotuloFonte e agruparFontes dão nomes legíveis', () => {
  assert.equal(rotuloFonte('ig'), 'Instagram/Meta')
  assert.equal(rotuloFonte('Facebook'), 'Instagram/Meta')
  assert.equal(rotuloFonte('google'), 'Google')
  assert.equal(rotuloFonte('email', true, 'lead'), 'VS grátis')
  assert.equal(rotuloFonte('vs-gratis'), 'VS grátis')
  assert.equal(rotuloFonte(null, true), 'Direto')
  assert.equal(rotuloFonte('', false), 'Sem registro')
  assert.equal(rotuloFonte('chatgpt.com'), 'chatgpt.com')
  const grupos = agruparFontes([
    { utm_source: 'ig', registrado: 1, vendas: 2, centavos: 100 },
    { utm_source: 'fb', registrado: 1, vendas: 1, centavos: 50 },
    { utm_source: null, registrado: 0, vendas: 5, centavos: 10 },
  ])
  assert.deepEqual(grupos, [
    { fonte: 'Sem registro', vendas: 5, centavos: 10 },
    { fonte: 'Instagram/Meta', vendas: 3, centavos: 150 },
  ])
})

test('avisos: contadores, listas e membros só para o master, em um batch', async () => {
  const { b, db } = seed()
  const antes = db.lotes
  const master = await consultarAvisos(db, { master: true })
  assert.equal(db.lotes - antes, 1)
  // 27999990001 espera resposta; 27999990002 já foi respondida; a de 30 h está fora da janela.
  assert.equal(master.whatsapp_esperando, 1)
  assert.deepEqual(master.robo, { estado: 'pausado', modelo_status: 'APPROVED' })
  assert.equal(master.sem_senha_48h, 1)
  assert.equal(master.meta_falhou_30d, 1)
  assert.deepEqual(master.membros_sem_trocar, 1)
  assert.equal(master.cupons_vencendo.length, 0)
  assert.deepEqual(master.cupons_esgotando, [{ codigo: 'QUASE', usos: 4, limite: 5 }])
  assert.equal((await consultarAvisos(db, { master: false })).membros_sem_trocar, null)
  // A falha da Meta (mp_2) entra na janela de 30 dias qualquer que seja a data de hoje.
  b.exec("UPDATE compras SET criado_em = datetime('now', '-2 days') WHERE id = 2")
  assert.equal((await consultarAvisos(db, {})).meta_falhou_30d, 1)
  b.exec("UPDATE cupons SET valido_ate = datetime('now', '+3 days') WHERE codigo = 'LOGO'")
  assert.equal((await consultarAvisos(db, {})).cupons_vencendo[0].codigo, 'LOGO')
  b.close()
})

test('painel: números do período, anterior, fontes, últimas vendas e atividade em um batch', async () => {
  const { b, db } = seed()
  const antes = db.lotes
  const p = await consultarPainel(db, outubro, 'dia')
  assert.equal(db.lotes - antes, 1)
  assert.deepEqual(p.atual, {
    faturamento_centavos: 19700 + 19700 + 9900,
    vendas: 3,
    clientes: 3,
    clientes_novos: 2,
    ticket_centavos: Math.round(49300 / 3),
    carrinhos: 3,
    carrinhos_pagos: 2,
    recuperados: 1,
    conversao: 66.67,
  })
  assert.equal(p.anterior_de, '2026-08-31')
  assert.equal(p.anterior.vendas, 1)
  assert.equal(p.anterior.faturamento_centavos, 19700)
  assert.equal(p.anterior.clientes_novos, 1)
  assert.equal(p.anterior.carrinhos, 1)
  assert.equal(p.serie.length, 31)
  assert.equal(p.serie.reduce((t, d) => t + d.centavos, 0), 49300)
  assert.deepEqual(p.fontes.map((f) => [f.fonte, f.vendas]).sort(), [['Direto', 1], ['Instagram/Meta', 1], ['VS grátis', 1]])
  assert.equal(p.ultimas_vendas.length, 4)
  assert.equal(p.ultimas_vendas[0].cliente.email, 'caio@example.com')
  assert.equal(p.ultimas_vendas[0].fonte, 'VS grátis')
  assert.equal(p.atividade.length, 9)
  assert.ok(p.atividade.some((a) => a.tipo === 'equipe' && a.acao === 'cupom_criado'))
  assert.ok(p.atividade.some((a) => a.tipo === 'lead'))
  assert.ok(p.atividade.some((a) => a.tipo === 'recuperado' && a.email === 'ana@example.com'))
  assert.ok(p.atividade.every((a, i, l) => i === 0 || l[i - 1].em >= a.em))
  assert.equal(JSON.stringify(p).includes('9.9.9.9'), false)
  b.close()
})

test('busca: mínimo de 3 letras, escapa curingas, no máximo 8 e acha por celular', async () => {
  const { b, db } = seed()
  assert.equal(termoBusca('ab'), null)
  assert.deepEqual(await buscarPessoas(db, 'an'), { clientes: [], carrinhos: [], leads: [] })
  const ana = await buscarPessoas(db, 'ana@')
  assert.deepEqual(ana.clientes.map((c) => [c.id, c.situacao]), [[1, 'ativo']])
  assert.deepEqual(ana.carrinhos.map((c) => c.email), ['ana@example.com'])
  assert.equal((await buscarPessoas(db, '%%%')).clientes.length, 0)
  const bia = await buscarPessoas(db, '27999990002')
  assert.deepEqual(bia.clientes.map((c) => [c.email, c.situacao]), [['bia@example.com', 'sem_senha']])
  assert.equal(bia.carrinhos[0].situacao, 'pago')
  const maria = await buscarPessoas(db, '+55 27 99625-3839')
  assert.deepEqual(maria.leads, [{ email: 'maria@example.com', nome: 'Maria Souza', comprou: false }])
  // Carrinho de teste não aparece.
  assert.equal((await buscarPessoas(db, 'teste@example')).carrinhos.length, 0)
  for (let i = 0; i < 12; i += 1) {
    b.exec(`INSERT INTO clientes (email, nome) VALUES ('muitos${i}@ex.com', 'Muitos ${i}')`)
  }
  const muitos = await buscarPessoas(db, 'muitos')
  assert.equal(muitos.clientes.length + muitos.carrinhos.length + muitos.leads.length, 8)
  b.close()
})

test('detalhe do cliente: compras, downloads, carrinho, lead e histórico, sem IP nem token', async () => {
  const { b, db } = seed()
  assert.equal(idClienteValido('abc'), null)
  assert.equal(idClienteValido('0'), null)
  assert.equal(idClienteValido('7'), 7)
  assert.equal(await consultarClienteDetalhe(db, 999), null)
  const antes = db.lotes
  const d = await consultarClienteDetalhe(db, 1, { agora: AGORA })
  assert.equal(db.lotes - antes, 1)
  assert.equal(d.cliente.email, 'ana@example.com')
  assert.equal(d.cliente.tem_senha, true)
  assert.equal(d.cliente.telefone, '27999990001')
  assert.equal(d.cliente.ultimo_acesso, '2026-10-10T12:00:00Z')
  assert.equal(d.cliente.teste, true)
  assert.equal(d.compras.length, 2)
  assert.equal(d.compras[0].utm_source, 'ig')
  assert.equal(d.downloads.total, 3)
  assert.equal(d.downloads.hoje, 2)
  assert.equal(d.downloads.limite_dia, 30)
  assert.deepEqual(d.downloads.ultimos[0], { slug: 'musica-a', em: '2026-10-22T14:00:00Z' })
  assert.equal(d.carrinho.status, 'pago')
  assert.equal(d.carrinho.recuperado, true)
  assert.equal(d.carrinho.recuperado_pelo_canal, 'email')
  assert.equal(d.carrinho.recuperado_pela_etapa, 1)
  assert.equal(d.carrinho.emails_enviados, 1)
  assert.equal(d.lead, null)
  assert.deepEqual(d.historico.map((h) => h.acao), ['corrigir_email'])
  const caio = await consultarClienteDetalhe(db, 3, { agora: AGORA })
  assert.equal(caio.lead.comprou, true)
  assert.equal(caio.carrinho, null)
  // Nada de IP, agente ou token em nenhuma ficha.
  const texto = JSON.stringify([d, caio])
  assert.doesNotMatch(texto, /9\.9\.9\.9|8\.8\.8\.8|token|"ip"|agente/i)
  b.close()
})

test('campanhas: junta vendas, carrinhos e leads por fonte e campanha, com anúncios', async () => {
  const { b, db } = seed()
  const antes = db.lotes
  const c = await consultarCampanhas(db, outubro)
  assert.equal(db.lotes - antes, 1)
  const pascoa = c.linhas.find((l) => l.fonte === 'ig' && l.campanha === 'pascoa')
  assert.equal(pascoa.vendas, 1)
  assert.equal(pascoa.centavos, 19700)
  assert.equal(pascoa.leads, 1)
  assert.equal(pascoa.carrinhos, 2)
  assert.equal(pascoa.carrinhos_pagos, 1)
  assert.equal(pascoa.conversao, 50)
  assert.deepEqual(pascoa.anuncios.map((a) => [a.anuncio, a.carrinhos, a.vendas]).sort(), [['ad1', 1, 1], ['ad2', 1, 0]])
  const direto = c.linhas.find((l) => l.fonte === null && l.registrado)
  assert.equal(direto.vendas, 1)
  assert.equal(direto.carrinhos, 1)
  assert.equal(c.total.vendas, 3)
  assert.equal(c.total.centavos, 49300)
  assert.equal(c.total.leads, 2)
  assert.equal(c.total.carrinhos, 3)
  assert.equal(c.total.carrinhos_pagos, 2)
  b.close()
})

test('campanhas: carrinho sem rastro vira "sem registro" e não infla o direto', () => {
  const r = montarCampanhas({
    carrinhosCampanha: [
      { utm_source: null, utm_campaign: null, registrado: 0, carrinhos: 4, pagos: 0 },
      { utm_source: null, utm_campaign: null, registrado: 1, carrinhos: 1, pagos: 1 },
    ],
    totalCarrinhos: { carrinhos: 5, pagos: 1 },
  })
  assert.deepEqual(r.linhas.map((l) => [l.registrado, l.carrinhos]).sort(), [[false, 4], [true, 1]])
  assert.equal(r.total.carrinhos, 5)
})

test('downloads: totais, cota de hoje, série e rankings sem IP', async () => {
  const { b, db } = seed()
  const antes = db.lotes
  const d = await consultarDownloads(db, outubro, { agora: AGORA, limiteDia: 2 })
  assert.equal(db.lotes - antes, 1)
  assert.deepEqual(d.totais, { downloads: 4, clientes: 2, media: 2, na_cota_hoje: 1, limite_dia: 2 })
  assert.equal(d.serie.length, 31)
  assert.equal(d.serie.reduce((t, p) => t + p.downloads, 0), 4)
  assert.equal(d.serie.find((p) => p.chave === '2026-10-22').downloads, 3)
  assert.deepEqual(d.top_musicas, [
    { slug: 'musica-a', downloads: 3, clientes: 2 },
    { slug: 'musica-b', downloads: 1, clientes: 1 },
  ])
  assert.deepEqual(d.top_clientes.map((c) => [c.id, c.downloads, c.hoje]), [[1, 3, 2], [3, 1, 1]])
  assert.doesNotMatch(JSON.stringify(d), /9\.9\.9\.9|8\.8\.8\.8|"ip"/)
  const vazio = await consultarDownloads(db, validarPeriodo('2025-01-01', '2025-01-31'), { agora: AGORA })
  assert.equal(vazio.totais.downloads, 0)
  assert.equal(vazio.totais.media, 0)
  b.close()
})

test('todas as rotas novas usam soAdmin, 404 nos outros métodos e cabeçalhos privados', () => {
  for (const nome of ['avisos', 'painel', 'busca', 'clientes/detalhe', 'campanhas', 'downloads']) {
    const rota = readFileSync(`app/api/interno/gestao/${nome}/route.js`, 'utf8')
    assert.match(rota, /export const GET = soAdmin\(get\)/, nome)
    for (const metodo of ['HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.match(rota, new RegExp(`export const ${metodo} = naoEncontrado`), `${nome} ${metodo}`)
    }
    assert.match(rota, /cabecalhosPrivados/, nome)
    assert.match(rota, /dynamic = 'force-dynamic'/, nome)
  }
})
