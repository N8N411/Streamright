# Threat Model

## Security Goals

- Prevent unauthorized file decryption.
- Prevent policy bypass (expiry, revocation, payment checks).
- Keep encryption keys out of plaintext server memory.
- Operate safely over public/untrusted storage.

## Adversaries

- Curious storage providers.
- External attackers intercepting network traffic.
- Malicious users replaying old authorization artifacts.
- Insider attacker with access to app infrastructure.

## Assumptions

- Solana consensus and signature verification hold.
- Arcium protocol assumptions hold for configured MPC mode.
- User wallets and local devices are not already compromised.

## Attack Surfaces and Controls

1. Public storage disclosure
   - Control: strong client-side encryption before upload.

2. Replay attacks
   - Control: request nonce and time-bound authorization artifacts.

3. Revocation race conditions
   - Control: latest state checks inside Arcium policy computation.

4. Payment spoofing
   - Control: verify payment receipts linked to asset and requester.

5. Key leakage
   - Control: envelope encryption and no plaintext server key custody.

## Residual Risks

- Compromised end-user devices can expose decrypted content.
- Screenshots and exfiltration after legitimate decrypt are out of cryptographic scope.
