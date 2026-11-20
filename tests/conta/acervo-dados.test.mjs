import test from 'node:test'
import assert from 'node:assert/strict'
import { casaComFiltros, detalheDaMusica, faixaDoBpm, semAcento, sigla, tonsDoAcervo } from '../../components/conta/acervo-dados.js'

const v = (tom = '', bpm = '') => ({ tom, bpm, versao: '', tipo: 'Multitrack' })
const musica = (slug, title, artist, variantes, tambem = '') => ({ slug, title, artist, tambem, variantes })

const LISTA = [
  musica('a', 'A Casa É Sua', 'Casa Worship', [v('A', '72')]),
  musica('b', 'Jesus Filho de Deus', 'Fernandinho', [v('E', '130'), v('D', '128')]),
  musica('c', 'Estações', 'Dunamis Music', [v('Bm', '80')]),
  musica('d', 'Sem Dados', 'Fernandinho', [v()]),
]
const f = (extra = {}) => ({ busca: '', artista: '', tom: '', bpm: '', mostrar: 'todas', ...extra })
const slugs = (filtro, baixados = new Map()) => LISTA.filter((m) => casaComFiltros(m, filtro, baixados)).map((m) => m.slug)

test('faixas de BPM: 80 é "até 80", 110 é "80 a 110", 111 é "acima de 110"', () => {
  assert.deepEqual([72, 80, 81, 110, 111].map(faixaDoBpm), ['lento', 'lento', 'medio', 'medio', 'rapido'])
})

test('tons: de C a B, maior antes do menor', () => {
  assert.deepEqual(tonsDoAcervo(LISTA), ['D', 'E', 'A', 'Bm'])
})

test('filtros: artista, tom e BPM olham todas as versões; campo vazio não casa', () => {
  assert.deepEqual(slugs(f({ artista: 'Fernandinho' })), ['b', 'd'])
  assert.deepEqual(slugs(f({ tom: 'D' })), ['b'])
  assert.deepEqual(slugs(f({ bpm: 'rapido' })), ['b'])
  assert.deepEqual(slugs(f({ bpm: 'lento' })), ['a', 'c'])
  assert.deepEqual(slugs(f({ busca: semAcento('estacoes') })), ['c'])
})

test('mostrar: só as que já baixei e só as que ainda não baixei', () => {
  const baixados = new Map([['a', { slug: 'a' }]])
  assert.deepEqual(slugs(f({ mostrar: 'baixadas' }), baixados), ['a'])
  assert.deepEqual(slugs(f({ mostrar: 'novas' }), baixados), ['b', 'c', 'd'])
})

test('rótulos: campo sem dado não aparece', () => {
  assert.equal(detalheDaMusica(LISTA[0]), 'Tom A · 72 BPM')
  assert.equal(detalheDaMusica(LISTA[1]), '2 versões')
  assert.equal(detalheDaMusica(LISTA[3]), '')
  assert.equal(sigla('A Casa É Sua'), 'CS')
  assert.equal(sigla('1000 Graus'), 'G')
  assert.equal(sigla('10'), '10')
})
