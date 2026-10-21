import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { songs } from '../../lib/catalog.js'
import { carregarArtistas, resolver, resolverDetalhado, validarRedirects, conhecidos } from '../../scripts/achar-redirects.mjs'

const artistas = await carregarArtistas()
const mapa = JSON.parse(readFileSync(new URL('../../data/redirects.json', import.meta.url), 'utf8'))

test('todos os redirects saem de músicas removidas e chegam a páginas atuais', () => {
  validarRedirects(mapa, songs, artistas)
  assert.ok(Object.keys(mapa).length <= 400)
  assert.deepEqual(Object.keys(mapa), Object.keys(mapa).sort())
  for (const slug of conhecidos) assert.ok(Object.hasOwn(mapa, slug), slug)
})

test('comparação exata ignora acentos e pontuação; empate nunca escolhe música', () => {
  const atuais = [{ slug: 'nova', title: 'Canção!', artist: 'Banda' }]
  const bandas = [{ slug: 'banda', name: 'Banda' }]
  assert.equal(resolver([['velha', 'Cancao', 'Banda']], atuais, bandas), '/musicas/nova')
  assert.equal(resolver([['velha', 'Outro louvor', 'Banda']], atuais, bandas), '/artistas/banda')
  assert.equal(resolver([['velha', 'Cancao', 'Banda']], [...atuais, { ...atuais[0], slug: 'outra' }], bandas), '/artistas/banda')
  assert.equal(resolver([['velha', 'Canção', 'Outra banda']], atuais, bandas), '/musicas')
})

test('nível B limpa sufixos de tom, BPM, versão e palavras vazias', () => {
  for (const titulo of ['Faz Arder Bb Lr', 'Faz Arder C# 72bpm', 'Faz Arder G-Em Ao Vivo', 'Faz Arder Drive Onze', 'Faz Arder Inversões', 'Faz Arder 72.5 v2']) {
    const resultado = resolverDetalhado([['antiga', titulo, 'Bánda']], [{ slug: 'faz-arder', title: 'Faz Arder', artist: 'Banda', variantes: [{ bpm: '72.5' }] }], [])
    assert.equal(resultado.nivel, 'B', titulo)
    assert.equal(resultado.destino, '/musicas/faz-arder', titulo)
  }
  const resultado = resolverDetalhado([['antiga', 'Espírito Enche Minha Vida', 'Banda']], [{ slug: 'nova', title: 'Espírito, Enche a Minha Vida', artist: 'Banda' }], [])
  assert.equal(resultado.nivel, 'B')
  assert.equal(resolverDetalhado([['antiga', '1000 Graus Bit153', 'Banda']], [{ slug: 'nova', title: '1000 Graus', artist: 'Banda' }], []).nivel, 'B')
})

test('prioriza A, depois B; empate no nível mais forte não desce de nível', () => {
  const antigas = [['antiga', 'Vitorioso', 'Banda']]
  const prefixo = { slug: 'prefixo', title: 'Vitorioso És', artist: 'Banda' }
  const exata = { slug: 'exata', title: 'Vitorioso', artist: 'Banda' }
  assert.equal(resolverDetalhado(antigas, [prefixo, exata], []).destino, '/musicas/exata')
  const bandas = [{ slug: 'banda', name: 'Banda' }]
  const empate = resolverDetalhado(antigas, [exata, { ...exata, slug: 'duplicada' }, prefixo], bandas)
  assert.equal(empate.nivel, 'A')
  assert.equal(empate.destino, '/artistas/banda')
  assert.equal(empate.candidatos.length, 2)
})

test('prefixos são palavras completas; Jaccard aceita 0,6 e rejeita abaixo', () => {
  const buscar = (antigo, atual) => resolverDetalhado([['antiga', antigo, 'Banda']], [{ slug: 'nova', title: atual, artist: 'Banda' }], [])
  assert.equal(buscar('Vitorioso', 'Vitorioso És').nivel, 'C')
  assert.equal(buscar('Algo Novo Vindo', 'Algo Novo').nivel, 'C')
  assert.equal(buscar('Amor', 'Amoroso').nivel, 'SEM_MATCH')
  assert.equal(buscar('Luz Vida Paz Amor', 'Vida Paz Amor Céu').nivel, 'D')
  assert.equal(buscar('Luz Vida Paz', 'Vida Paz Céu').nivel, 'SEM_MATCH')
  assert.equal(buscar('a de um', 'a o para').nivel, 'SEM_MATCH')
  const empate = resolverDetalhado([['antiga', 'Vitorioso', 'Banda']], [
    { slug: 'um', title: 'Vitorioso És', artist: 'Banda' },
    { slug: 'dois', title: 'Vitorioso Rei', artist: 'Banda' },
  ], [{ slug: 'banda', name: 'Banda' }])
  assert.equal(empate.destino, '/artistas/banda')
  assert.equal(empate.nivel, 'C')
})

test('todos os níveis restringem candidatos ao mesmo artista e deduplicam versões históricas', () => {
  const antigas = [['antiga', 'Algo Novo Vindo', 'Banda'], ['antiga', 'Algo Novo Vindo!', 'Bánda']]
  const atual = { slug: 'nova', title: 'Algo Novo', artist: 'Banda' }
  assert.equal(resolverDetalhado(antigas, [atual], []).candidatos.length, 1)
  assert.equal(resolverDetalhado(antigas, [{ ...atual, artist: 'Outra Banda' }], []).nivel, 'SEM_MATCH')
})

test('rejeita origem atual, destino ausente e cadeia de redirects', () => {
  assert.throws(() => validarRedirects({ [songs[0].slug]: '/musicas' }, songs, artistas))
  assert.throws(() => validarRedirects({ antiga: '/musicas/inexistente' }, songs, artistas))
  assert.throws(() => validarRedirects({ antiga: '/artistas/inexistente' }, songs, artistas))
  assert.throws(() => validarRedirects({ antiga: '/musicas/outra', outra: '/musicas' }, songs, artistas))
})
