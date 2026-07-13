#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const CHUNK_MAGIC_RE = /^[A-Z0-9_]{2,4}$/;

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function hashRange(data, offset, size) {
  if (offset < 0 || size < 0 || offset + size > data.length) return null;
  return sha256(data.subarray(offset, offset + size));
}

function readCString(buf, offset) {
  let end = buf.indexOf(0, offset);
  if (end < 0) end = buf.length;
  return buf.toString('utf-8', offset, end);
}

// ---- Psychonauts ZPKG tables ----

function inspectPsychonautsPkg(data) {
  if (data.length < 512 || data.toString('ascii', 0, 4) !== 'ZPKG') {
    throw new Error('not a Psychonauts ZPKG archive');
  }
  const version = data.readUInt32LE(4);
  if (version !== 1) throw new Error(`unsupported ZPKG version ${version}`);
  const count = data.readUInt32LE(12);
  const dirsOffset = data.readUInt32LE(16);
  const dirsSize = data.readUInt32LE(20);
  const namesOffset = data.readUInt32LE(24);
  const typesOffset = data.readUInt32LE(28);

  const rawRecords = [];
  for (let i = 0; i < count; i += 1) {
    const off = 512 + i * 16;
    const null1 = data.readUInt8(off);
    const typeOff = data.readUInt16LE(off + 1);
    const null2 = data.readUInt8(off + 3);
    const nameOff = data.readUInt32LE(off + 4);
    const fileOff = data.readUInt32LE(off + 8);
    const fileSize = data.readUInt32LE(off + 12);
    if (null1 || null2) throw new Error('corrupt ZPKG file table');
    rawRecords.push({ nameOff, typeOff, fileOff, fileSize });
  }

  const dirMap = new Array(count).fill(null);
  let buf = [];
  for (let i = 0; i < dirsSize; i += 1) {
    const off = dirsOffset + i * 12;
    const ch = data.subarray(off, off + 1);
    const nul = data.readUInt8(off + 1);
    const start = data.readUInt16LE(off + 8);
    const end = data.readUInt16LE(off + 10);
    if (nul) throw new Error('corrupt ZPKG directory table');
    const isSep = ch[0] === 0x2f; // '/'
    if (isSep) {
      if (buf.length) buf.push(Buffer.from('/'));
    } else {
      buf.push(Buffer.from(ch));
    }
    if (start && end) {
      const dirname = Buffer.concat(buf).toString('utf-8');
      if (!isSep) buf = [];
      for (let recNo = start; recNo < Math.min(end, count); recNo += 1) dirMap[recNo] = dirname;
    }
  }

  return rawRecords.map((rec, idx) => {
    const name = readCString(data, namesOffset + rec.nameOff);
    const ext = readCString(data, typesOffset + rec.typeOff);
    const base = [dirMap[idx], name].filter(Boolean).join('/');
    const last = base.split('/').pop() || '';
    const hasSuffix = /\.[^./]+$/.test(last);
    const path = ext && !hasSuffix ? `${base}.${ext}` : base || `file_${String(idx).padStart(6, '0')}.bin`;
    const hash = hashRange(data, rec.fileOff, rec.fileSize);
    return {
      path,
      kind: 'psychonauts-pkg',
      offset: rec.fileOff,
      size: rec.fileSize,
      sha256: hash,
      confidence: hash ? 'verified' : 'missing',
    };
  });
}

// ---- Generic LucasArts / IFF-style chunk carving (best-effort, mirrors MIXTRACT's own caveat) ----

function inspectChunks(data) {
  const entries = [];
  let i = 0;
  while (i + 8 <= data.length) {
    const magic = data.toString('latin1', i, i + 4).replace(/[\0 ]+$/, '');
    if (CHUNK_MAGIC_RE.test(magic)) {
      const be = data.readUInt32BE(i + 4);
      const le = data.readUInt32LE(i + 4);
      let size = 0;
      if (be > 0 && be <= data.length - i) size = be;
      else if (le > 0 && le <= data.length - i) size = le;
      if (size >= 8) {
        const name = `${String(entries.length).padStart(5, '0')}_${magic}.bin`;
        entries.push({
          path: name,
          kind: 'chunk',
          offset: i,
          size,
          sha256: hashRange(data, i, size),
          confidence: 'strongly-inferred',
        });
        i += size + (size & 1);
        continue;
      }
    }
    i += 1;
  }
  if (!entries.length) throw new Error('no LucasArts-style chunks found');
  return entries;
}

// ---- Double Fine .~h / .~p pair detection ----

function inspectDoubleFinePair(hPath) {
  const pPath = hPath.replace(/\.~h$/i, '.~p');
  try {
    statSync(pPath);
  } catch {
    throw new Error(`missing payload file ${basename(pPath)}`);
  }
  const hBuf = readFileSync(hPath);
  const pBuf = readFileSync(pPath);
  return [
    { path: basename(hPath), kind: 'doublefine-header', offset: 0, size: hBuf.length, sha256: sha256(hBuf), confidence: 'verified' },
    { path: basename(pPath), kind: 'doublefine-payload', offset: 0, size: pBuf.length, sha256: sha256(pBuf), confidence: 'verified' },
  ];
}

// ---- ZIP central-directory listing (structural only; payloads are never decompressed) ----

function inspectZip(data) {
  const EOCD_SIG = 0x06054b50;
  const CDH_SIG = 0x02014b50;
  let eocdOffset = -1;
  const minOffset = Math.max(0, data.length - 22 - 65535);
  for (let i = data.length - 22; i >= minOffset; i -= 1) {
    if (data.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('not a ZIP archive (no end-of-central-directory record)');
  const entryCount = data.readUInt16LE(eocdOffset + 10);
  const cdOffset = data.readUInt32LE(eocdOffset + 16);
  if (entryCount === 0xffff || cdOffset === 0xffffffff) {
    throw new Error('zip64 archives are not supported by this structural listing');
  }

  const entries = [];
  let offset = cdOffset;
  for (let i = 0; i < entryCount; i += 1) {
    if (data.readUInt32LE(offset) !== CDH_SIG) throw new Error(`corrupt ZIP central directory entry at ${offset}`);
    const method = data.readUInt16LE(offset + 10);
    const crc32 = data.readUInt32LE(offset + 16);
    const compressedSize = data.readUInt32LE(offset + 20);
    const uncompressedSize = data.readUInt32LE(offset + 24);
    const nameLen = data.readUInt16LE(offset + 28);
    const extraLen = data.readUInt16LE(offset + 30);
    const commentLen = data.readUInt16LE(offset + 32);
    const localHeaderOffset = data.readUInt32LE(offset + 42);
    const name = data.toString('utf-8', offset + 46, offset + 46 + nameLen);
    entries.push({
      path: name,
      kind: 'zip',
      offset: localHeaderOffset,
      size: uncompressedSize,
      compressedSize,
      method,
      crc32: crc32.toString(16).padStart(8, '0'),
      confidence: 'verified',
    });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// ---- Dispatcher ----

function detectFormat(path, data) {
  if (data.length >= 4 && data.toString('ascii', 0, 4) === 'ZPKG') return 'psychonauts-pkg';
  if (data.length >= 4 && data.readUInt32LE(0) === 0x04034b50) return 'zip';
  return 'chunks';
}

function materializeFile(path) {
  if (extname(path).toLowerCase() === '.~h') {
    return { format: 'doublefine-pair', entries: inspectDoubleFinePair(path) };
  }
  const data = readFileSync(path);
  const format = detectFormat(path, data);
  if (format === 'psychonauts-pkg') return { format, entries: inspectPsychonautsPkg(data) };
  if (format === 'zip') return { format, entries: inspectZip(data) };
  return { format: 'chunks', entries: inspectChunks(data) };
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function summarizeByKind(entries) {
  const counts = {};
  for (const e of entries) counts[e.kind] = (counts[e.kind] || 0) + 1;
  return counts;
}

export function main(argv) {
  if (argv.length < 1) {
    console.error('Usage: node lab-source-materializer.mjs <archive-or-directory> [evidence.json]');
    return 2;
  }
  const [inputArg, outputArg] = argv;
  const inputPath = resolve(inputArg);
  const stat = statSync(inputPath);
  const targets = stat.isDirectory() ? walk(inputPath) : [inputPath];

  const results = [];
  const warnings = [];
  for (const target of targets) {
    try {
      const { format, entries } = materializeFile(target);
      results.push({
        source: target,
        format,
        entryCount: entries.length,
        byKind: summarizeByKind(entries),
        entries,
      });
    } catch (exc) {
      warnings.push(`${target}: ${exc.message}`);
    }
  }

  const evidence = {
    schemaVersion: '1.0.0',
    module: 'trivium-lab',
    producer: 'decompile.source-materializer',
    status: results.length ? 'success' : 'no-supported-input',
    inputs: results,
    warnings,
    limitations: [
      'This materializer records structural evidence only: paths, offsets, sizes, hashes and (for ZIP) CRC32 checksums.',
      'It does not write, copy, decode, decompress or otherwise emit original graphics, scripts, audio or ROM bytes.',
      'Chunk-carved entries use best-effort heuristics (confidence "strongly-inferred"), not a validated format grammar.',
      'Original archives remain external inputs and must never be committed or bundled with LAB.',
    ],
  };

  const json = `${JSON.stringify(evidence, null, 2)}\n`;
  if (outputArg) writeFileSync(resolve(outputArg), json);
  else process.stdout.write(json);
  return results.length ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main(process.argv.slice(2));
}
