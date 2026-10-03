import { inflateRawSync } from 'node:zlib';

// Question imports are small workbooks. Limit the expanded archive as well as
// the 10 MB multipart file so a highly compressed upload cannot exhaust RAM.
export const MAX_ZIP_ENTRY_BYTES = 16 * 1024 * 1024;
export const MAX_ZIP_EXPANDED_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 2048;

function invalid(): never { throw new Error('Invalid spreadsheet archive'); }
const CRC_TABLE = Array.from({ length: 256 }, (_, byte) => {
  let crc = byte;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}

function validateExtra(buffer: Buffer, start: number, length: number): void {
  const end = start + length;
  while (start < end) {
    if (start + 4 > end) invalid();
    const id = buffer.readUInt16LE(start);
    const size = buffer.readUInt16LE(start + 2);
    // ZIP64 alternative size metadata is unnecessary for small imports.
    if (id === 1 || start + 4 + size > end) invalid();
    start += 4 + size;
  }
}

// Parse the central directory, then verify each local entry and its actual
// contents. No filesystem extraction, and no unbounded decompression.
export function validateXlsxArchive(buffer: Buffer): void {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 &&
        i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) {
      end = i; break;
    }
  }
  if (end < 0) invalid();
  const count = buffer.readUInt16LE(end + 10);
  const directorySize = buffer.readUInt32LE(end + 12);
  const directory = buffer.readUInt32LE(end + 16);
  if (buffer.readUInt16LE(end + 4) !== 0 || buffer.readUInt16LE(end + 6) !== 0 ||
      buffer.readUInt16LE(end + 8) !== count || count < 1 || count > MAX_ENTRIES ||
      directory + directorySize !== end) invalid();

  const names = new Set<string>();
  const ranges: [number, number][] = [];
  let cursor = directory;
  let expandedBytes = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || buffer.readUInt32LE(cursor) !== 0x02014b50) invalid();
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const crc = buffer.readUInt32LE(cursor + 16);
    const packed = buffer.readUInt32LE(cursor + 20);
    const expanded = buffer.readUInt32LE(cursor + 24);
    const nameSize = buffer.readUInt16LE(cursor + 28);
    const extraSize = buffer.readUInt16LE(cursor + 30);
    const commentSize = buffer.readUInt16LE(cursor + 32);
    const local = buffer.readUInt32LE(cursor + 42);
    const next = cursor + 46 + nameSize + extraSize + commentSize;
    expandedBytes += expanded;
    if (next > end || nameSize === 0 || (flags & (1 | 64 | 8192)) !== 0 ||
        (method !== 0 && method !== 8) || buffer.readUInt16LE(cursor + 34) !== 0 ||
        expanded > MAX_ZIP_ENTRY_BYTES || expandedBytes > MAX_ZIP_EXPANDED_BYTES ||
        packed > buffer.length || local + 30 > directory) invalid();
    const nameBytes = buffer.subarray(cursor + 46, cursor + 46 + nameSize);
    const name = nameBytes.toString('utf8');
    if (names.has(name) || name.includes('\0') || name.includes('\\') ||
        name.startsWith('/') || name.split('/').includes('..')) invalid();
    names.add(name);
    validateExtra(buffer, cursor + 46 + nameSize, extraSize);
    if (buffer.readUInt32LE(local) !== 0x04034b50 ||
        buffer.readUInt16LE(local + 6) !== flags ||
        buffer.readUInt16LE(local + 8) !== method ||
        buffer.readUInt16LE(local + 26) !== nameSize) invalid();
    const dataStart = local + 30 + nameSize + buffer.readUInt16LE(local + 28);
    const dataEnd = dataStart + packed;
    if (dataStart > directory || dataEnd > directory ||
        !buffer.subarray(local + 30, local + 30 + nameSize).equals(nameBytes)) invalid();
    if (!(flags & 8) && (buffer.readUInt32LE(local + 14) !== crc ||
        buffer.readUInt32LE(local + 18) !== packed ||
        buffer.readUInt32LE(local + 22) !== expanded)) invalid();
    validateExtra(buffer, local + 30 + nameSize, buffer.readUInt16LE(local + 28));
    let entryEnd = dataEnd;
    if (flags & 8) {
      const descriptor = dataEnd + (dataEnd + 4 <= directory && buffer.readUInt32LE(dataEnd) === 0x08074b50 ? 4 : 0);
      if (descriptor + 12 > directory || buffer.readUInt32LE(descriptor) !== crc ||
          buffer.readUInt32LE(descriptor + 4) !== packed ||
          buffer.readUInt32LE(descriptor + 8) !== expanded) invalid();
      entryEnd = descriptor + 12;
    }
    ranges.push([local, entryEnd]);
    const payload = buffer.subarray(dataStart, dataEnd);
    const content = method === 0 ? payload : inflateRawSync(payload, {
      maxOutputLength: Math.min(MAX_ZIP_ENTRY_BYTES, expanded + 1),
    });
    if (content.length !== expanded || crc32(content) !== crc) invalid();
    cursor = next;
  }
  if (cursor !== end) invalid();
  ranges.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i][0] < ranges[i - 1][1]) invalid();
  }
  if (!names.has('[Content_Types].xml') || !names.has('xl/workbook.xml') ||
      !names.has('xl/_rels/workbook.xml.rels') ||
      ![...names].some(name => /^xl\/worksheets\/[^/]+\.xml$/.test(name))) invalid();
}
