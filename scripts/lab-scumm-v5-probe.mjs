#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const XOR_KEY = 0x69;
const INDEX_TAGS = new Set(['RNAM', 'MAXS', 'DROO', 'DSCR', 'DSOU', 'DCOS', 'DCHR', 'DOBJ']);
const ROOM_CONTAINERS = new Set(['ROOM', 'RMIM', 'OBIM', 'OBCD']);

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function decode(buffer) {
  const output = Buffer.allocUnsafe(buffer.length);
  for (let i = 0; i < buffer.length; i += 1) output[i] = buffer[i] ^ XOR_KEY;
  return output;
}

function headerAt(buffer, offset, end = buffer.length) {
  if (offset + 8 > end) throw new Error(`truncated chunk header at ${offset}`);
  const tag = buffer.toString('ascii', offset, offset + 4);
  const size = buffer.readUInt32BE(offset + 4);
  if (!/^[A-Z0-9 ]{4}$/.test(tag)) throw new Error(`invalid chunk tag ${JSON.stringify(tag)} at ${offset}`);
  if (size < 8 || offset + size > end) throw new Error(`invalid ${tag} size ${size} at ${offset}`);
  return { tag, size, offset, dataOffset: offset + 8, end: offset + size };
}

function parseStream(buffer, start, end) {
  const chunks = [];
  let offset = start;
  while (offset < end) {
    const chunk = headerAt(buffer, offset, end);
    chunks.push(chunk);
    offset = chunk.end;
  }
  if (offset !== end) throw new Error(`chunk stream ended at ${offset}, expected ${end}`);
  return chunks;
}

function countTags(chunks) {
  const counts = {};
  for (const chunk of chunks) counts[chunk.tag] = (counts[chunk.tag] || 0) + 1;
  return counts;
}

function parseRoomNames(indexBuffer, rnam) {
  const names = [];
  const data = indexBuffer.subarray(rnam.dataOffset, rnam.end);
  for (let offset = 0; offset + 10 <= data.length; offset += 10) {
    const roomId = data[offset];
    if (roomId === 0) break;
    const encoded = data.subarray(offset + 1, offset + 10);
    const decoded = [];
    for (const value of encoded) {
      const char = value ^ 0xff;
      if (char === 0) break;
      decoded.push(char);
    }
    names.push({ roomId, name: Buffer.from(decoded).toString('latin1') });
  }
  return names;
}

function parseRoomOffsets(resourceBuffer, loff) {
  const data = resourceBuffer.subarray(loff.dataOffset, loff.end);
  const count = data[0];
  const entries = [];
  let offset = 1;
  for (let i = 0; i < count; i += 1) {
    if (offset + 5 > data.length) throw new Error('truncated LOFF room directory');
    entries.push({ roomId: data[offset], roomChunkOffset: data.readUInt32LE(offset + 1) });
    offset += 5;
  }
  return entries;
}

function inspectIndex(decodedIndex) {
  const chunks = parseStream(decodedIndex, 0, decodedIndex.length);
  const unknown = chunks.filter((chunk) => !INDEX_TAGS.has(chunk.tag)).map((chunk) => chunk.tag);
  const rnam = chunks.find((chunk) => chunk.tag === 'RNAM');
  if (!rnam) throw new Error('SCUMM index has no RNAM chunk');
  return {
    chunks: chunks.map(({ tag, size, offset }) => ({ tag, size, offset })),
    chunkCounts: countTags(chunks),
    roomNames: parseRoomNames(decodedIndex, rnam),
    warnings: unknown.length ? [`unknown index chunks: ${unknown.join(', ')}`] : [],
  };
}

function inspectResource(decodedResource) {
  const root = headerAt(decodedResource, 0);
  if (root.tag !== 'LECF' || root.size !== decodedResource.length) {
    throw new Error(`expected LECF root covering ${decodedResource.length} bytes`);
  }
  const top = parseStream(decodedResource, root.dataOffset, root.end);
  const loff = top.find((chunk) => chunk.tag === 'LOFF');
  if (!loff) throw new Error('SCUMM resource has no LOFF chunk');
  const roomOffsets = parseRoomOffsets(decodedResource, loff);
  const rooms = [];
  const totals = {};

  for (const lflf of top.filter((chunk) => chunk.tag === 'LFLF')) {
    const children = parseStream(decodedResource, lflf.dataOffset, lflf.end);
    const room = children.find((chunk) => chunk.tag === 'ROOM');
    const roomChildren = room ? parseStream(decodedResource, room.dataOffset, room.end) : [];
    const nested = [];
    for (const chunk of roomChildren) {
      if (!ROOM_CONTAINERS.has(chunk.tag)) continue;
      try {
        nested.push(...parseStream(decodedResource, chunk.dataOffset, chunk.end));
      } catch {
        // Some payload chunks are not containers. The outer chunk remains valid evidence.
      }
    }
    const all = [...children, ...roomChildren, ...nested];
    for (const [tag, count] of Object.entries(countTags(all))) totals[tag] = (totals[tag] || 0) + count;
    rooms.push({
      lflfOffset: lflf.offset,
      size: lflf.size,
      directChunks: countTags(children),
      roomChunks: countTags(roomChildren),
    });
  }

  return {
    root: { tag: root.tag, size: root.size },
    topLevelCounts: countTags(top),
    roomOffsets,
    roomCount: rooms.length,
    resourceCounts: totals,
    rooms,
  };
}

function main(argv) {
  if (argv.length < 2) {
    console.error('Usage: node lab-scumm-v5-probe.mjs MONKEY2.000 MONKEY2.001 [output.json]');
    return 2;
  }
  const [indexArg, resourceArg, outputArg] = argv;
  const indexPath = resolve(indexArg);
  const resourcePath = resolve(resourceArg);
  const indexRaw = readFileSync(indexPath);
  const resourceRaw = readFileSync(resourcePath);
  const index = inspectIndex(decode(indexRaw));
  const resource = inspectResource(decode(resourceRaw));
  const roomNameById = new Map(index.roomNames.map((entry) => [entry.roomId, entry.name]));
  const roomDirectory = resource.roomOffsets.map((entry) => ({ ...entry, name: roomNameById.get(entry.roomId) || null }));

  const evidence = {
    schemaVersion: '1.0.0',
    module: 'trivium-lab',
    producer: 'decompile.scumm-v5-probe',
    status: 'success',
    format: {
      family: 'SCUMM',
      generation: 'v5-compatible chunk layout',
      xorKey: '0x69',
      confidence: 'verified',
    },
    sourceFiles: [
      { name: basename(indexPath), role: 'resource-index', size: indexRaw.length, sha256: sha256(indexRaw) },
      { name: basename(resourcePath), role: 'resource-container', size: resourceRaw.length, sha256: sha256(resourceRaw) },
    ],
    inventory: {
      rooms: resource.roomCount,
      roomNames: index.roomNames.length,
      objects: resource.resourceCounts.OBIM || 0,
      objectCode: resource.resourceCounts.OBCD || 0,
      globalScripts: resource.resourceCounts.SCRP || 0,
      localScripts: resource.resourceCounts.LSCR || 0,
      sounds: resource.resourceCounts.SOUN || 0,
      costumes: resource.resourceCounts.COST || 0,
      charsets: resource.resourceCounts.CHAR || 0,
      roomImages: resource.resourceCounts.RMIM || 0,
    },
    roomDirectory,
    index,
    resource,
    limitations: [
      'This probe validates and inventories the chunk graph; it does not yet decode graphics, scripts, audio, or gameplay semantics.',
      'Original game files remain external inputs and must never be committed or bundled with LAB.',
    ],
  };

  const json = `${JSON.stringify(evidence, null, 2)}\n`;
  if (outputArg) writeFileSync(resolve(outputArg), json);
  else process.stdout.write(json);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
