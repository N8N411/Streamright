# Implementation Plan (Production Sprint)

## Week Plan

### Phase 1 - Foundation
- Set up monorepo and baseline docs.
- Create frontend shell and wallet connection.
- Define Solana account schema and instruction interfaces.

### Phase 2 - Crypto + Storage
- Implement client-side file encryption/decryption module.
- Integrate IPFS/S3-compatible upload for ciphertext blobs.
- Add integrity hash checks.

### Phase 3 - Solana + Arcium Flow
- Implement `create_asset`, `purchase_access`, and `revoke_access`.
- Add Arcium MPC policy evaluation hooks and response handling.
- Add usage metering and time-expiration validation.

### Phase 4 - UX + Hardening
- Build complete user journey:
  - upload
  - policy setup
  - share
  - purchase
  - decrypt
- Add tests for replay, revocation, and expiry.
- Write final README and demo guide.

## Exit Criteria

- Full end-to-end flow works on Solana devnet and Arcium test environment.
- Arcium integration is functional (not mocked).
- Docs clearly explain privacy properties and trust assumptions.
