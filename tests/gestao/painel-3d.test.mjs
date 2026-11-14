import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { criarBanco, D1Local } from './_d1local.mjs'
import { validarPeriodo } from '../../lib/gestao/datas.js'
import { consultarPainel, serieDeTicket } from '../../lib/gestao/painel.js'
import { consultarAvisos } from '../../lib/gestao/avisos.js'

const ler = (caminho) => readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')

test('menu agrupa itens na ordem pedida e atalho mantém Pedidos', () => {
  const fonte = ler('components/gestao/BarraLateral.jsx')
  const menu = runInNewContext(fonte.slice(fonte.indexOf('export const MENU = '), fonte.indexOf('// O número do item:')).replace('export const', 'const') + '; MENU')
  assert.deepEqual(Array.from(menu, (g) => g.grupo), ['Visão geral', 'Vendas', 'Atendimento', 'Marketing', 'Acervo', 'Sistema'])
  assert.deepEqual(Array.from(menu[1].itens, (i) => i.rotulo), ['Pedidos', 'Clientes', 'Cupons', 'Carrinhos'])
  assert.deepEqual(Array.from(menu[2].itens, (i) => i.rotulo), ['WhatsApp', 'Instagram'])
  assert.deepEqual(Array.from(menu[3].itens, (i) => i.rotulo), ['Campanhas', 'Leads VS grátis', 'Afiliados'])
  assert.equal(menu[1].itens[0].href, '/gestao/vendas')
  assert.equal(menu[1].itens[0].icone, 'vendas')
  assert.match(ler('components/gestao/NavCelular.jsx'), /const ATALHOS = \['painel', 'vendas', 'clientes', 'whatsapp'\]/)
})

test('série de ticket conserva o último valor nos dias sem compra', () => {
  assert.deepEqual(serieDeTicket([
    { compras: 0, centavos: 0 }, { compras: 2, centavos: 17981 },
    { compras: 0, centavos: 0 }, { compras: 1, centavos: 7990 },
    { compras: 0, centavos: 0 },
  ]), [0, 8991, 8991, 7990, 7990])
})

test('Kpi mostra pontos em pt-BR, sinal e limiar de zero', () => {
  const fonte = ler('components/gestao/Kpi.jsx')
  const recorte = fonte.slice(fonte.indexOf('const PERCENTUAL'), fonte.indexOf('// Cartão de número'))
    .replace('export function compararKpi', 'function compararKpi')
  const comparar = runInNewContext(recorte + '; compararKpi', { Intl, Math, Number })
  assert.equal(comparar(null, 7.53).texto, '7,5 p.p.')
  assert.equal(comparar(null, -7.53).negativa, true)
  assert.equal(comparar(null, 0.04).zero, true)
  assert.equal(comparar(null, null).sem, true)
})

test('Painel conta hoje, ontem e mês em Brasília no mesmo batch', async () => {
  const banco = criarBanco()
  banco.exec(`
    INSERT INTO clientes (id, email, nome) VALUES (501, 'a@exemplo.com', 'A');
    INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, criado_em) VALUES
      (501, 'agora_1', 1000, 'pago', '2026-11-12 02:59:59'),
      (501, 'agora_2', 2000, 'pago', '2026-11-12 03:00:00'),
      (501, 'agora_3', 3000, 'pago', '2026-11-13 02:59:59'),
      (501, 'agora_4', 4000, 'pago', '2026-11-13 03:00:00'),
      (501, 'agora_5', 5000, 'pago', '2026-11-13 12:00:00'),
      (501, 'agora_6', 6000, 'pendente', '2026-11-13 13:00:00');
  `)
  const db = new D1Local(banco)
  const painel = await consultarPainel(db, validarPeriodo('2026-10-15', '2026-11-13'), 'dia', new Date('2026-11-13T15:00:00Z'))
  assert.deepEqual(painel.agora, {
    hoje: { vendas: 2, centavos: 9000 },
    ontem: { vendas: 2, centavos: 5000 },
    mes: { vendas: 5, centavos: 15000 },
  })
  assert.equal(db.lotes, 1)
})

test('aviso conta cliente pago sem nenhum download após 48 h, dentro de 30 dias', async () => {
  const banco = criarBanco()
  banco.exec(`
    INSERT INTO clientes (id, email) VALUES (601, 'um@exemplo.com'), (602, 'dois@exemplo.com'), (603, 'tres@exemplo.com');
    INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, criado_em) VALUES
      (601, 'sem_1', 8990, 'pago', '2026-11-05 12:00:00'),
      (601, 'sem_2', 8990, 'pago', '2026-11-06 12:00:00'),
      (602, 'com_1', 8990, 'pago', '2026-11-05 12:00:00'),
      (603, 'novo_1', 8990, 'pago', '2026-11-12 12:00:00');
    INSERT INTO downloads (cliente_id, arquivo) VALUES (602, 'musica.zip');
  `)
  const avisos = await consultarAvisos(new D1Local(banco), { agora: new Date('2026-11-13T15:00:00Z') })
  assert.equal(avisos.sem_download, 1)
  const fonte = ler('components/gestao/Avisos.jsx')
  const recorte = fonte.slice(fonte.indexOf('function plural'), fonte.indexOf('// `estado`:')).replace('export function avisosDaApi', 'function avisosDaApi')
  const montar = runInNewContext(recorte + '; avisosDaApi', { Date, Math })
  const [aviso] = montar({ sem_download: 1 }, '2026-11-13T15:00:00Z')
  assert.equal(aviso.texto, '1 cliente comprou e ainda não baixou nada')
  assert.equal(aviso.href, '/gestao/clientes')
  assert.equal(montar({ sem_download: 2 }, '2026-11-13T15:00:00Z')[0].texto, '2 clientes compraram e ainda não baixaram nada')
})
