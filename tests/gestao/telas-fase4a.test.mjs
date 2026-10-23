import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const raiz = new URL('../../', import.meta.url)
const ler = (p) => readFileSync(new URL(p, raiz), 'utf8')

test('toda ação gravada tem tradução legível no Registro e na Atividade', () => {
  const registro = ler('components/gestao/Registro.jsx')
  const objeto = registro.match(/export const ACOES = (\{[\s\S]*?\n\})/)[1]
  const acoes = runInNewContext('(' + objeto + ')')
  const encontradas = new Set(['whatsapp_pausar', 'whatsapp_retomar', 'whatsapp_ligar', 'whatsapp_sequencia_parar', 'whatsapp_sequencia_retomar'])
  for (const pasta of ['lib', 'app/api']) {
    for (const arquivo of readdirSync(new URL(pasta + '/', raiz), { recursive: true })) {
      if (!arquivo.endsWith('.js')) continue
      const codigo = ler(pasta + '/' + arquivo)
      for (const chamada of codigo.matchAll(/(?:gravarRegistro|registrar)\(db,\s*\{([\s\S]*?)\}\)/g)) {
        const campo = chamada[1].match(/acao:\s*([^,\n}]+)/)?.[1] || ''
        for (const literal of campo.matchAll(/'([^']+)'/g)) {
          if (literal[1].includes('_')) encontradas.add(literal[1])
        }
      }
    }
  }
  assert.ok(encontradas.size >= 26)
  for (const acao of encontradas) {
    assert.equal(typeof acoes[acao], 'string', 'Sem tradução: ' + acao)
    assert.ok(!acoes[acao].includes('_'), 'Nome técnico: ' + acao)
  }
  assert.ok(!registro.includes('ACOES[r.acao] || r.acao'))
  assert.ok(!ler('components/gestao/Atividade.jsx').includes('ACOES[a.acao] || a.acao'))
})

test('endereço antigo de período preserva datas e ignora parâmetros estranhos', async () => {
  const codigo = ler('app/interno/gestao/periodo/page.js').replace(/import[^\n]+\n/, '').replace('export default ', '')
  const redirecionamentos = []
  const pagina = runInNewContext(codigo + '; PeriodoPage', { URLSearchParams, redirect: (url) => redirecionamentos.push(url) })
  await pagina({ searchParams: Promise.resolve({ de: '2026-10-01', ate: '2026-10-22', destino: 'https://example.com' }) })
  await pagina({ searchParams: Promise.resolve({}) })
  await pagina({ searchParams: Promise.resolve({ de: ['2026-10-01', '2026-10-02'] }) })
  assert.deepEqual(redirecionamentos, ['/gestao/vendas?de=2026-10-01&ate=2026-10-22', '/gestao/vendas', '/gestao/vendas'])
})
