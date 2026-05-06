# Orchestrator (Node Service)

## Purpose

The orchestrator runs server-side automation for access requests:

1. receives access request envelope,
2. executes Arcium policy computation (live network adapter),
3. waits for finalization,
4. submits `set_access_status` on Solana.

## Why a Service Is Needed

The browser app should not hold privileged service keys or execute long-running coordination loops. The orchestrator handles those tasks while preserving cryptographic policy enforcement in Arcium.

## Current Implementation

- Package: `orchestrator/`
- Main class: `AccessOrchestrator`
- Live adapter: `LiveArciumAdapter` from `@streamrights/sdk/node`
- Boot wiring: `bootOrchestrator()`

## Integration Points To Finalize

1. Implement `submitComputation(input)` with your Arcium computation submission logic.
2. Implement `readResult(...)` by decoding callback/result accounts.
3. Replace temporary `encodeSetAccessStatusArgs(...)` with Anchor IDL-generated instruction coder.
4. Add queue/worker transport (e.g., Redis/SQS) for production throughput.
