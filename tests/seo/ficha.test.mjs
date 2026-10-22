import test from 'node:test'
import assert from 'node:assert/strict'
import { gerarDados, gerarModulo } from '../../scripts/levantamento/gerar-ficha.mjs'
import { survey } from '../../scripts/levantamento/rodar.mjs'

test('levantamento conta faixas reconhecidas, não canais únicos, e ignora arquivos auxiliares', async () => {
  const nomes = ['bass.flac', 'bass 2.flac', 'click.flac', 'desconhecido.flac', '._bass.flac', 'notas.txt']
  const entradas = nomes.map(nome => {
    const texto = Buffer.from(nome), central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50)
    central.writeUInt16LE(texto.length, 28)
    return Buffer.concat([central, texto])
  })
  const indice = Buffer.concat(entradas), fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50)
  fim.writeUInt16LE(nomes.length, 8)
  fim.writeUInt16LE(nomes.length, 10)
  fim.writeUInt32LE(indice.length, 12)
  const zip = Buffer.concat([indice, fim])
  const { result } = await survey({ size: zip.length, read: async (inicio, tamanho) => zip.subarray(inicio, inicio + tamanho) }, 'musica.zip')
  assert.equal(result.qtd_arquivos, 4)
  assert.equal(result.qtd_reconhecidos, 3)
  assert.deepEqual(result.canais, ['Baixo', 'Clique'])
})

async function ficha(arquivos = [], pesquisa = {}, tipo = 'Multitrack') {
  const dados = gerarDados({ musica: { arquivos } }, { musica: pesquisa }, [{ slug: 'musica', tipo }])
  const modulo = await import('data:text/javascript;base64,' + Buffer.from(gerarModulo(dados)).toString('base64'))
  return modulo.getFicha('musica')
}

test('principal prioriza presença de BPM, tom, canais e duração, mantendo o primeiro empate', async () => {
  const arquivos = [
    { tom: 'D', canais: ['Baixo'], duracao_seg: 100 },
    { bpm: 74, duracao_seg: 200 },
    { bpm: 75, tom: 'C', duracao_seg: 300 },
    { bpm: 76, tom: 'E', canais: ['Baixo'] },
    { bpm: 77, tom: 'F', canais: ['Clique'], duracao_seg: 400.6, qtd_arquivos: 5, qtd_reconhecidos: 4 },
    { bpm: 78, tom: 'G', canais: ['Bateria'], duracao_seg: 500 },
  ]
  assert.deepEqual(await ficha(arquivos), { bpm: 77, tom: 'F', compasso: null, duracaoSeg: 401,
    canais: ['Clique'], fonteBpm: 'arquivo', fonteTom: 'arquivo' })
})

test('preenche tom pelo primeiro outro arquivo antes da pesquisa', async () => {
  const f = await ficha([{ bpm: 74.2 }, { tom: 'C', duracao_seg: 200 }, { tom: 'D' }], { tom: 'E', fonte: 'multitracks', duracao_seg: 999 })
  assert.equal(f.bpm, 74)
  assert.equal(f.tom, 'C')
  assert.equal(f.fonteTom, 'arquivo')
  assert.equal(f.duracaoSeg, null)
})

test('BPM de outro arquivo vence pesquisa e passa a definir o principal', async () => {
  const f = await ficha([{ tom: 'C' }, { bpm: 80, duracao_seg: 123 }, { bpm: 90 }], { bpm: 100, fonte: 'pesquisa' })
  assert.equal(f.bpm, 80)
  assert.equal(f.fonteBpm, 'arquivo')
  assert.equal(f.tom, 'C')
  assert.equal(f.duracaoSeg, 123)
})

test('pesquisa preenche ausências; compasso só do MultiTracks e duração nunca da pesquisa', async () => {
  for (const fonte of ['multitracks', 'pesquisa']) {
    assert.deepEqual(await ficha([], { bpm: 67.5, tom: 'Am', compasso: '6/8', duracao_seg: 999, fonte }),
      { bpm: 68, tom: 'Am', compasso: fonte === 'multitracks' ? '6/8' : null,
        duracaoSeg: null, canais: null, fonteBpm: fonte, fonteTom: fonte })
  }
  assert.equal(await ficha([], { duracao_seg: 999, fonte: 'multitracks' }), null)
})

test('BPM da pesquisa fora de 50 a 200 não entra (MultiTracks conta colcheias em 12/8)', async () => {
  assert.equal((await ficha([], { bpm: 219, tom: 'A', compasso: '12/8', fonte: 'multitracks' })).bpm, null)
  assert.equal((await ficha([], { bpm: 49, tom: 'A', fonte: 'multitracks' })).bpm, null)
  assert.equal((await ficha([], { bpm: 200, fonte: 'multitracks' })).bpm, 200)
})

test('canais exigem 80%, seguem ordem fixa e nunca aparecem em VS MP3', async () => {
  const a = { bpm: 70, canais: ['Efeitos', 'Baixo', 'Clique', 'Baixo'], qtd_arquivos: 10, qtd_reconhecidos: 8 }
  assert.deepEqual((await ficha([a])).canais, ['Clique', 'Baixo', 'Efeitos'])
  for (const qtd_reconhecidos of [7, null, undefined]) {
    assert.equal((await ficha([{ ...a, qtd_reconhecidos }])).canais, null)
  }
  assert.equal((await ficha([{ ...a, qtd_arquivos: 0 }])).canais, null)
  assert.equal((await ficha([a], {}, 'VS MP3')).canais, null)
})

test('módulo preserva crase, barra invertida e interpolação como texto', async () => {
  const tom = '`' + String.fromCharCode(92) + '${process.exit(1)}'
  assert.equal((await ficha([{ tom }])).tom, tom)
  assert.equal(await ficha(), null)
})

test('ficha gerada contém Dono da Minha Afeição e registra tempo de importação', async t => {
  const inicio = performance.now()
  const { getFicha } = await import('../../lib/ficha.js')
  t.diagnostic(`Importação de lib/ficha.js: ${(performance.now() - inicio).toFixed(3)} ms (meta: < 5 ms; informativo)`)
  const f = getFicha('dono-da-minha-afeicao-fhop-music')
  assert.equal(f.bpm, 74)
  assert.equal(f.tom, 'C')
  assert.equal(f.fonteBpm, 'arquivo')
  assert.equal(f.fonteTom, 'arquivo')
  assert.equal(getFicha('inexistente'), null)
  assert.equal(getFicha('toString'), null)
})
