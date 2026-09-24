import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

function modulo(codigo) {
  return 'data:text/javascript,' + encodeURIComponent(codigo)
}

const navegacao = modulo(`
  export function notFound() {
    const erro = new Error('404')
    erro.codigo = 'NAO_ENCONTRADO'
    throw erro
  }
`)
const headers = modulo(`
  export async function cookies() {
    return { get() { return { value: 'token-de-teste' } } }
  }
`)
const d1 = modulo(`
  export function getDB() { return {} }
`)
const sessao = modulo(`
  export async function adminPeloToken() {
    globalThis.__consultasPermissao = (globalThis.__consultasPermissao || 0) + 1
    return globalThis.__adminPermissao || null
  }
`)

registerHooks({
  resolve(especificador, contexto, proximo) {
    if (especificador === 'next/navigation') return { shortCircuit: true, url: navegacao }
    if (especificador === 'next/headers') return { shortCircuit: true, url: headers }
    if (especificador === '@/lib/d1') return { shortCircuit: true, url: d1 }
    if (especificador === '@/lib/gestao/sessao') return { shortCircuit: true, url: sessao }
    return proximo(especificador, contexto)
  },
})

const { soAdmin, soAdminInclusive, soMaster } = await import('../../lib/gestao/permissao.js')

function admin(papel, precisaTrocar = false) {
  return {
    papel,
    precisa_trocar_senha: precisaTrocar,
    cliente: { id: 1, email: papel + '@example.com', nome: papel },
  }
}

async function recusada(rota) {
  await assert.rejects(() => rota({}), (erro) => erro.codigo === 'NAO_ENCONTRADO')
}

test('membro com troca obrigatória só passa no wrapper da senha', async () => {
  globalThis.__adminPermissao = admin('membro', true)
  globalThis.__consultasPermissao = 0
  let chamadas = 0
  const normal = soAdmin(async () => { chamadas += 1 })
  const senha = soAdminInclusive(async () => { chamadas += 1; return 'ok' })

  await recusada(normal)
  assert.equal(await senha({}), 'ok')
  assert.equal(chamadas, 1)
  assert.equal(globalThis.__consultasPermissao, 2)
})

test('somente master passa no wrapper das rotas de equipe', async () => {
  globalThis.__adminPermissao = admin('membro')
  await recusada(soMaster(async () => 'não'))

  globalThis.__adminPermissao = admin('master')
  assert.equal(await soMaster(async () => 'ok')({}), 'ok')
})

test('pedido sem administrador falha fechado com uma só leitura de sessão', async () => {
  globalThis.__adminPermissao = null
  globalThis.__consultasPermissao = 0
  await recusada(soAdmin(async () => 'não') )
  assert.equal(globalThis.__consultasPermissao, 1)
})
