# DECOMPILE ↔ LAB

DECOMPILE is the evidence producer for LAB. It may extract resources, inspect binaries, group calls/state/lifecycle behavior and record runtime observations. It must not claim that decompiled names or fragments are the original design.

The adapter types live in `src/lib/lab-contract.ts`.

## BELLOWS boundary

Deterministic parsing and hashing do not require AI. Whenever DECOMPILE asks a model to classify, summarize, infer intent or compare uncertain behavior, the request must use the supplied BELLOWS gateway contract. Provider keys and provider URLs never belong in DECOMPILE.

The LAB bundle references only:

- `BELLOWS_BASE_URL`
- `BELLOWS_API_KEY`
- `BELLOWS_MODEL`

The values remain local environment settings and are not serialized into evidence.

ANVIL-BELLOWS now accepts OpenAI-compatible vision content parts. After a deterministic extractor has produced a local preview/frame, DECOMPILE may submit it as an ephemeral `image_url` data URL through BELLOWS for classification or comparison. The image bytes themselves must not be persisted in the LAB request or evidence envelope; only the source artifact reference, prompt, selected model, and resulting observation belong in evidence.

## SCUMM v5 probe

`node scripts/lab-scumm-v5-probe.mjs MONKEY2.000 MONKEY2.001 evidence.json`

The probe is deliberately narrow and deterministic. It:

- decodes the SCUMM XOR `0x69` container layer;
- validates the `RNAM`/directory index and `LECF` resource graph;
- inventories rooms, objects, scripts, sounds, costumes and charsets;
- records SHA-256 fingerprints;
- emits no original graphics, scripts, audio or ROM data.

It does not yet decode room pixels, object images, bytecode or iMUSE semantics. Those remain subsequent evidence extractors rather than guessed output.

## Verified game copies

The same probe has been run against two user-supplied SCUMM copies without game-specific parser branches:

| Game | Rooms | Objects | Global scripts | Local scripts | Sounds | Costumes |
|---|---:|---:|---:|---:|---:|---:|
| The Secret of Monkey Island | 86 | 1,027 | 187 | 389 | 138 | 123 |
| Monkey Island 2 | 110 | 1,145 | 167 | 612 | 199 | 164 |

This demonstrates format reuse at the structural-evidence layer. It does not imply that graphics, scripts, audio, or game semantics are decoded.

## Source materializer

`node scripts/lab-source-materializer.mjs <archive-or-directory> [evidence.json]`

This is the LAB-side port of the standalone MIXTRACT unpacker's format coverage: Psychonauts `.pkg`/ZPKG tables, generic LucasArts/Lucasfilm IFF-style chunk carving (LFL/LECF/LAB-like containers), Double Fine `.~h`/`.~p` pair detection, and ZIP central-directory listing.

It is a port of MIXTRACT's format *detection and layout parsing*, not of its file output. The source tool copies matched payloads out to disk; the materializer deliberately does not carry that step over. For every entry it records only:

- path/name, container offset and size;
- a SHA-256 fingerprint for ZPKG, chunk and Double Fine entries, computed transiently in memory and never persisted as content;
- CRC32 plus compressed/uncompressed size for ZIP entries, read directly from the central directory — ZIP payloads are never decompressed;
- a confidence tag: `verified` for table-driven formats (ZPKG, ZIP, Double Fine pairs), `strongly-inferred` for the best-effort generic chunk carve, carrying over the source tool's own "best-effort" caveat for that path.

Same boundary as the SCUMM v5 probe above: no room pixels, object images, bytecode, iMUSE audio or other payload content is decoded or emitted. Original archives remain external inputs and must never be committed or bundled with LAB — the materializer only ever writes the evidence JSON, never the files it inspected.

## Output discipline

Each observation carries evidence and one confidence state: `verified`, `strongly-inferred`, `ambiguous`, or `missing`. Unrecoverable server logic, names, comments, encrypted content and dynamic behavior remain explicit gaps.

Expected outputs for TRIVIUM are an evidence graph, asset inventory, behavior observations and an uncertainty ledger. Only software the user owns or is authorized to inspect may enter the pipeline. Original game data, emulator firmware and save files remain external and must never be committed to DECOMPILE or included in LAB archives.
