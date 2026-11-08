// Pacote 3 da auditoria de segurança de 07/11/2026: anexo do WhatsApp sem
// tamanho anunciado (B15), link do B2 de 60 s (B10) e ?r= fora do endereço
// antes do Pixel (M1). O "chamar de novo" (M9) é testado em
// tests/recuperacao/whatsapp.test.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'

const modulo = (codigo) => 'data:text/javascript,' + encodeURIComponent(codigo)
const falsos = {
  'next/server': modulo('export const NextResponse = Response'),
  'next/headers': modulo('export async function cookies() { return { get() { return { value: "t" } } } }'),
  'next/navigation': modulo('export function notFound() { const e = new Error("404"); e.codigo = "NAO_ENCONTRADO"; throw e }'),
  '@/lib/d1': modulo('export const getDB = () => globalThis.__db; export const getEnv = () => ({})'),
  '@/lib/gestao/sessao': modulo('export const adminPeloToken = async () => globalThis.__admin'),
}
registerHooks({
  resolve(nome, contexto, proximo) {
    if (falsos[nome]) return { shortCircuit: true, url: falsos[nome] }
    if (nome.startsWith('@/')) return { shortCircuit: true, url: pathToFileURL(resolve(nome.slice(2) + '.js')).href }
    return proximo(nome, contexto)
  },
})
const anexo = await import('../../app/api/interno/gestao/whatsapp/anexo/route.js')

test('anexo sem Content-Length dá 411 sem ler o corpo', async () => {
  globalThis.__admin = { papel: 'master', precisa_trocar_senha: false, cliente: { email: 'm@t.com' } }
  globalThis.__db = { prepare: () => assert.fail('não pode chegar ao banco') }
  const req = new Request('https://trilhaviva.org/api/gestao/whatsapp/anexo?telefone=27911110000&nome=a.pdf', {
    method: 'POST',
    headers: { host: 'trilhaviva.org', origin: 'https://trilhaviva.org', 'content-type': 'application/pdf' },
  })
  req.arrayBuffer = () => assert.fail('o corpo não pode ser lido sem Content-Length')
  const res = await anexo.POST(req)
  assert.equal(res.status, 411)
})

test('download do acervo pede ao B2 link de 60 segundos', () => {
  assert.match(readFileSync('app/api/baixar/route.js', 'utf8'), /linkDeDownload\(caminho, nome, 60\)/)
})

test('Pixel só carrega depois de tirar o ?r= do endereço; o formulário lê o carrinho da aba', () => {
  const pixel = readFileSync('components/MetaPixel.jsx', 'utf8')
  assert.match(pixel, /const fora = SEM_PIXEL\.includes\(pathname\) \|\| !limpo/)
  assert.match(pixel, /sessionStorage\.setItem\(CHAVE_CARRINHO, r\)/)
  assert.match(pixel, /url\.searchParams\.delete\('r'\)/)
  // sem sessionStorage, o endereço fica (senão o formulário perderia o carrinho)
  assert.match(pixel, /catch \{\s*return\s*\}\s*url\.searchParams\.delete/)
  const form = readFileSync('components/CheckoutForm.jsx', 'utf8')
  assert.match(form, /const carrinho = carrinhoDaVisita\(busca\)/)
})
