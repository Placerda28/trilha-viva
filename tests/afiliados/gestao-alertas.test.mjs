// Alertas de afiliados: cada um dispara com dados semeados e some quando a Gestão marca como resolvido.
// "Agora" = 30/11/2026 12:00 em Brasília (15:00 UTC).
import test from 'node:test'
import assert from 'node:assert/strict'
import { novoDb } from './_base.mjs'
import { AGORA } from './_cenario.mjs'
import { gravarComissaoBase } from '../../lib/afiliados/comissao.js'
import { fecharMes } from '../../lib/afiliados/fechamento.js'
import { calcularAlertas, resolverAlerta } from '../../lib/afiliados/gestao-alertas.js'
import { consultarAvisos } from '../../lib/gestao/avisos.js'

const DIA = 86400000
const utc = (d) => d.toISOString().slice(0, 19).replace('T', ' ')
const antes = (dias, base = AGORA) => new Date(base.getTime() - dias * DIA)

let seq = 100
function afiliado(db, { status = 'ativo', cpf, tel, pix, criado = '2026-09-01 12:00:00', nome } = {}) {
  seq += 1
  const cli = Number(db.banco.prepare('INSERT INTO clientes (email) VALUES (?) RETURNING id').get(`x${seq}@t.com`).id)
  const id = Number(
    db.banco
      .prepare('INSERT INTO afiliados (cliente_id, codigo, status, nome, cpf, telefone, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id')
      .get(cli, `ALE${seq}XX`, status, nome || `Pessoa ${seq}`, cpf || String(20000000000 + seq), tel || `27988${seq}000`, criado).id,
  )
  db.banco
    .prepare("INSERT INTO afiliados_pix (afiliado_id, tipo_chave, chave, titular_nome, titular_cpf) VALUES (?, 'email', ?, 'T', '00000000000')")
    .run(id, pix || `p${seq}@t.com`)
  return { id, clienteId: cli }
}

async function venda(db, af, quando, { estado } = {}) {
  seq += 1
  const compraId = Number(
    db.banco
      .prepare("INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, afiliado_id, criado_em) VALUES (?, ?, 7990, 'pago', ?, ?) RETURNING id")
      .get(af.clienteId, `mp_${seq}`, af.id, utc(quando)).id,
  )
  await gravarComissaoBase(db, { afiliadoId: af.id, compraId, aprovadoEm: quando })
  if (estado === 'cancelada') db.banco.prepare("UPDATE afiliados_lancamentos SET status = 'cancelada' WHERE compra_id = ? AND tipo = 'venda'").run(compraId)
  if (estado === 'estornada') {
    db.banco
      .prepare("INSERT INTO afiliados_lancamentos (afiliado_id, compra_id, tipo, mes_referencia, valor_centavos, status, criado_em) VALUES (?, ?, 'estorno', '2026-11', -1500, 'pendente', ?)")
      .run(af.id, compraId, utc(quando))
  }
  return compraId
}

const alertasDe = async (db, tipo, agora = AGORA) => (await calcularAlertas(db, agora)).alertas.filter((a) => a.tipo === tipo)

// Dispara, resolve e confere que sumiu e que não volta.
async function resolve(db, chave, agora = AGORA) {
  assert.deepEqual(await resolverAlerta(db, chave, 'master@t.com', agora), { ok: true })
  assert.ok(!(await calcularAlertas(db, agora)).alertas.some((a) => a.chave === chave), 'alerta resolvido voltou')
}

test('saque pendente há 3 dias ou mais (alta a partir de 7 dias)', async () => {
  const db = novoDb()
  const [a, b, c] = [afiliado(db), afiliado(db), afiliado(db)]
  const saque = (af, dias) =>
    Number(db.banco.prepare("INSERT INTO afiliados_saques (afiliado_id, chave, valor_centavos, status, pix_snapshot, pedido_em) VALUES (?, ?, 5000, 'solicitado', '{}', ?) RETURNING id")
      .get(af.id, `s${af.id}`, utc(antes(dias))).id)
  const s3 = saque(a, 3) // 3 dias exatos: já conta
  const s1 = saque(b, 1) // 1 dia: não conta
  const s8 = saque(c, 8)
  const r = await alertasDe(db, 'saque_atrasado')
  assert.deepEqual(r.map((x) => [x.chave, x.gravidade]).sort(), [[`saque_atrasado:${s3}`, 'media'], [`saque_atrasado:${s8}`, 'alta']].sort())
  assert.ok(r.every((x) => x.link === '/gestao/afiliados/saques'))
  assert.match(r.find((x) => x.chave === `saque_atrasado:${s8}`).texto, /espera há 8 dias por um saque de R\$ 50,00/)
  assert.ok(!r.some((x) => x.chave === `saque_atrasado:${s1}`))
  await resolve(db, `saque_atrasado:${s3}`)
  assert.equal((await alertasDe(db, 'saque_atrasado')).length, 1)
})

test('taxa de estorno acima de 20% com pelo menos 5 vendas', async () => {
  const db = novoDb()
  const a = afiliado(db) // 6 vendas, 2 canceladas = 33%: alerta
  const b = afiliado(db) // 5 vendas, 1 cancelada = 20% exatos: não passa de 20%
  const c = afiliado(db) // 4 vendas, todas canceladas: abaixo do mínimo de 5
  const e = afiliado(db) // 5 vendas, 2 estornadas depois do valor pronto = 40%: alerta
  const quando = antes(10)
  for (let i = 0; i < 6; i++) await venda(db, a, quando, { estado: i < 2 ? 'cancelada' : undefined })
  for (let i = 0; i < 5; i++) await venda(db, b, quando, { estado: i < 1 ? 'cancelada' : undefined })
  for (let i = 0; i < 4; i++) await venda(db, c, quando, { estado: 'cancelada' })
  for (let i = 0; i < 5; i++) await venda(db, e, quando, { estado: i < 2 ? 'estornada' : undefined })
  const r = await alertasDe(db, 'taxa_estorno')
  assert.deepEqual(r.map((x) => x.afiliado_id).sort(), [a.id, e.id].sort())
  assert.match(r.find((x) => x.afiliado_id === a.id).texto, /2 de 6 vendas dos últimos 90 dias foram reembolsadas \(33%\)/)
  await resolve(db, `taxa_estorno:${a.id}:2026-11`)
  assert.deepEqual((await alertasDe(db, 'taxa_estorno')).map((x) => x.afiliado_id), [e.id])
})

test('tentativas de usar o próprio código (só os últimos 30 dias)', async () => {
  const db = novoDb()
  const a = afiliado(db)
  const b = afiliado(db)
  const evento = (af, quando) => db.banco.prepare("INSERT INTO afiliados_eventos (afiliado_id, evento, criado_em) VALUES (?, 'codigo_recusado_proprio', ?)").run(af.id, utc(quando))
  evento(a, antes(2))
  evento(a, antes(1))
  evento(b, antes(60)) // antigo demais
  const r = await alertasDe(db, 'codigo_proprio')
  assert.equal(r.length, 1)
  assert.equal(r[0].chave, `codigo_proprio:${a.id}:2026-11`)
  assert.match(r[0].texto, /tentou usar o próprio código 2 vezes em 11\/2026/)
  await resolve(db, r[0].chave)
  assert.equal((await alertasDe(db, 'codigo_proprio')).length, 0)
})

test('pico de vendas: 5 ou mais em 1 hora', async () => {
  const db = novoDb()
  const a = afiliado(db)
  const b = afiliado(db)
  const base = new Date('2026-11-29T14:00:00Z')
  for (let i = 0; i < 6; i++) await venda(db, a, new Date(base.getTime() + i * 10 * 60000)) // 14:00 a 14:50
  for (const min of [0, 20, 40, 70, 90]) await venda(db, b, new Date(base.getTime() + min * 60000)) // no máximo 3 por hora
  const r = await alertasDe(db, 'pico_vendas')
  assert.equal(r.length, 1)
  assert.equal(r[0].chave, `pico_vendas:${a.id}:2026-11-29`)
  assert.match(r[0].texto, /teve 6 vendas em 1 hora no dia 29\/11/)
  await resolve(db, r[0].chave)
})

test('mesmo CPF, celular ou chave Pix em contas diferentes', async () => {
  const db = novoDb()
  const a = afiliado(db, { cpf: '99999999999' })
  const b = afiliado(db, { cpf: '99999999999' })
  const c = afiliado(db, { tel: '27911112222' })
  const d = afiliado(db, { tel: '27911112222' })
  const e = afiliado(db, { pix: 'igual@t.com' })
  const f = afiliado(db, { pix: 'igual@t.com' })
  afiliado(db) // sem nada repetido
  const r = await alertasDe(db, 'duplicado')
  assert.deepEqual(r.map((x) => x.chave).sort(), [`duplicado:celular:${c.id}-${d.id}`, `duplicado:cpf:${a.id}-${b.id}`, `duplicado:pix:${e.id}-${f.id}`].sort())
  assert.ok(r.every((x) => x.gravidade === 'alta'))
  assert.ok(!r.some((x) => /99999999999|igual@t\.com|27911112222/.test(x.texto)), 'o texto não pode mostrar CPF, celular nem chave Pix')
  await resolve(db, `duplicado:cpf:${a.id}-${b.id}`)
  assert.equal((await alertasDe(db, 'duplicado')).length, 2)
})

test('vendas concentradas nos 2 últimos dias do mês para subir de nível', async () => {
  const db = novoDb()
  const a = afiliado(db) // 20 vendas: 14 no começo e 6 nos 2 últimos dias (30%): sem elas seria Bronze
  const b = afiliado(db) // 20 vendas, só 2 nos 2 últimos dias (10%)
  const c = afiliado(db) // 10 vendas, 6 nos 2 últimos dias, mas continua Bronze: não subiu
  const cedo = new Date('2026-11-10T15:00:00Z')
  const tarde = [0, 3, 6, 9, 12, 18].map((h) => new Date(new Date('2026-11-29T12:00:00Z').getTime() + h * 3600000))
  for (let i = 0; i < 14; i++) await venda(db, a, cedo)
  for (const t of tarde) await venda(db, a, t)
  for (let i = 0; i < 18; i++) await venda(db, b, cedo)
  for (const t of tarde.slice(0, 2)) await venda(db, b, t)
  for (let i = 0; i < 4; i++) await venda(db, c, cedo)
  for (const t of tarde) await venda(db, c, t)
  const r = await alertasDe(db, 'fim_de_mes')
  assert.deepEqual(r.map((x) => x.chave), [`fim_mes:${a.id}:2026-11`])
  assert.match(r[0].texto, /chegou ao nível Prata em 11\/2026 com 6 de 20 vendas nos 2 últimos dias do mês/)
  await resolve(db, r[0].chave)
})

test('muitos cliques e zero vendas; ativos sem venda há 30 dias', async () => {
  const db = novoDb()
  const a = afiliado(db) // 50 cliques e nenhuma venda
  const b = afiliado(db) // 49 cliques
  const c = afiliado(db) // 50 cliques, mas vendeu
  const velho = afiliado(db, { criado: '2026-09-01 12:00:00' }) // ativo e nunca vendeu
  const novo = afiliado(db, { criado: '2026-11-20 12:00:00' }) // criado há 10 dias
  const suspenso = afiliado(db, { status: 'suspenso' })
  const clique = (af, n) => { for (let i = 0; i < n; i++) db.banco.prepare('INSERT INTO afiliados_cliques (afiliado_id, criado_em, visitante_hash) VALUES (?, ?, ?)').run(af.id, utc(antes(5)), `h${af.id}-${i}`) }
  clique(a, 50)
  clique(b, 49)
  clique(c, 50)
  await venda(db, c, antes(5))
  // quem vendeu há pouco e quem já vendeu antigo
  const r1 = await alertasDe(db, 'cliques_sem_venda')
  assert.deepEqual(r1.map((x) => x.afiliado_id), [a.id])
  assert.match(r1[0].texto, /teve 50 cliques em 30 dias e nenhuma venda/)
  const r2 = await alertasDe(db, 'ativo_sem_venda')
  const ids = r2.map((x) => x.afiliado_id)
  // a, b e velho: ativos sem venda (criados em setembro); c vendeu; novo é recente; suspenso não entra
  assert.ok(ids.includes(velho.id) && ids.includes(a.id) && ids.includes(b.id))
  assert.ok(!ids.includes(c.id) && !ids.includes(novo.id) && !ids.includes(suspenso.id))
  assert.ok(r2.every((x) => x.gravidade === 'baixa'))
  await resolve(db, r1[0].chave)
  await resolve(db, `ativo_sem_venda:${velho.id}:2026-11`)
})

test('fechamento do mês que não rodou: some quando o fechamento roda, com 1 dia de folga', async () => {
  const db = novoDb()
  const a = afiliado(db)
  const b = afiliado(db)
  await venda(db, a, new Date('2026-09-15T15:00:00Z'))
  await venda(db, b, new Date('2026-10-15T15:00:00Z'))
  await venda(db, b, new Date('2026-11-15T15:00:00Z')) // novembro nunca conta em 30/11
  const r = await alertasDe(db, 'fechamento_pendente')
  assert.deepEqual(r.map((x) => x.chave), ['fechamento_pendente:2026-09', 'fechamento_pendente:2026-10'])
  assert.match(r[0].texto, /O fechamento de 09\/2026 ainda não rodou para 1 afiliado/)
  assert.equal(r[0].link, '/gestao/afiliados/metas?mes=2026-09')
  // Dia 8 de novembro ainda não passou do dia de fechamento: outubro não alerta, setembro sim.
  const dia8 = await alertasDe(db, 'fechamento_pendente', new Date('2026-11-08T15:00:00Z'))
  assert.deepEqual(dia8.map((x) => x.chave), ['fechamento_pendente:2026-09'])
  const dia9 = await alertasDe(db, 'fechamento_pendente', new Date('2026-11-09T15:00:00Z'))
  assert.equal(dia9.length, 2)
  await fecharMes(db, '2026-09', AGORA)
  assert.deepEqual((await alertasDe(db, 'fechamento_pendente')).map((x) => x.chave), ['fechamento_pendente:2026-10'])
  await resolve(db, 'fechamento_pendente:2026-10')
})

test('resolver: chave inexistente ou inválida não grava nada', async () => {
  const db = novoDb()
  assert.deepEqual(await resolverAlerta(db, 'saque_atrasado:999', 'a@t.com', AGORA), { ok: false, motivo: 'nao_encontrado' })
  assert.deepEqual(await resolverAlerta(db, "x'; DROP TABLE afiliados;--", 'a@t.com', AGORA), { ok: false, motivo: 'invalida' })
  assert.equal(Number(db.banco.prepare('SELECT COUNT(*) AS n FROM afiliados_alertas_resolvidos').get().n), 0)
})

test('resolver duas vezes é seguro e guarda quem resolveu', async () => {
  const db = novoDb()
  const a = afiliado(db)
  db.banco.prepare("INSERT INTO afiliados_eventos (afiliado_id, evento, criado_em) VALUES (?, 'codigo_recusado_proprio', ?)").run(a.id, utc(antes(1)))
  const chave = `codigo_proprio:${a.id}:2026-11`
  assert.equal((await resolverAlerta(db, chave, 'Master@T.com', AGORA)).ok, true)
  assert.equal((await resolverAlerta(db, chave, 'outro@t.com', AGORA)).ok, false) // já resolvido: não está mais aberto
  const linha = db.banco.prepare('SELECT * FROM afiliados_alertas_resolvidos').get()
  assert.equal(linha.resolvido_por, 'Master@T.com')
})

test('contador do menu (afiliados_alertas) bate com os 3 alertas baratos e cai ao resolver', async () => {
  const db = novoDb()
  const a = afiliado(db)
  const b = afiliado(db)
  const id = Number(db.banco.prepare("INSERT INTO afiliados_saques (afiliado_id, chave, valor_centavos, status, pix_snapshot, pedido_em) VALUES (?, 's', 5000, 'solicitado', '{}', ?) RETURNING id").get(a.id, utc(antes(5))).id)
  db.banco.prepare("INSERT INTO afiliados_eventos (afiliado_id, evento, criado_em) VALUES (?, 'codigo_recusado_proprio', ?)").run(b.id, utc(antes(1)))
  db.banco.prepare("INSERT INTO afiliados_eventos (afiliado_id, evento, criado_em) VALUES (?, 'codigo_recusado_proprio', ?)").run(b.id, utc(antes(2)))
  await venda(db, a, new Date('2026-09-15T15:00:00Z'))
  await venda(db, a, new Date('2026-10-15T15:00:00Z'))
  // saque atrasado (1) + código próprio de b em novembro (1) + fechamento de setembro e outubro (2) = 4
  assert.equal((await consultarAvisos(db, { agora: AGORA })).afiliados_alertas, 4)
  const todos = (await calcularAlertas(db, AGORA)).alertas.filter((x) => ['saque_atrasado', 'codigo_proprio', 'fechamento_pendente'].includes(x.tipo))
  assert.equal(todos.length, 4)
  await resolve(db, `saque_atrasado:${id}`)
  await resolve(db, 'fechamento_pendente:2026-09')
  assert.equal((await consultarAvisos(db, { agora: AGORA })).afiliados_alertas, 2)
})
