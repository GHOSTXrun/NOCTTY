// The verifier. Anyone can run it, holding no secrets.
//
// It re-derives every claim in the history from public data. This is the
// phase-1 form of "even silence must be signed": a hold is only valid if the
// pinned policy, run on the committed observation, actually returns hold. A
// forged signature, a broken link, a swapped policy, or a decision that does
// not follow from what was seen all fail here.
//
// Phase 2 swaps the "recompute the decision from the revealed observation" step
// for a Groth16 proof that the decision follows without revealing the observation.

import { commit, sha256, canonical, verify as verifySig, ZERO_HASH } from './crypto.mjs';
import { decide } from './policy.mjs';
import { Mimizuku } from './agent.mjs';

/**
 * @param {object[]} history the chain of blocks
 * @param {object} params the public, pinned policy parameters
 * @returns {{ok:boolean, checked:number, holds:number, strikes:number, reason?:string, index?:number}}
 */
export function verify(history, params) {
  if (!Array.isArray(history) || history.length === 0) {
    return { ok: false, checked: 0, holds: 0, strikes: 0, reason: 'empty history' };
  }

  const fail = (index, reason) => ({ ok: false, checked: index, holds, strikes, reason, index });

  let holds = 0;
  let strikes = 0;
  let pubkey = null;
  let policyCommitment = null;

  for (let i = 0; i < history.length; i++) {
    const b = history[i];

    // 1. Structure and hash integrity.
    if (b.index !== i) return fail(i, 'index out of order');
    if (Mimizuku.hashOf(b) !== b.hash) return fail(i, 'hash does not match contents');

    // 2. Genesis pins identity and the policy commitment.
    if (i === 0) {
      if (b.kind !== 'genesis') return fail(i, 'first block is not genesis');
      if (b.prevHash !== ZERO_HASH) return fail(i, 'genesis has a parent');
      pubkey = b.pubkey;
      policyCommitment = b.policyCommitment;
      if (commit(params) !== policyCommitment) return fail(i, 'policy does not match its commitment');
      if (!verifySig(pubkey, b.hash, b.sig)) return fail(i, 'bad genesis signature');
      continue;
    }

    // 3. Chain linkage.
    if (b.prevHash !== history[i - 1].hash) return fail(i, 'broken link to previous block');
    if (b.kind !== 'transition') return fail(i, 'unexpected block kind');
    if (b.policyCommitment !== policyCommitment) return fail(i, 'policy was swapped mid-life');

    // 4. The observation must match its commitment (no swapping inputs after the fact).
    if (commit(b.obs) !== b.obsCommitment) return fail(i, 'observation does not match its commitment');

    // 5. The decision must follow from the observation under the pinned policy.
    //    This is the heart of it: a hold that the policy would not have chosen
    //    is not a valid hold. Silence has to be earned.
    const expected = decide(b.obs, params);
    if (canonical(expected) !== canonical(b.decision)) {
      return fail(i, `decision does not follow from observation (expected ${expected.action}, got ${b.decision.action})`);
    }

    // 6. The signature must be the agent's, over this exact block.
    if (!verifySig(pubkey, b.hash, b.sig)) return fail(i, 'bad signature');

    if (b.decision.action === 'strike') strikes++;
    else holds++;
  }

  return { ok: true, checked: history.length, holds, strikes };
}
