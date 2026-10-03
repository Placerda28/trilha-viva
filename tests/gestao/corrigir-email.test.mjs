import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'

// As rotas de verdade, com a sessão, o banco, a Supabase e o e-mail falsos.
const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo(`
    export const NextResponse = { json: (dados, init = {}) => Response.json(dados, init) }
  `),
  'next/navigation': modulo(`
    export function notFound() { throw Object.assign(new Error('404'), { codigo: 'NAO_ENCONTRADO' }) }
  `),
  'next/headers': modulo(`
    export async function cookies() { return { get() { return { value: 'token-de-teste' } } } }
  `),
  '@/lib/gestao/sessao': modulo(`
    export async function adminPeloToken() { return globalThis.__admin || null }
  `),
  '@/lib/d1': modulo(`
    export function getDB() { return globalThis.__db || null }
    export async function umaLinha(db, sql, ...v) { return db ? (await db.prepare(sql).bind(...v).first()) || null : null }
    export async function executar(db, sql, ...v) { return db ? db.prepare(sql).bind(...v).run() : null }
  `),
  '@/lib/senhas': modulo(`
    export async function trocarEmailConta(p) { (globalThis.__contas ||= []).push(p); return globalThis.__contaResposta || { ok: true } }
  `),
  '@/lib/email': modulo(`
    export async function enviarCriarSenha(p) { (globalThis.__emails ||= []).push({ tipo: 'criar', ...p }); return globalThis.__emailOk ?? true }
    export async function enviarRecuperarSenha(p) { (globalThis.__emails ||= []).push({ tipo: 'recuperar', ...p }); return globalThis.__emailOk ?? true }
  `),
  '@/lib/clientes': modulo(`
    export async function criarToken(p) { (globalThis.__tokens ||= []).push(p); return 'tok-' + globalThis.__tokens.length }
  `),
}

registerHooks({
  resolve(especificador, contexto, proximo) {
    if (falsos[especificador]) return { shortCircuit: true, url: falsos[especificador] }
    if (especificador.startsWith('@/')) {
      return { shortCircuit: true, url: pathToFileURL(resolve(especificador.slice(2) + '.js')).href }
    }
    return proximo(especificador, contexto)
  },
})

const { corrigirEmailCliente, emailNovoValido, idClienteValido, reenviarAcesso } = await import('../../lib/gestao/corrigir-email.js')
const rotaEmail = await import('../../app/api/interno/gestao/clientes/email/route.js')
const rotaAcesso = await import('../../app/api/interno/gestao/clientes/acesso/route.js')

class D1Local {
  constructor(banco) {
    this.banco = banco
  }
  prepare(sql) {
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novos) {
        valores = novos
        return this
      },
      async all() {
        return { results: preparada.all(...valores) }
      },
      async first() {
        return preparada.get(...valores) || null
      },
      async run() {
        return { meta: { changes: Number(preparada.run(...valores).changes || 0) } }
      },
    }
  }
  async batch(gravacoes) {
    this.banco.exec('BEGIN')
    try {
      const r = []
      for (const g of gravacoes) r.push(await g.run())
      this.banco.exec('COMMIT')
      return r
    } catch (erro) {
      this.banco.exec('ROLLBACK')
      throw erro
    }
  }
}

function banco() {
  const b = new DatabaseSync(':memory:')
  for (const m of ['0000_esquema_atual', '0001_gestao_fase1', '0002_cupons', '0003_equipe', '0004_carrinhos']) {
    b.exec(readFileSync(`migrations/${m}.sql`, 'utf8'))
  }
  b.exec(`
    INSERT INTO clientes (id, email, nome, supabase_id) VALUES
      (1, 'rafa@gmail.comr', 'Rafael', NULL),
      (2, 'outro@example.com', 'Outro', NULL),
      (3, 'comsenha@example.com', 'Com Senha', 'sup-3'),
      (4, 'semcompra@example.com', 'Sem Compra', NULL);
    INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status) VALUES
      (1, 'mp_1', 8990, 'pago'), (2, 'mp_2', 8990, 'pago'), (3, 'mp_3', 8990, 'pago');
    INSERT INTO carrinhos (id, email, nome, telefone, status) VALUES
      ('k1', 'rafa@gmail.comr', 'Rafael', '71999990000', 'pago'),
      ('k2', 'outro@example.com', 'Outro', NULL, 'aberto');
    INSERT INTO descadastros (email) VALUES ('rafa@gmail.comr');
    INSERT INTO equipe (email, criado_por) VALUES ('membro@example.com', 'master@example.com');
  `)
  return b
}

const semConta = { trocarEmailConta: async () => assert.fail('não devia chamar a Supabase') }

test('validação: e-mail e id', () => {
  assert.equal(emailNovoValido('  Rafa@Gmail.com '), 'rafa@gmail.com')
  assert.equal(emailNovoValido('rafa@gmail'), null)
  assert.equal(emailNovoValido('a b@x.com'), null)
  assert.equal(idClienteValido('3'), 3)
  assert.equal(idClienteValido('0'), null)
  assert.equal(idClienteValido('1.5'), null)
})

test('corrigir: troca no cliente, nos carrinhos e no descadastro; compra continua ligada', async () => {
  const b = banco()
  const r = await corrigirEmailCliente(new D1Local(b), { clienteId: 1, novoEmail: 'rafa@gmail.com' }, semConta)
  assert.deepEqual(r, { ok: true, antigo: 'rafa@gmail.comr', novo: 'rafa@gmail.com', tem_senha: false })
  assert.equal(b.prepare(`SELECT email FROM clientes WHERE id = 1`).get().email, 'rafa@gmail.com')
  assert.equal(b.prepare(`SELECT email FROM carrinhos WHERE id = 'k1'`).get().email, 'rafa@gmail.com')
  assert.equal(b.prepare(`SELECT COUNT(*) AS n FROM descadastros WHERE email = 'rafa@gmail.com'`).get().n, 1)
  assert.equal(b.prepare(`SELECT c.email FROM compras p JOIN clientes c ON c.id = p.cliente_id WHERE p.stripe_session_id = 'mp_1'`).get().email, 'rafa@gmail.com')
  assert.equal(b.prepare(`SELECT email FROM carrinhos WHERE id = 'k2'`).get().email, 'outro@example.com', 'o dos outros não muda')
})

test('corrigir: e-mail de outro cliente, da equipe, o mesmo de agora ou cliente inexistente → recusa sem mudar nada', async () => {
  const b = banco()
  const db = new D1Local(b)
  const usado = await corrigirEmailCliente(db, { clienteId: 1, novoEmail: 'outro@example.com' }, semConta)
  assert.deepEqual([usado.ok, usado.status, usado.erro], [false, 409, 'Esse e-mail já pertence a outro cliente.'])
  assert.equal((await corrigirEmailCliente(db, { clienteId: 1, novoEmail: 'membro@example.com' }, semConta)).status, 409)
  assert.equal((await corrigirEmailCliente(db, { clienteId: 1, novoEmail: 'rafa@gmail.comr' }, semConta)).status, 400)
  const master = await corrigirEmailCliente(db, { clienteId: 2, novoEmail: 'x@example.com', protegidos: ['Outro@Example.com'] }, semConta)
  assert.deepEqual([master.status, master.erro], [409, 'Esse é o e-mail do administrador master e não muda por aqui.'])
  assert.equal((await corrigirEmailCliente(db, { clienteId: 99, novoEmail: 'x@example.com' }, semConta)).status, 404)
  assert.equal(b.prepare(`SELECT email FROM clientes WHERE id = 1`).get().email, 'rafa@gmail.comr')
  assert.equal(b.prepare(`SELECT email FROM carrinhos WHERE id = 'k1'`).get().email, 'rafa@gmail.comr')
})

test('corrigir: quem tem senha troca primeiro na Supabase; se ela recusar, nada muda no banco', async () => {
  const b = banco()
  const chamadas = []
  const ok = await corrigirEmailCliente(new D1Local(b), { clienteId: 3, novoEmail: 'novo@example.com' }, {
    trocarEmailConta: async (p) => { chamadas.push(p); return { ok: true } },
  })
  assert.equal(ok.tem_senha, true)
  assert.deepEqual(chamadas, [{ id: 'sup-3', email: 'novo@example.com' }])
  const b2 = banco()
  const recusa = await corrigirEmailCliente(new D1Local(b2), { clienteId: 3, novoEmail: 'novo@example.com' }, {
    trocarEmailConta: async () => ({ ok: false, jaExiste: true }),
  })
  assert.deepEqual([recusa.ok, recusa.status], [false, 409])
  assert.equal(b2.prepare(`SELECT email FROM clientes WHERE id = 3`).get().email, 'comsenha@example.com')
})

test('reenviar: sem senha → criar senha (7 dias); com senha → redefinir (24 h); sem compra ou e-mail falhou → erro', async () => {
  const db = new D1Local(banco())
  const tokens = []
  const emails = []
  const deps = {
    criarToken: async (p) => { tokens.push(p); return 'tok' },
    enviarCriarSenha: async (p) => { emails.push(['criar', p.para, p.nome]); return true },
    enviarRecuperarSenha: async (p) => { emails.push(['recuperar', p.para]); return true },
  }
  assert.deepEqual(await reenviarAcesso(db, 1, deps), { ok: true, para: 'rafa@gmail.comr', tipo: 'criar_senha' })
  assert.deepEqual(tokens[0], { clienteId: 1, tipo: 'criar_senha', horas: 168 })
  assert.deepEqual(await reenviarAcesso(db, 3, deps), { ok: true, para: 'comsenha@example.com', tipo: 'redefinir_senha' })
  assert.deepEqual(tokens[1], { clienteId: 3, tipo: 'recuperar', horas: 24 })
  assert.deepEqual(emails, [['criar', 'rafa@gmail.comr', 'Rafael'], ['recuperar', 'comsenha@example.com']])
  assert.equal((await reenviarAcesso(db, 4, deps)).status, 409, 'sem compra paga')
  assert.equal((await reenviarAcesso(db, 99, deps)).status, 404)
  const falhou = await reenviarAcesso(db, 1, { ...deps, enviarCriarSenha: async () => false })
  assert.deepEqual([falhou.ok, falhou.status], [false, 502])
})

// ------------------------------------------------------------ rotas ----

const pedido = (corpo, extras = {}) =>
  new Request('https://trilhaviva.org/api/gestao/clientes/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'trilhaviva.org', ...extras },
    body: JSON.stringify(corpo),
  })
const admin = { papel: 'master', precisa_trocar_senha: false, cliente: { id: 9, email: 'Master@Example.com' } }
const recusa404 = (chamar) => assert.rejects(async () => chamar(), (e) => e.codigo === 'NAO_ENCONTRADO')

test('rotas: quem não é admin (ou precisa trocar a senha) recebe 404 e nada muda', async () => {
  const b = banco()
  globalThis.__db = new D1Local(b)
  globalThis.__emails = []
  globalThis.__admin = null
  await recusa404(() => rotaEmail.POST(pedido({ id: 1, email: 'rafa@gmail.com' })))
  await recusa404(() => rotaAcesso.POST(pedido({ id: 1 })))
  globalThis.__admin = { ...admin, precisa_trocar_senha: true }
  await recusa404(() => rotaEmail.POST(pedido({ id: 1, email: 'rafa@gmail.com' })))
  await recusa404(() => rotaEmail.GET(pedido({})))
  assert.equal(b.prepare(`SELECT email FROM clientes WHERE id = 1`).get().email, 'rafa@gmail.comr')
  assert.equal(globalThis.__emails.length, 0)
})

test('rotas: admin corrige, fica no Registro com o antes e o depois, e reenvia o acesso', async () => {
  const b = banco()
  globalThis.__db = new D1Local(b)
  globalThis.__admin = admin
  globalThis.__emails = []
  globalThis.__tokens = []

  const r = await rotaEmail.POST(pedido({ id: 1, email: ' Rafa@Gmail.com ' }))
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { ok: true, email: 'rafa@gmail.com' })
  const reg = b.prepare(`SELECT quem, acao, alvo, detalhe FROM registro ORDER BY id DESC LIMIT 1`).get()
  assert.deepEqual({ ...reg, detalhe: JSON.parse(reg.detalhe) }, {
    quem: 'master@example.com',
    acao: 'cliente_email_corrigido',
    alvo: 'rafa@gmail.com',
    detalhe: { de: 'rafa@gmail.comr', para: 'rafa@gmail.com' },
  })

  const usado = await rotaEmail.POST(pedido({ id: 1, email: 'outro@example.com' }))
  assert.equal(usado.status, 409)
  assert.equal((await rotaEmail.POST(pedido({ id: 1, email: 'invalido' }))).status, 400)
  await recusa404(() => rotaEmail.POST(pedido({ id: 1, email: 'x@example.com' }, { origin: 'https://outro-site.com' })))

  const envio = await rotaAcesso.POST(pedido({ id: 1 }))
  assert.equal(envio.status, 200)
  assert.deepEqual(await envio.json(), { ok: true, para: 'rafa@gmail.com', tipo: 'criar_senha' })
  assert.deepEqual(globalThis.__emails.map((e) => [e.tipo, e.para]), [['criar', 'rafa@gmail.com']])
  assert.equal(b.prepare(`SELECT acao FROM registro ORDER BY id DESC LIMIT 1`).get().acao, 'acesso_reenviado')

  globalThis.__emailOk = false
  assert.equal((await rotaAcesso.POST(pedido({ id: 1 }))).status, 502)
  globalThis.__emailOk = true
})
