import { spawn } from 'node:child_process';

export function wavInfo(buffer) {
  if (buffer.length < 12 || !['RIFF', 'RF64'].includes(buffer.toString('ascii', 0, 4)) || buffer.toString('ascii', 8, 12) !== 'WAVE') return null;
  let format;
  let data64;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === 'ds64' && size >= 28 && start + 28 <= buffer.length) {
      const value = buffer.readBigUInt64LE(start + 8);
      if (value <= BigInt(Number.MAX_SAFE_INTEGER)) data64 = Number(value);
    }
    if (id === 'fmt ' && size >= 16 && start + 16 <= buffer.length) {
      let encoding = buffer.readUInt16LE(start);
      if (encoding === 65534 && size >= 40 && start + 40 <= buffer.length) encoding = buffer.readUInt16LE(start + 24);
      format = { encoding, channels: buffer.readUInt16LE(start + 2), sampleRate: buffer.readUInt32LE(start + 4), byteRate: buffer.readUInt32LE(start + 8), blockAlign: buffer.readUInt16LE(start + 12), bits: buffer.readUInt16LE(start + 14) };
    }
    if (id === 'data' && format) {
      const dataSize = size === 0xffffffff ? data64 : size;
      if (!format.byteRate || !format.sampleRate || !format.channels || !format.blockAlign || dataSize == null) return null;
      return { ...format, dataOffset: start, dataSize, duration: dataSize / format.byteRate };
    }
    offset = start + size + size % 2;
  }
  return null;
}

export function decodeWav(buffer, maxSeconds = 90) {
  const info = wavInfo(buffer);
  if (!info || !(info.encoding === 1 && [16, 24, 32].includes(info.bits) || info.encoding === 3 && [32, 64].includes(info.bits))) return null;
  const bytes = info.bits / 8;
  if (info.blockAlign !== bytes * info.channels) return null;
  const count = Math.max(0, Math.min(Math.floor(Math.min(info.dataSize, buffer.length - info.dataOffset) / info.blockAlign), Math.floor(maxSeconds * info.sampleRate)));
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Preserva o canal mais forte: cliques estéreo podem ter polaridades opostas.
    let value = 0;
    for (let channel = 0; channel < info.channels; channel++) {
      const offset = info.dataOffset + i * info.blockAlign + channel * bytes;
      const sample = info.encoding === 3 ? (bytes === 4 ? buffer.readFloatLE(offset) : buffer.readDoubleLE(offset)) : buffer.readIntLE(offset, bytes) / 2 ** (info.bits - 1);
      if (Number.isFinite(sample) && Math.abs(sample) > Math.abs(value)) value = sample;
    }
    samples[i] = value;
  }
  return { samples, sampleRate: info.sampleRate };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const roundBpm = value => Math.abs(value - Math.round(value)) <= 0.3 + 1e-9 ? Math.round(value) : Math.round(value * 10) / 10;

function accentPeriod(attacks, samples, sampleRate) {
  const features = attacks.map(time => {
    let peak = 0; let energy = 0; let high = 0;
    const start = Math.round(time * sampleRate);
    const end = Math.min(samples.length, start + Math.round(sampleRate * 0.025));
    for (let i = start; i < end; i++) {
      peak = Math.max(peak, Math.abs(samples[i]));
      energy += samples[i] ** 2;
      if (i > start) high += (samples[i] - samples[i - 1]) ** 2;
    }
    return [peak, energy > 0 ? high / energy : 0];
  });
  for (const period of [2, 4]) {
    for (const feature of [0, 1]) {
      const groups = Array.from({ length: period }, (_, phase) => features.filter((_, index) => index % period === phase).map(value => value[feature]));
      const centers = groups.map(median);
      const high = Math.max(...centers); const low = Math.min(...centers);
      if (high < 0.01 || high < low * 1.7) continue;
      const threshold = (high + low) / 2;
      if (centers.filter(value => value > threshold).length !== 1) continue;
      if (groups.every((values, phase) => values.filter(value => centers[phase] > threshold ? value > threshold : value <= threshold).length / values.length >= 0.85)) return period;
    }
  }
  return null;
}

export function resolveBpm(detected, namedBpms = []) {
  const candidates = detected.candidates ?? detected.ambiguity ?? [];
  const matches = candidates.filter(value => namedBpms.some(name => Number.isFinite(name) && name >= 50 && name <= 200 && Math.abs(value - name) / name <= 0.04));
  if (matches.length === 1) return { ...detected, bpm: matches[0], ambiguity: [], source: 'clique+nome' };
  if (matches.length > 1) return { ...detected, bpm: null, ambiguity: [...candidates], source: null };
  return { ...detected, source: detected.bpm === null ? null : 'clique' };
}

export function detectBpm(samples, sampleRate) {
  const empty = { bpm: null, confidence: 0, ambiguity: [] };
  if (!(sampleRate > 0) || !samples.length) return empty;
  const hop = Math.max(1, Math.round(sampleRate * 0.001));
  const envelope = new Float32Array(Math.ceil(samples.length / hop));
  let maximum = 0;
  for (let i = 0; i < samples.length; i++) {
    const bin = Math.floor(i / hop);
    envelope[bin] = Math.max(envelope[bin], Math.abs(samples[i]));
    maximum = Math.max(maximum, envelope[bin]);
  }
  if (maximum < 0.0001) return empty;
  const attacks = [];
  let average = 0;
  let lastAttack = -Infinity;
  let wasAbove = false;
  for (let i = 0; i < envelope.length; i++) {
    const threshold = Math.max(maximum * 0.035, average * 2.5);
    const above = envelope[i] > threshold;
    let onset = i * hop;
    if (above && !wasAbove) {
      const end = Math.min(samples.length, onset + hop);
      while (onset < end && Math.abs(samples[onset]) <= threshold) onset++;
    }
    const time = onset / sampleRate;
    if (above && !wasAbove && time - lastAttack >= 0.12) { attacks.push(time); lastAttack = time; }
    wasAbove = above;
    average = average * 0.98 + envelope[i] * 0.02;
  }
  if (attacks.length < 40) return empty;
  const intervals = attacks.slice(1).map((time, i) => time - attacks[i]);
  const interval = median(intervals);
  const confidence = intervals.filter(value => Math.abs(value - interval) <= interval * 0.03).length / intervals.length;
  if (confidence < 0.8) return { ...empty, confidence };
  // A mediana evita que intervalos isolados alterem o andamento estimado.
  const pulse = 60 / interval;
  if (pulse < 25 || pulse > 400) return { ...empty, confidence };
  const candidates = [...new Set([0.25, 0.5, 1, 2, 4].map(factor => pulse * factor).filter(value => value >= 50 && value <= 200).map(roundBpm))].sort((a, b) => a - b);
  const pattern = accentPeriod(attacks, samples, sampleRate);
  // shortcut: acento alternado indica subdivisão e a cada quatro indica compasso; nome de outra variante pode confirmar ou corrigir.
  let choice = pattern === 2 ? pulse / 2 : pattern === 4 ? pulse : null;
  if (!(choice >= 50 && choice <= 200)) choice = null;
  // Heurística solicitada: meio BPM é indício de pulso contado pela metade, nunca arredondar 68,5 para 69.
  if (choice === null && Math.abs(pulse - Math.round(pulse)) > 0.3 && pulse * 2 >= 50 && pulse * 2 <= 200 && Math.abs(pulse * 2 - Math.round(pulse * 2)) <= 0.1) choice = pulse * 2;
  if (choice === null && candidates.length === 1) choice = candidates[0];
  const bpm = choice === null ? null : roundBpm(choice);
  return { bpm, confidence: Math.round(confidence * 1000) / 1000, ambiguity: bpm === null ? candidates : [], candidates, pattern };
}

function pipeProcess(command, args, buffer, outputLimit) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = [];
    let length = 0;
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${command}: tempo limite`)); }, 30000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.stdout.on('data', chunk => {
      length += chunk.length;
      if (length > outputLimit) { child.kill(); reject(new Error(`${command}: saída excedeu limite`)); }
      else chunks.push(chunk);
    });
    child.stderr.resume();
    child.stdin.on('error', () => {});
    child.on('close', code => {
      clearTimeout(timer);
      if (length && length <= outputLimit) resolve(Buffer.concat(chunks));
      else reject(new Error(`${command}: áudio não decodificado (${code})`));
    });
    child.stdin.end(buffer);
  });
}

export async function decodeMp3(buffer) {
  const output = await pipeProcess('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-t', '90', '-f', 's16le', '-ac', '1', '-ar', '22050', 'pipe:1'], buffer, 22050 * 90 * 2 + 65536);
  const samples = new Float32Array(Math.floor(output.length / 2));
  for (let i = 0; i < samples.length; i++) samples[i] = output.readInt16LE(i * 2) / 32768;
  return { samples, sampleRate: 22050 };
}

function mp3Frame(buffer, offset) {
  if (offset + 4 > buffer.length || buffer[offset] !== 255 || (buffer[offset + 1] & 224) !== 224) return null;
  const version = (buffer[offset + 1] >> 3) & 3;
  const layer = (buffer[offset + 1] >> 1) & 3;
  const index = buffer[offset + 2] >> 4;
  const rateIndex = (buffer[offset + 2] >> 2) & 3;
  if (version === 1 || layer !== 1 || index === 0 || index === 15 || rateIndex === 3) return null;
  const bitRate = (version === 3 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160])[index] * 1000;
  const sampleRate = [44100, 48000, 32000][rateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
  const samples = version === 3 ? 1152 : 576;
  const length = Math.floor(samples / 8 * bitRate / sampleRate) + ((buffer[offset + 2] >> 1) & 1);
  const mono = (buffer[offset + 3] >> 6) === 3;
  const side = version === 3 ? (mono ? 17 : 32) : (mono ? 9 : 17);
  return { bitRate, sampleRate, samples, length, side, crc: (buffer[offset + 1] & 1) ? 0 : 2 };
}

export async function mp3Info(buffer, totalSize) {
  let offset = 0;
  if (buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'ID3') {
    if ([...buffer.subarray(6, 10)].some(byte => byte & 128)) return null;
    offset = 10 + buffer[6] * 2097152 + buffer[7] * 16384 + buffer[8] * 128 + buffer[9] + (buffer[5] & 16 ? 10 : 0);
  }
  const start = offset;
  const frame = mp3Frame(buffer, offset);
  if (!frame || offset + frame.length > buffer.length) return null;
  const xing = offset + 4 + frame.crc + frame.side;
  let duration = null;
  let source = null;
  if (xing + 12 <= buffer.length && ['Xing', 'Info'].includes(buffer.toString('ascii', xing, xing + 4)) && (buffer.readUInt32BE(xing + 4) & 1)) {
    duration = buffer.readUInt32BE(xing + 8) * frame.samples / frame.sampleRate;
    source = buffer.toString('ascii', xing, xing + 4);
  }
  const vbri = offset + 36;
  if (vbri + 18 <= buffer.length && buffer.toString('ascii', vbri, vbri + 4) === 'VBRI') {
    duration = buffer.readUInt32BE(vbri + 14) * frame.samples / frame.sampleRate;
    source = 'VBRI';
  }
  // shortcut: CBR sem Info exige todos os frames, evitando supor CBR pelo começo de um VBR.
  if (duration === null && buffer.length >= totalSize) {
    let count = 0;
    while (offset + 4 <= buffer.length) {
      const next = mp3Frame(buffer, offset);
      if (!next || next.bitRate !== frame.bitRate || next.sampleRate !== frame.sampleRate || offset + next.length > buffer.length) break;
      count++; offset += next.length;
    }
    const trailing = buffer.length - offset;
    if (count >= 2 && (trailing === 0 || trailing === 128 && buffer.toString('ascii', offset, offset + 3) === 'TAG')) {
      duration = (offset - start) * 8 / frame.bitRate;
      source = 'CBR';
    }
  }
  if (!(duration > 0 && Number.isFinite(duration))) return null;
  const probe = await pipeProcess('ffprobe', ['-v', 'error', '-i', 'pipe:0', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,sample_rate', '-of', 'json'], buffer, 65536);
  const stream = JSON.parse(probe.toString()).streams?.[0];
  if (stream?.codec_name !== 'mp3') return null;
  return { duration, sampleRate: frame.sampleRate, bitRate: frame.bitRate, source };
}
