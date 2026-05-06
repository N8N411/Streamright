# Privacy Explanation

## What Is Encrypted

- File content is encrypted in the client before upload.
- Access policy parameters can be represented and evaluated in Arcium encrypted shared state.
- Key-release authorization is conditioned on cryptographic policy evaluation.

## Who Can Access Data

- Only wallets that satisfy active license conditions:
  - payment completed,
  - license not expired,
  - not revoked,
  - usage limit not exceeded.

## Revocation

- Asset owner can revoke permissions.
- New access evaluations fail once revocation state is active.
- Revocation works even when ciphertext remains publicly available.

## Why This Is Better Than Web2

- No trusted backend needs plaintext data keys.
- Public storage is safe by design because ciphertext is useless without authorization.
- Access control is cryptographically enforced instead of hidden server logic.
