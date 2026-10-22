import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { faixaAtiva } from '../../lib/colecoes-datas.js'
import { songs } from '../../lib/catalog.js'

const colecoes = JSON.parse(readFileSync(new URL('../../data/colecoes.json', import.meta.url), 'utf8'))
const faixa = colecoes.natal.faixaHome

test('faixa de Natal aparece só de 01/11 a 25/12, no dia de Brasília', () => {
  assert.equal(faixaAtiva(faixa, new Date('2026-10-31T12:00:00-03:00')), false)
  assert.equal(faixaAtiva(faixa, new Date('2026-11-01T00:30:00-03:00')), true)
  assert.equal(faixaAtiva(faixa, new Date('2026-12-25T23:30:00-03:00')), true)
  assert.equal(faixaAtiva(faixa, new Date('2026-12-26T00:10:00-03:00')), false)
  // 26/12 01:00 em UTC ainda é 25/12 em Brasília.
  assert.equal(faixaAtiva(faixa, new Date('2026-12-26T01:00:00Z')), true)
  assert.equal(faixaAtiva(null, new Date()), false)
})

test('toda música das coleções existe no catálogo e o setlist sai da lista', () => {
  const slugs = new Set(songs.map((s) => s.slug))
  for (const [nome, c] of Object.entries(colecoes)) {
    for (const s of c.musicas) assert.ok(slugs.has(s), `${nome}: ${s}`)
    for (const item of c.setlist ?? []) assert.ok(c.musicas.includes(item.slug), `${nome} setlist: ${item.slug}`)
  }
})
