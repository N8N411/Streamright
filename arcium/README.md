# Arcium Integration Notes

This module will contain:
- Arcis policy circuits for access validation,
- encrypted shared state structures,
- TypeScript integration code for submitting computations and awaiting finalization.

Current status:
- SDK orchestration layer now models Arcium policy I/O and status payload mapping.
- Solana program supports `PaidPendingArcium -> Approved/Denied` transitions.

## Planned Policy Inputs

- `asset_id`
- `buyer_pubkey`
- `payment_receipt_ref`
- `request_unix`
- `expires_at_unix`
- `revoked`
- `uses_so_far`
- `max_uses`
- `price_lamports`

## Expected Outputs

- `approved` boolean
- `reason_code`
- `authorization_id`
- updated usage counter state

## Security Intent

Arcium policy evaluation must be the gate for key-release artifacts. No backend service should be able to unilaterally bypass policy conditions.
