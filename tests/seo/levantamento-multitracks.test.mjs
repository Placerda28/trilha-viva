import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { normalizar, indexarSitemap, casar, parsePagina, consolidar, selecionar, mesclar, compararBpm, criarBaixador } from '../../scripts/levantamento/multitracks.mjs'

test('extrai os metadados do HTML real, sem confundir conteúdo de scripts', async () => {
  const html = await readFile(new URL('./fixtures/multitracks.html', import.meta.url), 'utf8')
  assert.deepEqual(parsePagina(html), { bpm: 70, tom: 'B', compasso: '6/8', duracao_seg: 451 })
  assert.equal(parsePagina(html.replace('70,00', '70,30')).bpm, 70)
  assert.equal(parsePagina(html.replace('70,00', '70,31')).bpm, 70.31)
  assert.equal(parsePagina('Key: F♯ minor BPM: 120 Time Sig: 4/4 Length: 3:09').tom, 'F#m')
  assert.equal(parsePagina('Key: B flat major BPM: 90').tom, 'Bb')
  assert.equal(parsePagina('<script>Key: C BPM: 100</script>').bpm, null)
})

test('casa acentos, entidades, percentuais e versões, mas rejeita título ou artista diferente', () => {
  assert.equal(normalizar('Ora%C3%A7%C3%A3o-d&amp;apos;Amor'), 'oracao d amor')
  assert.equal(normalizar('B&ecirc;n&ccedil;&atilde;o'), 'bencao')
  const urls = ['https://www.multitracks.com/songs/Jo%C3%A3o-Silva/Album/Ora%C3%A7%C3%A3o-(Live)/',
    'https://www.multitracks.com/songs/Jo%C3%A3o-Silva/Album/Ora%C3%A7%C3%A3o-(Live)/charts/']
  const index = indexarSitemap(urls.map(url => `<loc>${url}</loc>`).join(''))
  assert.equal(casar({ title: 'Oração (Ao Vivo)', artist: 'João Silva' }, index).length, 1)
  assert.equal(casar({ title: 'Oração', artist: 'João' }, index).length, 0)
  assert.equal(casar({ title: 'Oração', artist: 'João Silva e Banda' }, index).length, 1)
  assert.equal(casar({ title: 'Minha Oração', artist: 'João Silva' }, index).length, 0)
})

test('download respeita intervalo, Retry-After e cache em nova execução', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'tv-mt-teste-'))
  let tempo = 0, chamadas = 0
  const instantes = []
  const opcoes = { pasta, agora: () => tempo, dormir: async ms => { tempo += ms }, requisitar: async () => {
    instantes.push(tempo)
    chamadas++
    if (chamadas === 1) return new Response('', { status: 429, headers: { 'retry-after': '5' } })
    if (chamadas === 2) return new Response('', { status: 503 })
    return new Response('Key: B BPM: 70 Time Sig: 6/8 Length: 7:31')
  } }
  try {
    const baixador = criarBaixador(opcoes)
    await baixador.baixar('https://example.com/a')
    await baixador.baixar('https://example.com/b')
    assert.deepEqual(instantes, [0, 5000, 11000, 12500])
    assert.equal(baixador.baixadas, 2)
    const retomada = criarBaixador({ ...opcoes, requisitar: async () => { assert.fail('Cache não deveria acessar rede') } })
    assert.match(await retomada.baixar('https://example.com/a'), /BPM: 70/)
    assert.equal(retomada.baixadas, 0)
  } finally { await rm(pasta, { recursive: true, force: true }) }
})

test('maioria por álbum exige dois terços, sem duplicar votos do mesmo álbum', () => {
  const row = (album, bpm, tom) => ({ album, url: `https://example.com/${album}`, bpm, tom, compasso: '4/4', duracao_seg: 200 })
  assert.equal(consolidar([row('a', 70, 'B'), row('b', 70, 'B'), row('c', 140, 'C')]).bpm, 70)
  const empate = consolidar([row('a', 70, 'B'), row('b', 140, 'C')])
  assert.equal(empate.bpm, null)
  assert.equal(empate.tom, null)
  assert.match(empate.nota, /140/)
  assert.equal(consolidar([row('a', 70, 'B'), row('a', 70, 'B'), row('b', 140, 'C')]).bpm, null)
  assert.equal(consolidar([row('a', 70, 'B')]).tom, 'B')
})

test('seleção e mescla preservam arquivos e outras fontes; conferência tem semente fixa', () => {
  const catalog = ['a', 'b', 'c'].map(slug => ({ slug }))
  const levantamento = { a: { arquivos: [{ bpm: 80, tom: null }] }, b: { arquivos: [{ bpm: 90, tom: 'C' }] }, c: { arquivos: [{ bpm: 100, tom: 'D' }] } }
  const itens = selecionar(catalog, levantamento, 1)
  assert.deepEqual(itens, selecionar(catalog, levantamento, 1))
  assert.equal(itens.length, 2)
  const result = { bpm: 120, tom: 'Am', fonte: 'multitracks' }
  assert.equal(mesclar({}, itens[0], result).a.bpm, null)
  assert.equal(mesclar({}, itens[0], result).a.tom, 'Am')
  const existente = { a: { bpm: 81, tom: 'G', fonte: 'outra' } }
  assert.deepEqual(mesclar(existente, itens[0], result), existente)
  assert.deepEqual(mesclar({}, itens[1], result), {})
  assert.equal(compararBpm([140], 70), 'dobro')
  assert.equal(compararBpm([71], 70), 'sim')
})
