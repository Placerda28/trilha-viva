// emTempoFixo: a tarefa roda antes da resposta e, no Worker, a resposta
// leva sempre o tempo mínimo (auditoria B8, ajuste de 08/11/2026).
import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

const falso = 'data:text/javascript,' + encodeURIComponent(
  'export const getCloudflareContext = () => { if (!globalThis.__ctx) throw new Error("sem"); return { ctx: globalThis.__ctx } }'
)
registerHooks({
  resolve(nome, contexto, proximo) {
    if (nome === '@opennextjs/cloudflare') return { shortCircuit: true, url: falso }
    return proximo(nome, contexto)
  },
})
const { emTempoFixo } = await import('../../lib/tempo-fixo.js')

test('no Worker: tarefa termina antes de responder e o tempo mínimo é respeitado', async () => {
  globalThis.__ctx = {}
  let feito = false
  const inicio = Date.now()
  await emTempoFixo('t', async () => { feito = true }, 150)
  assert.equal(feito, true)
  assert.ok(Date.now() - inicio >= 140)
})

test('erro da tarefa não derruba a resposta', async () => {
  globalThis.__ctx = {}
  await emTempoFixo('t', async () => { throw new Error('falhou') }, 10)
})

test('fora do Worker não espera o tempo mínimo', async () => {
  globalThis.__ctx = null
  const inicio = Date.now()
  await emTempoFixo('t', async () => {}, 5000)
  assert.ok(Date.now() - inicio < 1000)
})
