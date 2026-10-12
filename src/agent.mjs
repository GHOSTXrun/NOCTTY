// Mimizuku: the agent.
//
// It runs one loop forever: observe, decide, prove, append. Every pass produces
// a signed block, including the passes where the decision is to do nothing. The
// history is append-only and hash-linked, so it cannot be reordered or rewritten,
// and no step can be silently omitted without the chain noticing.

import { keypairFromSeed, commit, sha256, canonical, sign, ZERO_HASH } from './crypto.mjs';
import { decide, DEFAULT_POLICY } from './policy.mjs';

export class Mimizuku {
  /**
   * @param {string} seed 32-byte hex seed. The key, and thus the identity.
   * @param {object} [policy] pinned policy parameters (defaults to DEFAULT_POLICY)
   */
  constructor(seed, policy = DEFAULT_POLICY) {
    const { priv, pubkey } = keypairFromSeed(seed);
    this._priv = priv;
    this.pubkey = pubkey;
    this.policy = policy;
    this.policyCommitment = commit(policy);
    this.history = [];
    this._genesis();
  }

  /** The signable payload of a block is everything except its own signature. */
  static payload(block) {
    const { sig, ...rest } = block;
    return rest;
  }

  /** Recompute the hash a block commits to (its payload minus hash/sig). */
  static hashOf(block) {
    const { hash, sig, ...rest } = block;
    return sha256(canonical(rest));
  }

  _seal(partial) {
    const hash = sha256(canonical(partial));
    const sig = sign(this._priv, hash);
    const block = { ...partial, hash, sig };
    this.history.push(block);
    return block;
  }

  _genesis() {
    this._seal({
      index: 0,
      prevHash: ZERO_HASH,
      kind: 'genesis',
      pubkey: this.pubkey,
      policyCommitment: this.policyCommitment,
    });
  }

  get head() {
    return this.history[this.history.length - 1];
  }

  /**
   * One turn of the loop. Commit to the observation, run the pinned policy,
   * and seal a signed block for the decision, be it strike or hold.
   *
   * @param {{signal:number, prevSignal:number}} obs
   * @returns the sealed block
   */
  step(obs) {
    const decision = decide(obs, this.policy);
    return this._seal({
      index: this.history.length,
      prevHash: this.head.hash,
      kind: 'transition',
      obs, // revealed in phase 1; phase 2 replaces this with a zk proof
      obsCommitment: commit(obs),
      policyCommitment: this.policyCommitment,
      decision,
    });
  }
}
