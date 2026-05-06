# Arcium Integration Flow

## Objective

Use Arcium as the cryptographic policy engine that decides whether a paid request may unlock decryption access.

## Access Decision Lifecycle

1. Buyer submits `purchase_access` on Solana with `request_nonce`.
2. Program records a payment receipt with status `PaidPendingArcium`.
3. Client/orchestrator submits encrypted policy input to Arcium:
   - asset id
   - buyer pubkey
   - request nonce
   - amount paid
   - expiry
   - revocation state
   - usage counters
4. Arcium computes policy result over encrypted shared state.
5. Orchestrator sends `set_access_status` to Solana:
   - approved or denied
   - buyer + nonce bound to the receipt PDA
6. If approved, client can proceed with key-release/decrypt flow.

## Why This Matters

- Solana provides payment finality and identity.
- Arcium provides confidential policy enforcement.
- Public storage remains safe because ciphertext is useless without approved key release.

## Current SDK Surface

The SDK includes:
- policy evaluation input/output types
- deterministic mapping to `set_access_status` payload
- status lifecycle hooks for app wiring
- `LiveArciumAdapter` that supports:
  - encrypted computation submission callback
  - Arcium finalization waiting via `awaitComputationFinalization`
  - result parsing callback into authorization decision

To activate full live mode:

1. Implement `submitComputation(input)` to queue the encrypted policy computation.
2. Implement `readResult(input, computationOffset, finalizeSig)` to decode on-chain callback/result account.
3. Instantiate `LiveArciumAdapter` with provider and MXE program id.
4. Pass adapter to `evaluatePolicyWithArcium(..., "network", adapter)`.
