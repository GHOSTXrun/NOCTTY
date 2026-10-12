# NOCTTY

CA: TBA

**An on-chain agent that signs its silence.**

Most autonomous agents only ever prove what they *did*. The moments they hold
still, which are almost all of their life, are a blind spot no one can verify.
From the outside, discipline and a muzzle look the same. NOCTTY closes that
gap: every transition it makes, including the ones where it does nothing,
carries a proof that the decision followed from what it observed under a fixed
policy. Silence is a decision here, and a decision it has to prove.

> The invariant: every transition ships a proof `πₜ` that its decision follows
> from a committed observation `oₜ` under the pinned policy `M`, even when that
> decision is to do nothing. Any transition without a valid `πₜ` is rejected.

This repository holds the landing page and the **phase-1 core**: the full
lifecycle, the signed append-only history, and the hold-or-strike logic, running
off chain. No dependencies, no build step.

## Run it

Requires Node 18+.

```bash
node src/demo.mjs   # live a night, verify it, then watch three attacks get rejected
node --test         # the test suite
```

The demo lives one simulated night, verifies the whole record, then attacks it:

- **flip a hold to a strike** &rarr; rejected (the stored block no longer hashes)
- **play dead** (record a warranted strike as a hold, re-signed so the signature
  itself is valid) &rarr; rejected (the policy, re-run on the observation, returns
  a strike, so the hold does not follow)
- **forge a block with the wrong key** &rarr; rejected (bad signature)

## How it works

One observation, one decision, one proof, again and again. The policy `M` is
pinned at birth and never moves.

```
observe oₜ  ->  decide  aₜ = M(oₜ)  ->  prove πₜ  ->  append to history
     ^                                                      |
     └──────────────────── every step, hold included ───────┘
```

Each block links to the previous one by hash and is signed over its own hash, so
the record cannot be reordered, rewritten, or silently skipped. A verifier holds
no secrets: it re-derives every claim from public data.

| File | Role |
| --- | --- |
| `src/crypto.mjs` | ed25519 keys from a seed, sha256, canonical JSON, commitments |
| `src/policy.mjs` | the pinned policy `M`: a pure, deterministic `decide(observation)` |
| `src/agent.mjs` | the agent: `observe -> decide -> prove -> append` loop and signed history |
| `src/verifier.mjs` | independent verifier: hash chain, signatures, and *decision follows from observation* |
| `src/env.mjs` | a deterministic, seeded signal feed (a stand-in for the world) |
| `src/demo.mjs` | end-to-end run plus the three attacks |
| `test/` | the test suite |

## The proof, honestly scoped

In phase 1 the "proof" is a deterministic recomputation: the verifier re-runs the
pinned policy on the revealed observation and checks the decision matches, on top
of the hash chain and signatures. This already makes silence accountable and
makes playing dead impossible, but it reveals the observation.

Phase 2 replaces that reveal with a Groth16 proof that the decision follows from
the observation *without* revealing it. The policy is kept small and pure exactly
so that step is feasible. See `circuits/`.

Phase 3 moves verification on chain: a Solana program that verifies `πₜ` and
rejects any transition, silent or not, that arrives without a valid proof. See
`program/`.

## Roadmap

- **Now** — the loop, the signed history, and the verifier run off chain (this repo).
- **Next** — a Groth16 circuit for `decision = M(observation)` with the observation hidden.
- **Later** — a Solana / Anchor program that verifies proofs on chain.

## Layout

The landing page (`index.html`, `styles.css`, `NOCTTY.png`) lives at the repo
root. The agent code is under `src/` and `test/`.

## License

MIT. See [LICENSE](LICENSE).

## Frontend preview

Open index.html in a browser. The static frontend requires no installation or build step.
