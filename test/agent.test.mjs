// Run with:  node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Mimizuku } from '../src/agent.mjs';
import { DEFAULT_POLICY } from '../src/policy.mjs';
import { feed } from '../src/env.mjs';
import { verify } from '../src/verifier.mjs';
import { sign, keypairFromSeed, sha256, canonical, commit } from '../src/crypto.mjs';

const SEED = '11'.repeat(32);

function run(seed = SEED, envSeed = 7, steps = 40, policy = DEFAULT_POLICY) {
  const owl = new Mimizuku(seed, policy);
  for (const obs of feed(envSeed, steps)) owl.step(obs);
  return owl;
}

test('a fresh agent starts with a valid genesis block', () => {
  const owl = new Mimizuku(SEED);
  assert.equal(owl.history.length, 1);
  assert.equal(owl.history[0].kind, 'genesis');
  assert.equal(owl.policyCommitment, commit(DEFAULT_POLICY));
});

test('the same seed and feed produce an identical history', () => {
  const a = run();
  const b = run();
  assert.equal(a.head.hash, b.head.hash);
});

test('a different seed diverges (different identity, different signatures)', () => {
  const a = run('11'.repeat(32));
  const b = run('22'.repeat(32));
  assert.notEqual(a.pubkey, b.pubkey);
  assert.notEqual(a.head.hash, b.head.hash);
});

test('an honest history verifies, and holds vastly outnumber strikes', () => {
  const owl = run();
  const r = verify(owl.history, DEFAULT_POLICY);
  assert.equal(r.ok, true);
  assert.equal(r.checked, owl.history.length);
  assert.ok(r.holds > r.strikes, 'the owl should mostly hold');
});

test('every transition, hold included, carries a valid signature', () => {
  const owl = run();
  for (const b of owl.history) {
    assert.equal(Mimizuku.hashOf(b), b.hash);
  }
});

test('tampering with a decision is rejected', () => {
  const owl = run();
  const h = structuredClone(owl.history);
  const v = h.find((b) => b.kind === 'transition' && b.decision.action === 'hold');
  v.decision = { action: 'strike', size: 1 };
  const r = verify(h, DEFAULT_POLICY);
  assert.equal(r.ok, false);
});

test('playing dead (a re-signed warranted strike recorded as a hold) is rejected', () => {
  const owl = run();
  const h = structuredClone(owl.history);
  const s = h.find((b) => b.kind === 'transition' && b.decision.action === 'strike');
  assert.ok(s, 'need at least one strike for this test');
  s.decision = { action: 'hold' };
  const priv = keypairFromSeed(SEED).priv;
  const { hash, sig, ...rest } = s;
  s.hash = sha256(canonical(rest));
  s.sig = sign(priv, s.hash);
  const r = verify(h, DEFAULT_POLICY);
  assert.equal(r.ok, false, 'a hold that the policy would not choose must fail');
});

test('a forged signature (wrong key) is rejected', () => {
  const owl = run();
  const h = structuredClone(owl.history);
  const b = h[h.length - 1];
  b.sig = sign(keypairFromSeed('00'.repeat(32)).priv, b.hash);
  const r = verify(h, DEFAULT_POLICY);
  assert.equal(r.ok, false);
});

test('reordering blocks breaks the hash chain', () => {
  const owl = run();
  const h = structuredClone(owl.history);
  [h[2], h[3]] = [h[3], h[2]];
  const r = verify(h, DEFAULT_POLICY);
  assert.equal(r.ok, false);
});

test('swapping the policy after the fact is rejected', () => {
  const owl = run();
  const wrongPolicy = { ...DEFAULT_POLICY, strike: 0.1 }; // trigger-happy
  const r = verify(owl.history, wrongPolicy);
  assert.equal(r.ok, false, 'policy must match the genesis commitment');
});
