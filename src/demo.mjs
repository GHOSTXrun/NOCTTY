// A full run of the phase-1 core, end to end.
//
//   node src/demo.mjs
//
// It lives one night, verifies the whole record, then plays three attacks
// against it: a tampered hold, a play-dead (a strike recorded as a hold), and
// a forged signature. Each one is caught.

import { Mimizuku } from './agent.mjs';
import { DEFAULT_POLICY } from './policy.mjs';
import { feed } from './env.mjs';
import { verify } from './verifier.mjs';
import { sign, keypairFromSeed, sha256, canonical } from './crypto.mjs';

const SEED = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2';
const ENV_SEED = 7;
const STEPS = 40;

function rule(label) {
  console.log('\n' + '─'.repeat(60));
  if (label) console.log(label);
  console.log('─'.repeat(60));
}

// ── Live a night ──────────────────────────────────────────────────────────
rule('mimizuku · phase 1 · off-chain core');

const owl = new Mimizuku(SEED, DEFAULT_POLICY);
console.log('pubkey            ', owl.pubkey);
console.log('policy            ', owl.policy.name, 'v' + owl.policy.version);
console.log('policy commitment ', owl.policyCommitment);

let line = '';
for (const obs of feed(ENV_SEED, STEPS)) {
  const b = owl.step(obs);
  line += b.decision.action === 'strike' ? '◆' : '·';
}
console.log('\nthe night (· hold, ◆ strike):');
console.log('  ' + line);

const strikes = owl.history.filter((b) => b.decision && b.decision.action === 'strike');
console.log(`\n${owl.history.length} blocks: 1 genesis, ${owl.history.length - 1} transitions`);
console.log(`holds: ${owl.history.length - 1 - strikes.length}   strikes: ${strikes.length}`);
for (const s of strikes) {
  console.log(`  strike @ block ${s.index}: signal ${s.obs.signal} (prev ${s.obs.prevSignal})`);
}

// ── Verify the honest record ────────────────────────────────────────────────
rule('verify the honest history');
console.log(verify(owl.history, DEFAULT_POLICY));

// ── Attack 1: tamper with a hold ────────────────────────────────────────────
rule('attack 1 · flip a hold to a strike');
{
  const forged = structuredClone(owl.history);
  const victim = forged.find((b) => b.kind === 'transition' && b.decision.action === 'hold');
  victim.decision = { action: 'strike', size: 1 };
  const r = verify(forged, DEFAULT_POLICY);
  console.log(`tampered block ${victim.index}. verifier:`, r.ok ? 'ACCEPTED (bug!)' : `REJECTED — ${r.reason}`);
}

// ── Attack 2: play dead ─────────────────────────────────────────────────────
// The signal warranted a strike, but the agent records a hold to look away.
rule('attack 2 · play dead (record a warranted strike as a hold)');
{
  const forged = structuredClone(owl.history);
  const s = forged.find((b) => b.kind === 'transition' && b.decision.action === 'strike');
  if (s) {
    s.decision = { action: 'hold' };
    // Re-hash and re-sign so the signature itself is valid — the lie is only in
    // the decision. The verifier still catches it by recomputing the policy.
    const priv = keypairFromSeed(SEED).priv;
    const { hash, sig, ...rest } = s;
    s.hash = sha256(canonical(rest));
    s.sig = sign(priv, s.hash);
    const r = verify(forged, DEFAULT_POLICY);
    console.log(`re-signed block ${s.index} as a hold. verifier:`, r.ok ? 'ACCEPTED (bug!)' : `REJECTED — ${r.reason}`);
  } else {
    console.log('(no strike in this night to hide; try another ENV_SEED)');
  }
}

// ── Attack 3: forge a signature ─────────────────────────────────────────────
rule('attack 3 · forge a block with the wrong key');
{
  const forged = structuredClone(owl.history);
  const b = forged[forged.length - 1];
  const wrong = keypairFromSeed('00'.repeat(32)).priv;
  b.sig = sign(wrong, b.hash); // valid signature, wrong signer
  const r = verify(forged, DEFAULT_POLICY);
  console.log(`re-signed block ${b.index} with a stranger's key. verifier:`, r.ok ? 'ACCEPTED (bug!)' : `REJECTED — ${r.reason}`);
}

rule('');
console.log('Every action, and every silence, is on the record and checkable.');
