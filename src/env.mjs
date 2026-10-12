// A deterministic environment feed, so the whole system is reproducible.
//
// Nothing here is part of the agent's trust model; it just stands in for the
// world mimizuku watches. A seeded PRNG means the same env seed always produces
// the same night, which is what lets the tests assert exact history hashes.

/** mulberry32: a tiny, fast, deterministic PRNG. */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Yields `count` observations. The signal is usually quiet, with rare spikes,
 * so an honest agent mostly holds. Each observation carries the previous signal
 * so the policy stays a pure function of a single observation.
 *
 * @param {number} envSeed
 * @param {number} count
 */
export function* feed(envSeed, count) {
  const rand = mulberry32(envSeed);
  let prev = 0;
  let burst = 0; // when >0, we are inside a rare two-tick high spell
  for (let t = 0; t < count; t++) {
    let signal;
    if (burst > 0) {
      // Second tick of a burst: high, and the previous tick was high too, so a
      // confirmed strike becomes possible. This is the rare moment.
      signal = 0.95 + rand() * 0.05;
      burst--;
    } else if (rand() > 0.9) {
      // ~10% of the time a burst begins: this tick is high (the confirm), and
      // the next tick will also be high.
      burst = 1;
      signal = 0.9 + rand() * 0.1;
    } else {
      // The quiet majority.
      signal = rand() * 0.7;
    }
    signal = Math.min(1, Number(signal.toFixed(4)));
    yield { t, signal, prevSignal: prev };
    prev = signal;
  }
}
