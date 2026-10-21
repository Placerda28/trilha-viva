import test from 'node:test';
import assert from 'node:assert/strict';
import { parseZipCentral, parseZipEnd, parseZip64End, parseRar4Header, parseRar5Header, indexArchive } from '../../scripts/levantamento/indices.mjs';

function central(zip64 = false) {
  const name = Buffer.from('Clique.wav'), extra = Buffer.alloc(zip64 ? 28 : 0), b = Buffer.alloc(46);
  b.writeUInt32LE(0x02014b50); b.writeUInt16LE(8, 10); b.writeUInt32LE(zip64 ? 0xffffffff : 90, 20); b.writeUInt32LE(zip64 ? 0xffffffff : 100, 24);
  b.writeUInt16LE(name.length, 28); b.writeUInt16LE(extra.length, 30); b.writeUInt32LE(zip64 ? 0xffffffff : 12, 42);
  if (zip64) { extra.writeUInt16LE(1); extra.writeUInt16LE(24, 2); extra.writeBigUInt64LE(100n, 4); extra.writeBigUInt64LE(90n, 12); extra.writeBigUInt64LE(12n, 20); }
  return Buffer.concat([b, name, extra]);
}
function centralName(name, flags = 0) {
  const header = central().subarray(0, 46);
  header.writeUInt16LE(flags, 8); header.writeUInt16LE(name.length, 28);
  return Buffer.concat([header, name]);
}
test('ZIP decodifica UTF-8, CP437 e UTF-8 sem flag; normaliza NFC', () => {
  const decomposed = 'Percussa\u0303o.wav';
  assert.equal(parseZipCentral(centralName(Buffer.from(decomposed), 0x800))[0].name, 'Percussão.wav');
  assert.equal(parseZipCentral(centralName(Buffer.from(decomposed)))[0].name, 'Percussão.wav');
  assert.equal(parseZipCentral(centralName(Buffer.from([0x56, 0x6f, 0x63, 0x61, 0x6c, 0x82, 0x2e, 0x77, 0x61, 0x76])))[0].name, 'Vocalé.wav');
  assert.equal(parseZipCentral(centralName(Buffer.from('Violão.wav'), 0x800))[0].name, 'Violão.wav');
  assert.equal(parseZipCentral(centralName(Buffer.from('Violão.wav')))[0].name, 'Violão.wav');
});
function rar4(method = 0x30, flags = 0x8000) {
  const name = Buffer.from('Clique.wav'), b = Buffer.alloc(32 + name.length);
  b[2] = 0x74; b.writeUInt16LE(flags, 3); b.writeUInt16LE(b.length, 5); b.writeUInt32LE(100, 7); b.writeUInt32LE(200, 11); b[25] = method; b.writeUInt16LE(name.length, 26); name.copy(b, 32); return b;
}
function vint(n) { const out = []; do { out.push((n & 127) | (n > 127 ? 128 : 0)); n = Math.floor(n / 128); } while (n); return Buffer.from(out); }
function rar5(type = 2, compression = 0) {
  const name = Buffer.from('Clique.wav');
  const body = type === 2 ? Buffer.concat([Buffer.from([2, 2, 100, 0]), vint(200), Buffer.from([0]), vint(compression), Buffer.from([0, name.length]), name]) : Buffer.from([type, 0, 0]);
  return Buffer.concat([Buffer.alloc(4), vint(body.length), body]);
}
test('ZIP central comum e ZIP64 preservam nome, tamanhos, método e offset', () => {
  for (const big of [false, true]) { const [e] = parseZipCentral(central(big), 1); assert.equal(e.name, 'Clique.wav'); assert.equal(e.size, 100); assert.equal(e.compressedSize, 90); assert.equal(e.offset, 12); assert.equal(e.method, 'deflate'); }
  assert.throws(() => parseZipCentral(central().subarray(0, 50)), /truncado/);
  assert.throws(() => parseZipCentral(central(), 2), /Contagem/);
});
test('EOCD e EOCD ZIP64', () => {
  const b = Buffer.alloc(22); b.writeUInt32LE(0x06054b50); b.writeUInt16LE(1, 8); b.writeUInt16LE(1, 10); b.writeUInt32LE(56, 12); b.writeUInt32LE(80, 16);
  assert.equal(parseZipEnd(b).offset, 80); assert.throws(() => parseZipEnd(b.subarray(0, 21)));
  const z = Buffer.alloc(56); z.writeUInt32LE(0x06064b50); z.writeBigUInt64LE(44n, 4); z.writeBigUInt64LE(1n, 24); z.writeBigUInt64LE(1n, 32); z.writeBigUInt64LE(56n, 40); z.writeBigUInt64LE(80n, 48);
  assert.deepEqual(parseZip64End(z), { count: 1, size: 56, offset: 80 }); assert.throws(() => parseZip64End(z.subarray(0, 55)));
});
test('RAR4: store, compactado, flags e truncamento', () => {
  const e = parseRar4Header(rar4(), 7).entry;
  assert.equal(e.name, 'Clique.wav'); assert.equal(e.method, 'store'); assert.equal(e.size, 200); assert.equal(e.dataOffset, 49);
  assert.equal(parseRar4Header(rar4(0x33)).entry.method, 'compressed');
  const marked = parseRar4Header(rar4(0x30, 0x8017)).entry; assert.equal(marked.solid, true); assert.equal(marked.encrypted, true); assert.equal(marked.multipart, true);
  assert.throws(() => parseRar4Header(rar4().subarray(0, 33)));
});
test('RAR5: store, compactado, solid e truncamento', () => {
  const e = parseRar5Header(rar5(), 8).entry; assert.equal(e.name, 'Clique.wav'); assert.equal(e.size, 200); assert.equal(e.compressedSize, 100); assert.equal(e.method, 'store');
  assert.equal(parseRar5Header(rar5(2, 128)).entry.method, 'compressed'); assert.equal(parseRar5Header(rar5(2, 64)).entry.solid, true);
  assert.throws(() => parseRar5Header(rar5().subarray(0, 10)));
});
test('Range RAR4/5 pula integralmente os dados entre cabeçalhos', async () => {
  for (const version of [4, 5]) {
    const signature = Buffer.from(version === 4 ? '526172211a0700' : '526172211a070100', 'hex'), h = version === 4 ? rar4() : rar5();
    const end = version === 4 ? Buffer.from([0, 0, 0x7b, 0, 0, 7, 0]) : rar5(5);
    const archive = Buffer.concat([signature, h, Buffer.alloc(100), end]), calls = [];
    const result = await indexArchive(async (start, length) => { calls.push([start, length]); return archive.subarray(start, start + length); }, archive.length, 'rar');
    assert.equal(result.entries.length, 1); assert.equal(result.format, `rar${version}`);
    const dataStart = signature.length + h.length;
    assert.ok(calls.every(([s, n]) => s + n <= dataStart || s >= dataStart + 100));
  }
});
test('Indexação ZIP64 por Range usa locator e diretório central', async () => {
  const cd = central(true), zip64 = Buffer.alloc(56), locator = Buffer.alloc(20), end = Buffer.alloc(22);
  zip64.writeUInt32LE(0x06064b50); zip64.writeBigUInt64LE(44n, 4); zip64.writeBigUInt64LE(1n, 24); zip64.writeBigUInt64LE(1n, 32); zip64.writeBigUInt64LE(BigInt(cd.length), 40);
  locator.writeUInt32LE(0x07064b50); locator.writeBigUInt64LE(BigInt(cd.length), 8); locator.writeUInt32LE(1, 16);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(65535, 8); end.writeUInt16LE(65535, 10); end.writeUInt32LE(0xffffffff, 12); end.writeUInt32LE(0xffffffff, 16);
  const archive = Buffer.concat([cd, zip64, locator, end]);
  const result = await indexArchive(async (s, n) => archive.subarray(s, s + n), archive.length, 'zip'); assert.equal(result.entries[0].size, 100);
});
