import test from 'node:test';
import assert from 'node:assert/strict';
import { wavInfo, decodeWav, detectBpm, resolveBpm, mp3Info } from '../../scripts/levantamento/audio.mjs';

function click(bpm, accented = false, timbre = false) {
  const sampleRate = 8000;
  const samples = new Float32Array(sampleRate * 85);
  for (let beat = 0, position = sampleRate; position < samples.length; beat++, position = Math.round(sampleRate + beat * 60 / bpm * sampleRate)) {
    const period = accented === true ? 4 : accented;
    const amplitude = !timbre && period && beat % period ? 0.25 : 0.9;
    const frequency = timbre && beat % period ? 0.2 : 1;
    for (let j = 0; j < 160 && position + j < samples.length; j++) samples[position + j] = amplitude * Math.exp(-j / 30) * Math.cos(j * frequency);
  }
  return { samples, sampleRate };
}

for (const bpm of [72, 116]) {
  for (const accented of [false, true]) test(`clique ${bpm} BPM, acentos ${accented}`, () => {
    const { samples, sampleRate } = click(bpm, accented);
    const result = detectBpm(samples, sampleRate);
    assert.equal(result.bpm, accented ? bpm : null, JSON.stringify(result));
    assert.ok(result.confidence >= 0.8);
    if (!accented) assert.ok(result.ambiguity.includes(bpm === 72 ? 144 : 58));
  });
}
test('subdivisão de 116 BPM mantém ambiguidade ao reduzir 232 pulsos/min', () => {
  const { samples, sampleRate } = click(232, true);
  const result = detectBpm(samples, sampleRate);
  assert.equal(result.bpm, null);
  assert.deepEqual(result.ambiguity, [58, 116]);
});
for (const timbre of [false, true]) test(`ataques alternados identificam subdivisão, timbre=${timbre}`, () => {
  const { samples, sampleRate } = click(232, 2, timbre);
  assert.equal(detectBpm(samples, sampleRate).bpm, 116);
});
test('timbre distinto a cada quatro ataques identifica compasso', () => {
  const { samples, sampleRate } = click(116, 4, true);
  const result = detectBpm(samples, sampleRate);
  assert.equal(result.bpm, 116);
  assert.equal(result.pattern, 4);
});
test('acentos que mudam de posição não escolhem andamento', () => {
  const { samples, sampleRate } = click(116);
  const interval = 60 / 116 * sampleRate;
  for (let beat = 0; sampleRate + beat * interval < samples.length; beat++) {
    if (beat % 7 !== 0) continue;
    const start = Math.round(sampleRate + beat * interval);
    for (let j = start; j < Math.min(start + 160, samples.length); j++) samples[j] *= 0.25;
  }
  assert.equal(detectBpm(samples, sampleRate).bpm, null);
});
test('meio BPM sugere dobro inteiro: 68,5 vira 137', () => {
  const { samples, sampleRate } = click(68.5);
  assert.equal(detectBpm(samples, sampleRate).bpm, 137);
});
test('nome desempata ambas as versões pelo candidato, sem copiar BPM', () => {
  for (const bpm of [68.5, 137]) {
    const { samples, sampleRate } = click(bpm);
    const result = resolveBpm(detectBpm(samples, sampleRate), [137]);
    assert.equal(result.bpm, 137);
    assert.equal(result.source, 'clique+nome');
  }
});
test('77 não confirma alternativas 144/72; nomes conflitantes não desempatarão', () => {
  const detected = { bpm: null, confidence: 1, ambiguity: [72, 144], candidates: [72, 144] };
  assert.equal(resolveBpm(detected, [77]).bpm, null);
  assert.equal(resolveBpm(detected, [72, 144]).bpm, null);
  assert.equal(resolveBpm(detected, [74]).bpm, 72);
});
test('arredonda apenas perto de inteiro e preserva decimal restante', () => {
  for (const [bpm, expected] of [[116.2, 116], [116.4, 116.4]]) {
    const { samples, sampleRate } = click(bpm, 4);
    assert.equal(detectBpm(samples, sampleRate).bpm, expected);
  }
});
test('silêncio, poucas batidas e intervalos irregulares não produzem BPM', () => {
  assert.equal(detectBpm(new Float32Array(8000 * 90), 8000).bpm, null);
  const { samples, sampleRate } = click(72);
  assert.equal(detectBpm(samples.subarray(0, 8000 * 10), sampleRate).bpm, null);
  const irregular = new Float32Array(8000 * 85);
  let t = 1000;
  for (let i = 0; t < irregular.length; i++) { irregular[t] = 1; t += 2500 + (i % 7) * 753; }
  assert.equal(detectBpm(irregular, 8000).bpm, null);
});

function wav(bits, format = 1) {
  const b = Buffer.alloc(44 + bits / 8 * 2);
  b.write('RIFF'); b.writeUInt32LE(36 + 48000 * bits / 8, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(format, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(48000, 24); b.writeUInt32LE(48000 * bits / 8, 28); b.writeUInt16LE(bits / 8, 32); b.writeUInt16LE(bits, 34);
  b.write('data', 36); b.writeUInt32LE(48000 * bits / 8, 40);
  if (format === 3) { b.writeFloatLE(0.5, 44); b.writeFloatLE(-0.5, 48); }
  else { b.writeIntLE(2 ** (bits - 2), 44, bits / 8); b.writeIntLE(-(2 ** (bits - 2)), 44 + bits / 8, bits / 8); }
  return b;
}
for (const [bits, format] of [[16, 1], [24, 1], [32, 1], [32, 3]]) test(`WAV parcial ${bits} bits formato ${format}`, () => {
  const b = wav(bits, format);
  assert.equal(wavInfo(b).duration, 1);
  assert.deepEqual([...decodeWav(b).samples], [0.5, -0.5]);
});
test('formatos inválidos não inventam duração', async () => {
  assert.equal(wavInfo(Buffer.from('invalid')), null);
  assert.equal(decodeWav(Buffer.from('invalid')), null);
  assert.equal(await mp3Info(Buffer.from('invalid'), 10000), null);
});
