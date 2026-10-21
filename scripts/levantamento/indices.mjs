// Formatos: PKWARE APPNOTE e https://www.rarlab.com/technote.htm.
function need(buffer, offset, length) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) throw new Error('Índice truncado ou tamanho inválido');
}
function safe(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Tamanho fora do limite seguro');
  return n;
}
function u64(b, p) { need(b, p, 8); return safe(b.readBigUInt64LE(p)); }
const CP437 = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
function zipName(raw, utf8) {
  if (utf8) return raw.toString('utf8').normalize('NFC');
  const decoded = Array.from(raw, v => v < 128 ? String.fromCharCode(v) : CP437[v - 128]).join('');
  // Alguns ZIP omitem a flag UTF-8: só recupere quando os bytes forem válidos e houver mojibake.
  if (/[\u2500-\u259f]/u.test(decoded)) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(raw).normalize('NFC'); } catch { /* CP437 legítimo. */ }
  }
  return decoded.normalize('NFC');
}
export function parseZipEnd(b) {
  for (let p = b.length - 22; p >= 0; p--) {
    if (b.readUInt32LE(p) !== 0x06054b50 || p + 22 + b.readUInt16LE(p + 20) !== b.length) continue;
    if (b.readUInt16LE(p + 4) || b.readUInt16LE(p + 6)) throw new Error('ZIP multipart não suportado');
    const count = b.readUInt16LE(p + 10);
    if (b.readUInt16LE(p + 8) !== count) throw new Error('ZIP multipart não suportado');
    const size = b.readUInt32LE(p + 12), offset = b.readUInt32LE(p + 16);
    return { position: p, count, size, offset, zip64: count === 65535 || size === 0xffffffff || offset === 0xffffffff };
  }
  throw new Error('EOCD ZIP não encontrado');
}
export function parseZip64End(b) {
  need(b, 0, 56);
  if (b.readUInt32LE(0) !== 0x06064b50 || u64(b, 4) < 44) throw new Error('EOCD ZIP64 inválido');
  if (b.readUInt32LE(16) || b.readUInt32LE(20) || u64(b, 24) !== u64(b, 32)) throw new Error('ZIP64 multipart não suportado');
  return { count: u64(b, 32), size: u64(b, 40), offset: u64(b, 48) };
}
export function parseZipCentral(b, expectedCount) {
  const entries = [];
  let p = 0;
  while (p < b.length) {
    need(b, p, 46);
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('Diretório central ZIP inválido');
    const flags = b.readUInt16LE(p + 8), methodCode = b.readUInt16LE(p + 10);
    let compressedSize = b.readUInt32LE(p + 20), size = b.readUInt32LE(p + 24), offset = b.readUInt32LE(p + 42), disk = b.readUInt16LE(p + 34);
    const nl = b.readUInt16LE(p + 28), el = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32), end = p + 46 + nl + el + cl;
    need(b, p, end - p);
    const rawName = b.subarray(p + 46, p + 46 + nl);
    let name = zipName(rawName, flags & 0x800);
    let found64 = false;
    for (let q = p + 46 + nl; q < p + 46 + nl + el;) {
      need(b, q, 4);
      const id = b.readUInt16LE(q), len = b.readUInt16LE(q + 2), start = q + 4;
      if (start + len > p + 46 + nl + el) throw new Error('Extra ZIP truncado');
      if (id === 1) {
        const extra = b.subarray(start, start + len); let k = 0;
        if (size === 0xffffffff) { size = u64(extra, k); k += 8; }
        if (compressedSize === 0xffffffff) { compressedSize = u64(extra, k); k += 8; }
        if (offset === 0xffffffff) { offset = u64(extra, k); k += 8; }
        if (disk === 65535) { need(extra, k, 4); disk = extra.readUInt32LE(k); }
        found64 = true;
      }
      if (id === 0x7075 && len >= 5 && b[start] === 1 && crc32(rawName) === b.readUInt32LE(start + 1)) name = b.subarray(start + 5, start + len).toString('utf8');
      q = start + len;
    }
    name = name.normalize('NFC');
    if (!found64 && [size, compressedSize, offset].includes(0xffffffff)) throw new Error('Extra ZIP64 ausente');
    if (disk) throw new Error('ZIP multipart não suportado');
    entries.push({ name, compressedSize, size, method: methodCode === 0 ? 'store' : methodCode === 8 ? 'deflate' : 'compressed', methodCode, offset, encrypted: Boolean(flags & 0x41), directory: /[\\/]$/.test(name) });
    p = end;
  }
  if (expectedCount !== undefined && entries.length !== expectedCount) throw new Error('Contagem ZIP divergente');
  return entries;
}
function crc32(b) {
  let crc = 0xffffffff;
  for (const v of b) { crc ^= v; for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function readVint(b, state) {
  let value = 0n;
  for (let n = 0; n < 10; n++) { need(b, state.p, 1); const v = b[state.p++]; value |= BigInt(v & 127) << BigInt(n * 7); if (!(v & 128)) return safe(value); }
  throw new Error('Vint RAR inválido');
}
function rar4Name(raw, unicode) {
  if (!unicode) return raw.toString('latin1');
  const zero = raw.indexOf(0);
  if (zero < 0) return raw.toString('utf8');
  const base = raw.subarray(0, zero), encoded = raw.subarray(zero + 1);
  need(encoded, 0, 1);
  const high = encoded[0], out = []; let p = 1, flags = 0, left = 0;
  while (p < encoded.length) {
    if (!left) { flags = encoded[p++]; left = 4; }
    const mode = flags >>> 6; flags = (flags << 2) & 255; left--;
    need(encoded, p, mode === 2 ? 2 : 1);
    if (mode === 0) out.push(encoded[p++]);
    else if (mode === 1) out.push((high << 8) | encoded[p++]);
    else if (mode === 2) { out.push(encoded.readUInt16LE(p)); p += 2; }
    else {
      const length = encoded[p++]; let correction = 0;
      if (length & 128) { need(encoded, p, 1); correction = encoded[p++]; }
      const count = (length & 127) + 2;
      need(base, out.length, count);
      for (let i = 0; i < count; i++) out.push(length & 128 ? (high << 8) | ((base[out.length] + correction) & 255) : base[out.length]);
    }
  }
  return out.map(n => String.fromCharCode(n)).join('');
}
export function parseRar4Header(b, offset = 0) {
  need(b, 0, 7);
  const type = b[2], flags = b.readUInt16LE(3), headerSize = b.readUInt16LE(5);
  if (headerSize < 7) throw new Error('Cabeçalho RAR4 inválido');
  need(b, 0, headerSize);
  let dataSize = 0, entry;
  if (flags & 0x8000) { need(b, 7, 4); dataSize = b.readUInt32LE(7); }
  if (type === 0x74) {
    need(b, 0, 32); let size = b.readUInt32LE(11), p = 32;
    dataSize = b.readUInt32LE(7);
    if (flags & 0x100) { need(b, p, 8); dataSize = safe(BigInt(dataSize) + (BigInt(b.readUInt32LE(p)) << 32n)); size = safe(BigInt(size) + (BigInt(b.readUInt32LE(p + 4)) << 32n)); p += 8; }
    const length = b.readUInt16LE(26); if (p + length > headerSize) throw new Error('Nome RAR4 truncado');
    entry = { name: rar4Name(b.subarray(p, p + length), flags & 0x200), compressedSize: dataSize, size, method: b[25] === 0x30 ? 'store' : 'compressed', methodCode: b[25], dataOffset: offset + headerSize, encrypted: Boolean(flags & 4), solid: Boolean(flags & 0x10), multipart: Boolean(flags & 3), directory: (flags & 0xe0) === 0xe0 };
  }
  return { type, headerSize, dataSize, entry, encrypted: type === 0x73 && Boolean(flags & 0x80), solid: type === 0x73 && Boolean(flags & 8), multipart: type === 0x73 && Boolean(flags & 1), end: type === 0x7b };
}
export function parseRar5Header(b, offset = 0) {
  need(b, 0, 5); const s = { p: 4 }, length = readVint(b, s), headerSize = s.p + length;
  need(b, 0, headerSize);
  const header = b.subarray(0, headerSize), type = readVint(header, s), flags = readVint(header, s);
  const extraSize = flags & 1 ? readVint(header, s) : 0, dataSize = flags & 2 ? readVint(header, s) : 0;
  const extraStart = headerSize - extraSize;
  if (extraStart < s.p) throw new Error('Extra RAR5 inválido');
  let entry, solid = false, multipart = Boolean(flags & 24);
  if (type === 1) { const archiveFlags = readVint(header, s); solid = Boolean(archiveFlags & 4); multipart ||= Boolean(archiveFlags & 1); }
  if (type === 2 || type === 3) {
    const fileFlags = readVint(header, s), unpacked = readVint(header, s); readVint(header, s);
    if (fileFlags & 2) s.p += 4;
    if (fileFlags & 4) s.p += 4;
    const compression = readVint(header, s); readVint(header, s); const nameLength = readVint(header, s);
    if (s.p + nameLength > extraStart) throw new Error('Nome RAR5 truncado');
    const name = header.subarray(s.p, s.p + nameLength).toString('utf8'); let encrypted = false;
    const e = { p: extraStart };
    while (e.p < headerSize) { const n = readVint(header, e), end = e.p + n; if (end > headerSize || n < 1) throw new Error('Extra RAR5 truncado'); const kind = readVint(header, e); if (kind === 1) encrypted = true; e.p = end; }
    if (type === 2) entry = { name, compressedSize: dataSize, size: fileFlags & 8 ? null : unpacked, method: ((compression >>> 7) & 7) === 0 ? 'store' : 'compressed', methodCode: (compression >>> 7) & 7, dataOffset: offset + headerSize, encrypted, solid: Boolean(compression & 64), multipart, directory: Boolean(fileFlags & 1) };
  }
  return { type, headerSize, dataSize, entry, encrypted: type === 4, solid, multipart, end: type === 5 };
}
export async function indexArchive(read, size, type) {
  const exact = async (start, length) => { if (start < 0 || length < 0 || start + length > size) throw new Error('Índice fora do arquivo'); const b = await read(start, length); if (b.length !== length) throw new Error('Range truncado'); return b; };
  if (type === 'zip') {
    const tailStart = Math.max(0, size - 65557), tail = await exact(tailStart, size - tailStart);
    let info = parseZipEnd(tail);
    if (info.zip64) {
      const locator = await exact(tailStart + info.position - 20, 20);
      if (locator.readUInt32LE(0) !== 0x07064b50 || locator.readUInt32LE(4) || locator.readUInt32LE(16) !== 1) throw new Error('Locator ZIP64 inválido/multipart');
      info = parseZip64End(await exact(u64(locator, 8), 56));
    }
    if (info.size > 64 * 1024 * 1024) throw new Error('Diretório ZIP excede 64 MB');
    return { format: 'zip', entries: parseZipCentral(await exact(info.offset, info.size), info.count) };
  }
  if (type !== 'rar') throw new Error('Formato não reconhecido');
  const signature = await exact(0, Math.min(size, 8));
  const version = signature.subarray(0, 7).equals(Buffer.from('526172211a0700', 'hex')) ? 4 : signature.equals(Buffer.from('526172211a070100', 'hex')) ? 5 : 0;
  if (!version) throw new Error('Assinatura RAR não reconhecida');
  const entries = []; let offset = version === 4 ? 7 : 8, solid = false, multipart = false;
  for (let blocks = 0; offset < size; blocks++) {
    if (blocks > 100000) throw new Error('RAR excede limite de cabeçalhos');
    let prefix = await exact(offset, Math.min(7, size - offset));
    let headerSize;
    if (version === 4) { need(prefix, 0, 7); headerSize = prefix.readUInt16LE(5); }
    else { const state = { p: 4 }; const length = readVint(prefix, state); headerSize = state.p + length; }
    if (headerSize < prefix.length || headerSize > 2 * 1024 * 1024) throw new Error('Tamanho de cabeçalho RAR inválido');
    if (headerSize > prefix.length) prefix = Buffer.concat([prefix, await exact(offset + prefix.length, headerSize - prefix.length)]);
    const h = version === 4 ? parseRar4Header(prefix, offset) : parseRar5Header(prefix, offset);
    if (h.encrypted) throw new Error('Cabeçalhos RAR criptografados');
    solid ||= h.solid; multipart ||= h.multipart;
    if (h.entry) entries.push({ ...h.entry, solid: solid || h.entry.solid, multipart: multipart || h.entry.multipart });
    if (h.end) break;
    const next = offset + h.headerSize + h.dataSize;
    if (next <= offset || next > size) throw new Error('Dados RAR fora do arquivo');
    offset = next;
  }
  return { format: `rar${version}`, entries, solid, multipart };
}
