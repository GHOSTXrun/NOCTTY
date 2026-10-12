# program — phase 3 (not yet implemented)

Phase 3 moves verification on chain.

A Solana / Anchor program that:

- stores the genesis commitment (pubkey + policy commitment),
- verifies the proof `πₜ` for every transition,
- rejects any transition, silent or not, that arrives without a valid proof,
- anchors the append-only history so it can no longer fork.

Depends on phase 2 (see `../circuits`). Not started. Tracked so the roadmap is
legible, not to imply it exists.
