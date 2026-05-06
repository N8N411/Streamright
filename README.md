# StreamRights

Private Data Transfer and Cryptographic Access Control using Solana + Arcium.

## Overview

StreamRights is a production-focused application for:
- client-side file encryption,
- public/untrusted storage on IPFS or S3-compatible services,
- encrypted policy enforcement through Arcium,
- wallet-native purchase and licensing on Solana.

The app supports:
- pay-to-decrypt access,
- time-based license expiration,
- revocable permissions,
- usage metering.

## Monorepo Structure

- `app/` - Next.js frontend
- `programs/streamrights/` - Anchor Solana program
- `arcium/` - Arcis circuits and Arcium integration
- `sdk/` - shared TypeScript client helpers
- `docs/` - architecture, threat model, and implementation docs

## Current Status

This repository is in active build mode for an RTG submission timeline ending next week.

## Quick Start

1. Install toolchains:
   - Node.js 20+
   - Rust stable
   - Solana CLI
   - Anchor
   - Arcium toolchain (`arcup`, per docs)
2. Install dependencies:
   - `npm install` (root)
3. Start implementation streams:
   - frontend UX in `app/`
   - program logic in `programs/streamrights/`
   - encrypted policy flows in `arcium/`

## Submission Mapping

- Functional Solana + Arcium integration: in progress
- Clear explanation of Arcium role and privacy benefits: tracked in `docs/`
- Open-source GitHub repo: this repository
- English submission: all docs in English

## License

MIT
