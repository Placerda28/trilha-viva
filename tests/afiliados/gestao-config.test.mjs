import test from 'node:test'
import assert from 'node:assert/strict'
import { AVISO_CONFIG, dadosDaConfig, salvarConfig } from '../../lib/afiliados/gestao-config.js'
import { configuracao } from '../../lib/afiliados/niveis.js'
import { novoDb } from './_base.mjs'

const AGORA = new Date('2026-11-20T15:00:00Z')

test('config: lê os padrões da migração com o aviso dos meses fechados', async () => {
  const c = await dadosDaConfig(novoDb())
  assert.deepEqual(
    { ...c, atualizado_em: undefined },
    {
      dia_fechamento: 8, saque_minimo_centavos: 0,
      aprovacao_automatica: true, programa_aberto: true, atualizado_em: undefined, atualizado_por: null,
      aviso: 'Mudanças não alteram meses já fechados.',
    },
  )
  assert.equal(AVISO_CONFIG, 'Mudanças não alteram meses já fechados.')
})

test('config: grava só o que veio, guarda quem mudou e devolve o antes e o depois', async () => {
  const db = novoDb()
  const r = await salvarConfig(db, { dia_fechamento: 10, programa_aberto: false, saque_minimo_centavos: 5000 }, 'm@t.com', AGORA)
  assert.equal(r.ok, true)
  assert.deepEqual(r.mudou, { dia_fechamento: [8, 10], saque_minimo_centavos: [0, 5000], programa_aberto: [1, 0] })
  const c = await configuracao(db)
  assert.deepEqual([c.dia_fechamento, c.saque_minimo_centavos, c.programa_aberto, c.aprovacao_automatica], [10, 5000, 0, 1])
  assert.equal(c.atualizado_por, 'm@t.com')
  assert.equal(c.atualizado_em, '2026-11-20 15:00:00')
  // repetir o mesmo valor não muda nada
  assert.deepEqual((await salvarConfig(db, { dia_fechamento: 10 }, 'x@t.com', AGORA)).mudou, {})
  assert.equal((await configuracao(db)).atualizado_por, 'm@t.com')
})

test('config: limites e tipos inválidos são recusados sem gravar nada', async () => {
  const db = novoDb()
  const ruim = async (corpo) => {
    const r = await salvarConfig(db, corpo, 'm@t.com', AGORA)
    assert.equal(r.ok, false, JSON.stringify(corpo))
    return r
  }
  assert.equal((await ruim({ dia_fechamento: 0 })).campo, 'dia_fechamento')
  await ruim({ dia_fechamento: 29 })
  await ruim({ dia_fechamento: 7.5 })
  await ruim({ dia_fechamento: '8' })
  await ruim({ saque_minimo_centavos: -1 })
  await ruim({ saque_minimo_centavos: 1_000_001 })
  assert.equal((await ruim({ programa_aberto: 'sim' })).campo, 'programa_aberto')
  await ruim({ aprovacao_automatica: 0 })
  await ruim({}) // nada para mudar
  await ruim({ desconhecido: 1 })
  // um campo bom junto de um ruim não grava nem o bom
  await ruim({ saque_minimo_centavos: 3000, dia_fechamento: 40 })
  const c = await configuracao(db)
  assert.deepEqual([c.saque_minimo_centavos, c.dia_fechamento, c.atualizado_por], [0, 8, null])
  // limites aceitos
  assert.equal((await salvarConfig(db, { dia_fechamento: 1 }, 'm@t.com', AGORA)).ok, true)
  assert.equal((await salvarConfig(db, { dia_fechamento: 28, saque_minimo_centavos: 1_000_000 }, 'm@t.com', AGORA)).ok, true)
})

test('config: carência e intervalo de saque deixaram de valer (ignorados, colunas intactas, fora da leitura)', async () => {
  const db = novoDb()
  assert.equal(Object.hasOwn(await dadosDaConfig(db), 'carencia_dias'), false)
  assert.equal(Object.hasOwn(await dadosDaConfig(db), 'intervalo_saque_dias'), false)
  const r = await salvarConfig(db, { carencia_dias: 30, intervalo_saque_dias: 1 }, 'm@t.com', AGORA)
  assert.equal(r.ok, false) // nenhum campo válido
  const col = db.banco.prepare('SELECT carencia_dias c, intervalo_saque_dias i FROM afiliados_config').get()
  assert.deepEqual([col.c, col.i], [7, 15])
  const junto = await salvarConfig(db, { carencia_dias: 30, saque_minimo_centavos: 100 }, 'm@t.com', AGORA)
  assert.deepEqual([junto.ok, Object.keys(junto.mudou)], [true, ['saque_minimo_centavos']])
  assert.equal(db.banco.prepare('SELECT carencia_dias c FROM afiliados_config').get().c, 7)
})
