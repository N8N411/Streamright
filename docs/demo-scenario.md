# Demo Scenario: Paid Research Reports

## Story

A market intelligence publisher sells weekly encrypted reports.

## Flow

1. Publisher uploads report PDF.
2. Browser encrypts PDF and uploads ciphertext to storage.
3. Publisher sets policy:
   - price: 0.25 SOL
   - expiration: 30 days
   - max decryptions: 3
   - revocable: true
4. Buyer opens share link and pays.
5. Arcium evaluates policy state and approves request.
6. Buyer decrypts locally.
7. Publisher revokes access if abuse is detected.

## Why It Matters

This model supports direct monetization and policy-backed control without relying on centralized key servers.
