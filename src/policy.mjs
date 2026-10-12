// The policy M.
//
// This is the whole disposition of a mimizuku: a pure, deterministic function
// from one observation to one decision. It is pinned at birth and never changes.
// It is also the exact thing a future Groth16 circuit (phase 2) will prove was
// run honestly. Keeping it small and pure is what makes that possible.
//
// The default policy is deliberately reluctant: it holds unless a strong signal
// is confirmed by the one before it. Most observations resolve to "hold".

/** The pinned parameters of the default policy. Public, fixed at birth. */
export const DEFAULT_POLICY = Object.freeze({
  name: 'reluctant-raptor',
  version: 1,
  strike: 0.94, // this reading must clear this to even consider a strike
  confirm: 0.9, // and the previous reading must have cleared this too
  size: 1, // size of a strike, in whatever unit the environment settles
});

/**
 * decide(observation, params) -> decision
 *
 * Pure and total: same inputs, same output, no side effects, no clock, no I/O.
 * The observation carries everything the decision depends on (including the
 * previous signal) so a verifier can recompute the decision from the block alone.
 *
 * @param {{signal:number, prevSignal:number}} obs
 * @param {typeof DEFAULT_POLICY} params
 * @returns {{action:'hold'|'strike', size?:number}}
 */
export function decide(obs, params = DEFAULT_POLICY) {
  const strong = typeof obs.signal === 'number' && obs.signal >= params.strike;
  const confirmed = typeof obs.prevSignal === 'number' && obs.prevSignal >= params.confirm;
  if (strong && confirmed) return { action: 'strike', size: params.size };
  return { action: 'hold' };
}
