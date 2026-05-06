# StreamRights Architecture

## Purpose

StreamRights enables encrypted file licensing over untrusted storage without trusted backend authorization servers.

## Components

1. Frontend (`app/`)
   - Wallet authentication
   - Client-side encryption and decryption
   - Policy creation and purchase UX

2. Solana Program (`programs/streamrights/`)
   - Asset registration
   - Payment settlement
   - License and revocation events

3. Arcium Layer (`arcium/`)
   - Encrypted shared state for policy and key-gating conditions
   - MPC policy evaluation
   - Authorization artifact generation

4. Storage (IPFS or S3-compatible)
   - Stores ciphertext blobs and public metadata references

## Data Flow

1. Uploader selects file.
2. File is encrypted in browser with a random data encryption key (DEK).
3. Ciphertext is uploaded to IPFS/S3.
4. Policy is created and submitted with Solana and Arcium references.
5. Buyer pays on Solana and requests access.
6. Arcium evaluates encrypted policy state:
   - payment present
   - license not expired
   - not revoked
   - usage remaining
7. If valid, an authorization artifact for key release is returned.
8. Client decrypts DEK and then decrypts file locally.

## Why Arcium

Arcium is used for cryptographic access control over encrypted shared state. This avoids central backend authorization trust and keeps policy enforcement confidential and verifiable.
