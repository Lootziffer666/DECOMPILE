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

## SCUMM v5 probe

`node scripts/lab-scumm-v5-probe.mjs MONKEY2.000 MONKEY2.001 evidence.json`

The probe is deliberately narrow and deterministic. It:

- decodes the SCUMM XOR `0x69` container layer;
- validates the `RNAM`/directory index and `LECF` resource graph;
- inventories rooms, objects, scripts, sounds, costumes and charsets;
- records SHA-256 fingerprints;
- emits no original graphics, scripts, audio or ROM data.

It does not yet decode room pixels, object images, bytecode or iMUSE semantics. Those remain subsequent evidence extractors rather than guessed output.

## Output discipline

Each observation carries evidence and one confidence state: `verified`, `strongly-inferred`, `ambiguous`, or `missing`. Unrecoverable server logic, names, comments, encrypted content and dynamic behavior remain explicit gaps.

Expected outputs for TRIVIUM are an evidence graph, asset inventory, behavior observations and an uncertainty ledger. Only software the user owns or is authorized to inspect may enter the pipeline. Original game data, emulator firmware and save files remain external and must never be committed to DECOMPILE or included in LAB archives.
