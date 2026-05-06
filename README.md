# StreamRights

Encrypted file licensing and cryptographic access control built with Solana + Arcium.

## What StreamRights Does

StreamRights enables owners to share encrypted files while enforcing programmable access rules without relying on a trusted backend authorization server.

Core capabilities:
- client-side encryption before storage,
- policy-based authorization (pay-to-decrypt, expiry, revocation, usage limits),
- wallet-native buyer identity and payment flow on Solana,
- Arcium-based encrypted policy evaluation architecture.

## Why This Matters

Traditional file sharing systems depend on centralized servers that hold sensitive keys and enforce permissions privately. StreamRights shifts that model toward cryptographic policy enforcement and verifiable workflow execution:

- storage can be public or untrusted (IPFS/S3-compatible),
- policy decisions are designed for encrypted/shared-state execution,
- access can be revoked or time-bounded even after sharing links.

This makes StreamRights useful for paid reports, enterprise document exchange, private records sharing, and encrypted dataset licensing.

## Architecture

### 1) Frontend (`app/`)
- Next.js application for owner and buyer workflows
- wallet connection and policy UX
- upload, policy setup, access request, authorization status

### 2) Solana Program (`programs/streamrights/`)
- Anchor-based program for asset/policy/access lifecycle
- purchase + status transition scaffolding
- revocation and policy update paths

### 3) Arcium Layer (`arcium/` + `sdk/`)
- policy input/output model for encrypted evaluation
- local and network-mode adapter architecture
- finalization-oriented orchestration interfaces

### 4) Orchestrator (`orchestrator/`)
- Node service pattern for:
  - submitting Arcium policy computations,
  - awaiting finalization,
  - submitting access status back to Solana

### 5) Docs (`docs/`)
- architecture, threat model, privacy model, implementation plan, demo scenario, orchestrator notes

## End-to-End Product Flow

1. Owner uploads a file.
2. File is encrypted client-side.
3. Ciphertext is stored on IPFS/S3-compatible storage.
4. Owner defines policy (price, expiry, max uses, revocation).
5. Buyer requests access via shared link and wallet flow.
6. Policy evaluation returns approve/deny outcome.
7. Approved requests proceed to decryption authorization path.

## Judging Criteria Mapping

### Innovation
StreamRights combines encrypted storage, programmable licensing, and confidential policy enforcement into a practical data-monetization flow rather than a basic file share demo.

### Technical Implementation
The codebase is modular across frontend, Solana program, SDK, Arcium integration layer, and orchestrator, with explicit interfaces for moving from local evaluation to live Arcium computation finalization.

### User Experience
The UI is built around clear owner/buyer actions: upload, define policy, share, request access, and view authorization outcomes without exposing cryptographic complexity.

### Impact
Supports real utility in:
- paid premium content,
- private enterprise documents,
- sensitive records sharing,
- controlled data licensing.

### Clarity
Project purpose, architecture, and Arcium’s role are documented with dedicated technical docs and a direct workflow narrative.

## Current Implementation Status

Implemented:
- working app shell and policy workflow UX,
- Anchor program scaffolding for access lifecycle,
- Arcium evaluation model and network adapter structure,
- orchestrator service scaffold for finalization + status settlement.

In progress for full production path:
- complete live Arcium submission/result decoding pipeline,
- full frontend-to-Solana transaction wiring for all flows,
- finalized onchain instruction encoding/IDL client integration.

## Quick Start

### Prerequisites
- Node.js 20+
- Rust (stable)
- Solana CLI
- Anchor
- Arcium toolchain (`arcup`, per Arcium docs)

### Install
```bash
cd "/Users/frankchinonso/streamrights"
npm install
```

### Run App
```bash
npm --prefix app run build
npm --prefix app run start -- -p 3004
```

Open:
- `http://localhost:3004`

## Monorepo Structure

- `app/` - frontend UX
- `programs/streamrights/` - Anchor Solana program
- `sdk/` - shared client + Arcium integration interfaces
- `orchestrator/` - server-side access orchestration service
- `arcium/` - Arcium-specific notes and integration docs
- `docs/` - technical and submission documentation

## Demo Scenario

### Paid Research Report
- owner encrypts and uploads report,
- sets access policy (`0.25 SOL`, `30 days`, `3 uses`),
- buyer pays and requests access,
- policy evaluates and returns authorization outcome,
- owner can revoke if misuse is detected.

## License

MIT
