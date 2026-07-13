# DECOMPILE ↔ LAB

DECOMPILE is the evidence producer for LAB. It may extract resources, inspect binaries, group calls/state/lifecycle behavior and record runtime observations. It must not claim that decompiled names or fragments are the original design.

The adapter types live in `src/lib/lab-contract.ts`.

## Output discipline

Each observation carries evidence and one confidence state: `verified`, `strongly-inferred`, `ambiguous`, or `missing`. Unrecoverable server logic, names, comments, encrypted content and dynamic behavior remain explicit gaps.

Expected outputs for TRIVIUM are an evidence graph, asset inventory, behavior observations and an uncertainty ledger. Only software the user owns or is authorized to inspect may enter the pipeline.
