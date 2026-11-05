// Peças comuns dos testes de segurança (Fase 11): módulos de rede falsos, sessões de verdade no D1 local
// (a Gestão usa adminPeloToken REAL) e um cenário com dois afiliados, A e B, cada um com dados pessoais distintos.
// Importe este arquivo ANTES de importar qualquer rota (o registerHooks tem que estar ligado).
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { novoDb, novoAfiliado } from './_base.mjs'
import { gravarComissaoBase } from '../../lib/afiliados/comissao.js'
import { pedirSaque } from '../../lib/afiliados/saque.js'
import { gravarComprovante, marcarPago } from '../../lib/afiliados/saques-gestao.js'
import { caminhoDoComprovante } from '../../lib/b2-envio.js'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export async function cookies() { return { get() { return globalThis.__token ? { value: globalThis.__token } : undefined } } }'),
  'next/navigation': modulo('export function notFound() { const e = new Error("404"); e.codigo = "NAO_ENCONTRADO"; throw e }'),
  '@/lib/d1': modulo('export const getDB = () => globalThis.__db; export const getEnv = () => ({})'),
  '@/lib/sessao': modulo(`export const clienteAtual = async () => globalThis.__cliente
    export const normalizarEmail = (v) => String(v || '').trim().toLowerCase()`),
  '@/lib/senhas': modulo("export const conferirSenha = async ({ senha }) => ({ ok: senha === 'senha-certa' })"),
  '@/lib/clientes': modulo(`export const podeTentar = async () => true
    export const anotarTentativa = async () => {}
    export const acharOuCriar = async () => null
    export const criarToken = async () => 't'`),
  '@/lib/email': modulo(`export const enviarSaqueSolicitado = async () => {}
    export const enviarBoasVindasAfiliado = async () => {}
    export const enviarContaAfiliado = async () => true
    export const emailConfigurado = () => true`),
  '@/lib/leads': modulo('export const verificarTurnstile = async () => null'),
  '@/lib/carrinhos': modulo(`export const limparTelefone = (v) => String(v || '').replace(/\\D/g, '')
    export const telefoneValido = (v) => String(v || '').replace(/\\D/g, '').length >= 10
    export const limparUtm = (o) => ({ source: o?.source || '', medium: o?.medium || '', campaign: o?.campaign || '', content: o?.content || '' })`),
  '@/lib/site': modulo("export const site = { url: 'https://trilhaviva.org', email: 'contato@trilhaviva.org' }"),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})

export const HOST = 'https://trilhaviva.org'
export const MASTER_EMAIL = 'master@t.com'
export const MEMBRO_EMAIL = 'membro@t.com'
process.env.ADMIN_MASTER = MASTER_EMAIL
Object.assign(process.env, {
  B2_KEY_ID: 'leitura', B2_APP_KEY: 'x', B2_COMPROVANTES_KEY_ID: 'escrita', B2_COMPROVANTES_APP_KEY: 'y',
  RESEND_API_KEY: 're_x', EMAIL_FROM: 'Trilha Viva <acesso@trilhaviva.org>', LEMBRETE_SEGREDO: 'segredo-de-teste',
})

export const CPF = { A: '52998224725', B: '11144477735' }
export const PIX = { A: 'pix.a@exemplo.com', B: 'pix.b@exemplo.com' }
export const COMPRADOR = 'comprador.secreto@exemplo.com'
export const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 10])

// B2 falso no fetch global. `rede.autorizacoes` guarda os pedidos de link de download.
export function redeFalsa() {
  const r = { autorizacoes: [], emails: [] }
  const ok = (corpo, status = 200) => ({ ok: status < 400, status, json: async () => corpo, text: async () => '' })
  globalThis.fetch = async (u, init = {}) => {
    if (u.includes('b2_authorize_account')) {
      return ok({ authorizationToken: 'TA', apiInfo: { storageApi: { apiUrl: 'https://api.b2.test', downloadUrl: 'https://dl.b2.test', bucketId: 'bkt' } } })
    }
    if (u.endsWith('/b2_get_upload_url')) return ok({ uploadUrl: 'https://up.b2.test/u', authorizationToken: 'TU' })
    if (u === 'https://up.b2.test/u') return ok({})
    if (u.endsWith('/b2_get_download_authorization')) {
      r.autorizacoes.push(JSON.parse(init.body))
      return ok({ authorizationToken: 'DL' })
    }
    if (u === 'https://api.resend.com/emails') {
      r.emails.push(JSON.parse(init.body))
      return ok({ id: 'e1' })
    }
    throw new Error('fetch inesperado ' + u)
  }
  return r
}

// Sessão de verdade: grava o hash do token como o login faz e devolve o token (o cookie falso o repassa).
export function sessaoDe(db, clienteId, token = `tok-${clienteId}-${Math.random()}`) {
  const hash = createHash('sha256').update(token).digest('hex')
  db.banco.prepare("INSERT INTO sessoes (cliente_id, token_hash, expira_em) VALUES (?, ?, datetime('now', '+1 day'))").run(clienteId, hash)
  return token
}
export function entrarComo(db, email) {
  const c = db.banco.prepare('SELECT id, email FROM clientes WHERE email = ?').get(email)
  globalThis.__cliente = { id: Number(c.id), email: c.email, bloqueado: 0 }
  globalThis.__token = sessaoDe(db, Number(c.id))
}
export function sair() {
  globalThis.__cliente = null
  globalThis.__token = null
}
export function criarCliente(db, email) {
  return Number(db.banco.prepare('INSERT INTO clientes (email, supabase_id) VALUES (?, ?) RETURNING id').get(email, `sb-${email}`).id)
}

let seq = 9000
function venda(db, af, comprador, quando) {
  seq += 1
  const c = db.banco
    .prepare("INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, afiliado_id, liquido_centavos) VALUES (?, ?, 8990, 'pago', ?, 8490) RETURNING id")
    .get(comprador, `mp_${seq}`, af.id)
  return gravarComissaoBase(db, { afiliadoId: af.id, compraId: Number(c.id), aprovadoEm: quando })
}

// A e B: 2 vendas antigas, 1 saque PAGO cada (com comprovante válido), e mais 2 vendas com saldo livre.
export async function cenario() {
  const db = novoDb()
  globalThis.__db = db
  const comprador = criarCliente(db, COMPRADOR)
  const base = new Date('2026-11-10T15:00:00Z')
  const depois = new Date('2026-11-25T15:00:00Z')
  const out = { db, comprador }
  for (const k of ['A', 'B']) {
    const af = novoAfiliado(db)
    db.banco.prepare('UPDATE afiliados SET cpf = ?, nome = ? WHERE id = ?').run(CPF[k], `Afiliado ${k}`, af.id)
    db.banco.prepare("UPDATE afiliados_pix SET tipo_chave = 'email', chave = ?, titular_nome = ?, titular_cpf = ? WHERE afiliado_id = ?").run(PIX[k], `Titular ${k}`, CPF[k], af.id)
    db.banco.prepare('UPDATE clientes SET supabase_id = ? WHERE id = ?').run(`sb-${k}`, af.clienteId)
    db.banco.prepare('UPDATE clientes SET email = ? WHERE id = ?').run(`afiliado.${k.toLowerCase()}@exemplo.com`, af.clienteId)
    await venda(db, af, comprador, base)
    await venda(db, af, comprador, base)
    const s = await pedirSaque(db, af.id, new Date('2026-11-20T15:00:00Z'))
    const caminho = caminhoDoComprovante(s.saqueId, 'pdf')
    await gravarComprovante(db, { saqueId: s.saqueId, caminho })
    await marcarPago(db, { saqueId: s.saqueId, quem: MASTER_EMAIL, agora: new Date('2026-11-21T15:00:00Z') })
    await venda(db, af, comprador, depois)
    await venda(db, af, comprador, depois)
    out[k] = { ...af, email: `afiliado.${k.toLowerCase()}@exemplo.com`, saqueId: Number(s.saqueId), caminho, codigo: db.banco.prepare('SELECT codigo FROM afiliados WHERE id = ?').get(af.id).codigo }
  }
  // Equipe: um membro (sem poder de master) e o master (pelo ADMIN_MASTER).
  criarCliente(db, MASTER_EMAIL)
  criarCliente(db, MEMBRO_EMAIL)
  db.banco.prepare("INSERT INTO equipe (email, criado_por, precisa_trocar_senha) VALUES (?, 'master@t.com', 0)").run(MEMBRO_EMAIL)
  return out
}

export const ctx = (id) => ({ params: Promise.resolve({ id: String(id) }) })
export const req = (metodo = 'GET', { corpo, origem = HOST, cab = {}, url = `${HOST}/api/x` } = {}) =>
  new Request(url, {
    method: metodo,
    headers: { host: 'trilhaviva.org', ...(origem ? { origin: origem } : {}), ...(corpo ? { 'content-type': 'application/json' } : {}), ...cab },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  })
export { novoDb }
