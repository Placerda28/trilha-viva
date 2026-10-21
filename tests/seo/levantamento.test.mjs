import test from 'node:test'
import assert from 'node:assert/strict'
import { extractNames, channel, audioFiles, selectPilot } from '../../scripts/levantamento/nomes.mjs'

test('BPM e tom somente com evidência explícita e sem conflitos', () => {
  for (const [name, bpm, tom] of [
    ['Artista - Música - C# - 116bpm.zip', 116, 'C#'],
    ['Música - 72 BPM - Bb.wav', 72, 'Bb'],
    ['Música - F#m.zip', null, 'F#m'],
    ['Música - Lá menor.rar', null, 'Am'],
    ['Música key: Dm.wav', null, 'Dm'],
    ['Música - tom Fé.wav', null, null],
    ['Faixa - Dóm.wav', null, 'Cm'],
    ['A Banda - A Vida - 49bpm.zip', null, null],
    ['B Vocal - lead 201bpm.wav', null, null],
    ['Batida 172 e 72.wav', null, null],
  ]) assert.deepEqual(extractNames([name]), { bpm, tom, conflicts: [] })
  assert.equal(extractNames(['X - 72bpm', 'Y - 116bpm']).bpm, null)
  assert.equal(extractNames(['X - Am', 'Y - A']).tom, null)
  assert.equal(extractNames(['morada_x-guitars-F# minor-145bpm-440hz.wav']).tom, 'F#m')
  // ZIP diz F#, faixas dizem F# minor: conflito, tom fica vazio.
  assert.equal(extractNames(['Morada - X - F#.zip', 'morada_x-vocals-F# minor-145bpm-440hz.wav']).tom, null)
})

test('canais usam tokens inteiros e ignoram o título das pastas', () => {
  assert.equal(channel('Galileu/01 EG.wav'), 'Guitarra / Violão')
  assert.equal(channel('Pads/02 desconhecido.wav'), null)
  assert.equal(channel('03 backing vocal.wav'), 'Backing vocals')
  assert.equal(channel('04 violão.wav'), 'Guitarra / Violão')
  assert.equal(channel('El GT 2.wav'), 'Guitarra / Violão')
  assert.equal(channel('1CLICKS.wav'), 'Clique')
  assert.equal(channel('2GUIAS.wav'), 'Guia')
  assert.equal(channel('STRING.mp3'), 'Cordas')
  assert.equal(channel('Meia Lua-Ganza.mp3'), 'Percussão')
  assert.equal(channel('Loop1.mp3'), null)
  assert.equal(channel('CYMBALS.wav'), 'Bateria')
  assert.equal(channel('METRONOMO.mp3'), 'Clique')
  assert.equal(channel('ACPIANO_bip_137bpm.wav'), 'Teclado / Piano')
  assert.equal(channel('x-vocals-F# minor-145bpm-440hz.wav'), 'Vocal principal')
  for (const name of ['legado', 'batata', 'metalico', 'leader']) assert.equal(channel(`${name}.wav`), null)
  assert.deepEqual(audioFiles([{name:'__MACOSX/click.wav'}, {name:'x.txt'}, {name:'x/click.wav'}]).map(x=>x.name), ['x/click.wav'])
})

test('piloto reproduzível inclui vinte extras e pelo menos cinco RAR', () => {
  const map = Object.fromEntries(Array.from({length:40}, (_, i) => [`slug-${i}`, [`x.${i < 7 ? 'rar' : 'zip'}`]]))
  const a = selectPilot(map, ['fixo'])
  assert.deepEqual(a, selectPilot(map, ['fixo']))
  assert.equal(a.length, 21)
  assert.ok(a.filter(s => map[s]?.some(p => p.endsWith('.rar'))).length >= 5)
})

test('aliases de canais respeitam tokens e bip secundário', () => {
  const aliases = {
    'Backing vocals': 'bgv bgvs bv bvs backing backings coral coro choir alto soprano tenor gang',
    'Vocal principal': 'voz vozes',
    'Bateria': 'cx caixa hat hihat chimbal virada batera tom toms room rooms kick snare oh',
    'Clique': 'clic clik click bip',
    'Guitarra / Violão': 'ac acg acoustic nylon eg egt elec electric',
    'Baixo': 'synthbass sub',
    'Teclado / Piano': 'arp arps organ orgao wurli bell bells sinos',
    'Cordas': 'sting stings violin cello',
  }
  for (const [expected, words] of Object.entries(aliases)) {
    for (const word of words.split(' ')) assert.equal(channel(`01_${word}.wav`), expected, word)
  }
  assert.equal(channel('ac gt.wav'), 'Guitarra / Violão')
  assert.equal(channel('ACG_bip_137bpm.wav'), 'Guitarra / Violão')
  assert.equal(channel('01 Percussa\u0303o.wav'), 'Percussão')
  for (const word of ['loop', 'fx', 'efeitos', 'vocoder', 'stems', 'mix', 'full', 'bipolar', 'tomate', 'choralista']) {
    assert.equal(channel(`${word}.wav`), null, word)
  }
  for (const name of ['LOOP_bip_137bpm.wav', 'tom C.wav', 'tom: F#m.wav', 'Faixa - tom Lá menor.wav']) {
    assert.equal(channel(name), null, name)
  }
  assert.equal(channel('Piano - tom C.wav'), 'Teclado / Piano')
  for (const name of ['Vocoder lead.wav', 'Loop synth.wav', 'FX guitar.wav', 'Full vocal.wav', '02 loops drums.wav', 'efeito piano.wav', 'efeitos piano.wav', 'stems bass.wav', 'mix vocal.wav']) {
    assert.equal(channel(name), null, name)
  }
  assert.equal(channel('Piano loop.wav'), 'Teclado / Piano')
  assert.equal(channel('Minha música full - guitar.wav'), 'Guitarra / Violão')
  assert.equal(channel('tom.wav'), 'Bateria')
  assert.deepEqual(audioFiles([
    {name:'._click.wav'}, {name:'pasta/._voz.wav'}, {name:'pasta/__MACOSX/click.wav'},
    {name:'__MACOSX\\click.wav'}, {name:'pasta/._metadados/click.wav'}, {name:'ok.wav'},
  ]).map(e => e.name), ['ok.wav'])
})
