import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import {
  CABECALHO_RECUPERACAO,
  consultarRecuperacao,
  consultarRecuperacaoCsv,
  filtroRecuperacaoValido,
  linhaRecuperacaoCsv,
} from '../../lib/gestao/recuperacao.js'
import { gerarCsv } from '../../lib/gestao/csv.js'

class D1Local {
  constructor(banco) {
    this.banco = banco
  }

  prepare(sql) {
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novosValores) {
        valores = novosValores
        return this
      },
      async all() {
        return { results: preparada.all(...valores) }
      },
      async first() {
        return preparada.get(...valores) || null
      },
    }
  }
}

function bancoGestao() {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0000_esquema_atual.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0004_carrinhos.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0005_recuperacao_v2.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0006_whatsapp.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0007_whatsapp_semanal.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0008_whatsapp_meta.sql', 'utf8'))
  return banco
}

function inserirCarrinho(banco, dados) {
  banco.prepare(`
    INSERT INTO carrinhos
      (id, email, nome, telefone, criado_em, status, email_enviado_em,
       whatsapp_enviado_em, whatsapp_falhou_em, pago_em, etapa_email,
       proximo_email_em, finalizado_em, finalizado_motivo, whatsapp_etapa,
       proximo_whatsapp_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dados.id,
    dados.email,
    dados.nome || null,
    dados.telefone || null,
    dados.criado_em,
    dados.status,
    dados.email_enviado_em || null,
    dados.whatsapp_enviado_em || null,
    dados.whatsapp_falhou_em || null,
    dados.pago_em || null,
    dados.etapa_email || 0,
    dados.proximo_email_em || null,
    dados.finalizado_em || null,
    dados.finalizado_motivo || null,
    dados.whatsapp_etapa || 0,
    dados.proximo_whatsapp_em || null
  )
}

function lembrar(banco, carrinhoId, etapa, enviadoEm, canal = 'email') {
  banco.prepare(`
    INSERT INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em)
    VALUES (?, ?, ?, ?)
  `).run(carrinhoId, canal, etapa, enviadoEm)
}

function preencherCenarios(banco) {
  inserirCarrinho(banco, {
    id: 'recuperado', email: 'recuperado@example.com', nome: '=Recuperado',
    telefone: '11987654321', criado_em: '2026-01-01 10:00:00', status: 'pago',
    email_enviado_em: '2026-01-01 11:00:00', pago_em: '2026-01-10 10:00:00',
    etapa_email: 2, finalizado_em: '2026-01-09 10:00:00', finalizado_motivo: 'sequencia',
  })
  lembrar(banco, 'recuperado', 1, '2026-01-01 11:00:00')
  lembrar(banco, 'recuperado', 2, '2026-01-08 11:00:00')
  // Mesmo e-mail, mas etapa menor e mais recente: não pode substituir o protocolo.
  inserirCarrinho(banco, {
    id: 'recuperado-novo', email: 'recuperado@example.com', nome: 'Outro',
    criado_em: '2026-01-12 10:00:00', status: 'ignorado', etapa_email: 0,
  })

  inserirCarrinho(banco, {
    id: 'sem-lembrete', email: 'semlembrete@example.com', nome: 'Comprou direto',
    criado_em: '2026-01-02 10:00:00', status: 'pago', pago_em: '2026-01-02 11:00:00',
  })
  inserirCarrinho(banco, {
    id: 'finalizado', email: 'finalizado@example.com', nome: 'Finalizado',
    criado_em: '2026-01-03 10:00:00', status: 'lembrado', etapa_email: 4,
    email_enviado_em: '2026-01-03 11:00:00', finalizado_em: '2026-03-20 10:00:00',
    finalizado_motivo: 'sequencia',
  })
  lembrar(banco, 'finalizado', 1, '2026-01-03 11:00:00')
  lembrar(banco, 'finalizado', 2, '2026-01-10 11:00:00')
  lembrar(banco, 'finalizado', 3, '2026-01-25 11:00:00')
  lembrar(banco, 'finalizado', 4, '2026-02-24 11:00:00')

  inserirCarrinho(banco, {
    id: 'andamento', email: 'andamento@example.com', nome: 'Em andamento',
    criado_em: '2026-01-04 10:00:00', status: 'lembrado', etapa_email: 1,
    email_enviado_em: '2026-01-04 11:00:00', proximo_email_em: '2026-01-11 11:00:00',
  })
  lembrar(banco, 'andamento', 1, '2026-01-04 11:00:00')
  inserirCarrinho(banco, {
    id: 'aguardando', email: 'aguardando@example.com', nome: 'Aguardando',
    criado_em: '2026-01-05 10:00:00', status: 'aberto',
  })
  inserirCarrinho(banco, {
    id: 'sem-envio', email: 'semenvio@example.com', nome: 'Sem envio',
    criado_em: '2026-01-06 10:00:00', status: 'ignorado',
  })

  banco.exec(`
    INSERT INTO clientes (email, nome) VALUES ('recuperado@example.com', 'Recuperado');
    INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, criado_em)
      VALUES (last_insert_rowid(), 'mp_recuperado', 8990, 'pago', '2026-01-10 10:00:00');
    INSERT INTO clientes (email, nome) VALUES ('semlembrete@example.com', 'Direto');
    INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, criado_em)
      VALUES (last_insert_rowid(), 'mp_direto', 8990, 'pago', '2026-01-02 11:00:00');
  `)
}

test('gestão respeita prioridade, escolhe uma linha por pessoa e calcula totais', async () => {
  const banco = bancoGestao()
  preencherCenarios(banco)
  const resultado = await consultarRecuperacao(new D1Local(banco), { filtro: 'todos', pagina: 1 })

  assert.deepEqual(resultado.totais, {
    pessoas: 5,
    andamento: 2,
    recuperados: 1,
    finalizados: 1,
    sem_envio: 1,
    comprou_sem_lembrete: 1,
    emails_enviados: 7,
    whatsapp_enviados: 0,
    whatsapp_ativo: false,
    taxa: 1 / 3,
    valor_recuperado_centavos: 8990,
  })
  assert.equal(resultado.itens.length, 5)
  // Quem pagou antes de qualquer lembrete não aparece em "Todos".
  assert.equal(resultado.itens.some((item) => item.situacao === "comprou_sem_lembrete"), false)
  assert.equal(resultado.temMais, false)

  const recuperado = resultado.itens.find((item) => item.email === 'recuperado@example.com')
  assert.equal(recuperado.nome, '=Recuperado')
  assert.equal(recuperado.situacao, 'recuperado')
  assert.equal(recuperado.recuperado_pela_etapa, 2)
  assert.equal(recuperado.recuperado_pelo_canal, 'email')
  assert.deepEqual(recuperado.emails.map((email) => email.etapa), [1, 2])
  assert.equal(recuperado.finalizado_motivo, 'sequencia')
  assert.equal(recuperado.proximo_email_em, null)
  assert.deepEqual(recuperado.whatsapp, {
    situacao: 'comprou',
    enviado_em: null,
    previsto_em: null,
  })

  const andamento = resultado.itens.find((item) => item.email === 'andamento@example.com')
  assert.equal(andamento.proxima_etapa, 2)
  assert.equal(andamento.proximo_email_em, '2026-01-11T11:00:00Z')
})

test('filtros e busca funcionam sem alterar os totais gerais', async () => {
  const banco = bancoGestao()
  preencherCenarios(banco)
  const db = new D1Local(banco)

  const andamento = await consultarRecuperacao(db, { filtro: 'andamento' })
  assert.deepEqual(andamento.itens.map((item) => item.situacao).sort(), ['aguardando', 'andamento'])
  assert.equal(andamento.totais.pessoas, 5)

  const recuperados = await consultarRecuperacao(db, { filtro: 'recuperados' })
  assert.deepEqual(recuperados.itens.map((item) => item.email), ['recuperado@example.com'])

  const buscaTelefone = await consultarRecuperacao(db, { busca: '9876' })
  assert.deepEqual(buscaTelefone.itens.map((item) => item.email), ['recuperado@example.com'])

  assert.equal(filtroRecuperacaoValido('todos'), 'todos')
  assert.equal(filtroRecuperacaoValido('invalido'), null)
})

test('CSV usa os mesmos dados, horário de Brasília e neutraliza fórmulas', async () => {
  const banco = bancoGestao()
  preencherCenarios(banco)
  const linhas = await consultarRecuperacaoCsv(new D1Local(banco), {
    filtro: 'recuperados',
    busca: 'recuperado',
  })
  assert.equal(linhas.length, 1)
  const linhaCsv = linhaRecuperacaoCsv(linhas[0])
  assert.deepEqual(linhaCsv, [
    '=Recuperado',
    'recuperado@example.com',
    '11987654321',
    '01/01/2026 07:00',
    'Recuperado',
    '01/01/2026 08:00',
    '08/01/2026 08:00',
    '',
    '',
    'Comprou antes',
    '10/01/2026 07:00',
    2,
    'email',
  ])
  assert.equal(CABECALHO_RECUPERACAO[10], 'Pago em')
  assert.match(gerarCsv(['Nome'], [[linhaCsv[0]]]), /'\=Recuperado/)
})

test('gestão mostra a mensagem única do WhatsApp: status da Meta, previsto em 3 h, desligado e recuperação', async () => {
  const banco = bancoGestao()
  const data = (modificador) =>
    banco.prepare("SELECT datetime('now', ?) AS valor").get(modificador).valor

  inserirCarrinho(banco, {
    id: 'lido', email: 'lido@example.com', telefone: '11999990000',
    criado_em: data('-10 hours'), status: 'pago', pago_em: data('-1 hour'),
    whatsapp_enviado_em: data('-6 hours'),
  })
  lembrar(banco, 'lido', 1, data('-6 hours'), 'whatsapp')
  banco.exec("UPDATE carrinhos SET whatsapp_status = 'read' WHERE id = 'lido'")
  inserirCarrinho(banco, {
    id: 'entregue', email: 'entregue@example.com', telefone: '11888880000',
    criado_em: data('-10 hours'), status: 'aberto', whatsapp_enviado_em: data('-6 hours'),
  })
  banco.exec("UPDATE carrinhos SET whatsapp_status = 'delivered' WHERE id = 'entregue'")
  inserirCarrinho(banco, { id: 'sem-celular', email: 'semcel@example.com', criado_em: data('-2 hours'), status: 'aberto' })
  inserirCarrinho(banco, {
    id: 'falhou', email: 'falhou@example.com', telefone: '11777770000',
    criado_em: data('-5 hours'), status: 'aberto', whatsapp_falhou_em: data('-1 hour'),
  })
  inserirCarrinho(banco, { id: 'previsto', email: 'previsto@example.com', telefone: '11666660000', criado_em: data('-1 hour'), status: 'aberto' })
  inserirCarrinho(banco, { id: 'fora', email: 'fora@example.com', telefone: '11555550000', criado_em: data('-80 hours'), status: 'aberto' })

  const ativo = await consultarRecuperacao(new D1Local(banco), { filtro: 'todos', whatsappAtivo: true })
  const w = new Map(ativo.itens.map((item) => [item.email, item]))
  assert.equal(w.get('lido@example.com').whatsapp.situacao, 'lido')
  assert.equal(w.get('lido@example.com').situacao, 'recuperado')
  assert.equal(w.get('lido@example.com').recuperado_pelo_canal, 'whatsapp')
  assert.equal(w.get('entregue@example.com').whatsapp.situacao, 'entregue')
  assert.equal(w.get('entregue@example.com').whatsapp.enviado_em, `${data('-6 hours').replace(' ', 'T')}Z`)
  assert.equal(w.get('semcel@example.com').whatsapp.situacao, 'sem_celular')
  assert.equal(w.get('falhou@example.com').whatsapp.situacao, 'falhou')
  assert.deepEqual(w.get('previsto@example.com').whatsapp, {
    situacao: 'previsto',
    enviado_em: null,
    previsto_em: `${data('+2 hours').replace(' ', 'T')}Z`,
  })
  assert.equal(w.get('fora@example.com').whatsapp.situacao, 'nao_enviado')

  const desligado = await consultarRecuperacao(new D1Local(banco), { filtro: 'todos', whatsappAtivo: false })
  const d = new Map(desligado.itens.map((item) => [item.email, item]))
  assert.equal(d.get('previsto@example.com').whatsapp.situacao, 'desligado')
  assert.equal(d.get('fora@example.com').whatsapp.situacao, 'desligado')
  assert.equal(d.get('entregue@example.com').whatsapp.situacao, 'entregue')
})

test('rotas novas ficam protegidas por soAdmin e devolvem cabeçalhos privados', () => {
  for (const arquivo of [
    'app/api/interno/gestao/recuperacao/route.js',
    'app/api/interno/gestao/recuperacao/csv/route.js',
  ]) {
    const rota = readFileSync(arquivo, 'utf8')
    assert.match(rota, /export const GET = soAdmin\(get\)/)
    assert.match(rota, /cabecalhosPrivados/)
    assert.match(rota, /export const POST = naoEncontrado/)
  }
})
