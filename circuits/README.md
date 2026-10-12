# circuits — phase 2 (not yet implemented)

Phase 2 replaces the phase-1 reveal with a zero-knowledge proof.

Today the verifier re-runs the pinned policy `M` on the *revealed* observation
`oₜ` and checks the decision matches. That is honest and checkable, but it shows
the observation.

The goal here is a Groth16 circuit that proves

```
decision aₜ = M(oₜ)   for a committed oₜ, under the committed policy M
```

without revealing `oₜ`. The policy in `../src/policy.mjs` is kept small and pure
precisely so it can be expressed as a circuit.

Not started. Tracked so the roadmap is legible, not to imply it exists.
