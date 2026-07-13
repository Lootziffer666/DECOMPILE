# DECOMPILE ↔ TRIVIUM Integration Contract

## Role

DECOMPILE extracts evidence from binaries, APKs, legacy games and generated artifacts. TRIVIUM reconstructs functional and relational meaning from that evidence before a clean target implementation is generated.

Decompiler output is not source truth. Thousands of Java/C/assembly fragments are observations whose original names, boundaries and intent may be damaged.

## Reconstruction pipeline

```text
binary / APK / legacy game
→ decompiler and resource extraction
→ syntax, call, data-flow and lifecycle graphs
→ semantic feature clustering
→ functional contracts
→ TRIVIUM neutral representation
→ new target implementation
→ CUE behavioral comparison
```

## Required evidence graph

DECOMPILE should expose, where available:

- classes, methods, fields and resource references
- call graph and control flow
- state reads/writes and ownership
- UI IDs, layouts, intents, broadcasts and Android lifecycle
- network endpoints, persistence and database relations
- threads, coroutines, callbacks and event ordering
- native-library boundaries and reflection/dynamic loading
- confidence, ambiguity and unreachable code

Fragments should be grouped because they share state, lifecycle, resources and effects—not because their obfuscated names look similar.

## Functional contracts

Example reconstruction:

```yaml
feature: complete_login
inputs: [http_200, session_token]
effects:
  - persist_session_token
  - authenticated_state = true
  - navigate_to_dashboard
confidence: strong
```

The generated Kotlin, Java, C#, C++, GDScript or other code may have different architecture and names. It is correct only if the contract and observable behavior remain equivalent.

## Legacy games

For small games, preserve the semantic core rather than obsolete hardware grammar:

- rules and state transitions
- input consequences
- collision and timing obligations
- encounter identity and pacing
- audiovisual effects as intended outcomes

Cycle tricks, custom chips and platform-specific effects should be translated by their function, not copied instruction-for-instruction.

## Uncertainty discipline

Mark findings as verified, strongly inferred, ambiguous or missing. Original names, comments, server logic, encrypted payloads and dynamic behavior may be unrecoverable. Never silently fill these gaps.

Only process software the user owns or is authorized to inspect and transform.

## Canonical references

- TRIVIUM architecture: https://github.com/Lootziffer666/TRIVIUM/blob/docs/semantic-realization-direction/docs/architecture-v1.1.md
- Realization contracts: https://github.com/Lootziffer666/TRIVIUM/blob/docs/semantic-realization-direction/docs/realization-contracts.md
- Loss taxonomy: https://github.com/Lootziffer666/TRIVIUM/blob/docs/semantic-realization-direction/docs/loss-taxonomy.md
