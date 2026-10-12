// Low-level primitives for mimizuku. Zero dependencies: Node's built-in crypto only.
//
// Identity is an ed25519 key derived deterministically from a 32-byte seed.
// Integrity is a sha256 hash chain. Every block is signed over its own hash.

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as edSign,
  verify as edVerify,
  randomBytes,
} from 'node:crypto';

// DER wrappers that let us build ed25519 keys from raw 32-byte material,
// which Node's high-level API does not expose directly.
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex'); // + 32-byte seed
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex'); //          + 32-byte pubkey

/** sha256 of a Buffer or string, returned as lowercase hex. */
export function sha256(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Canonical JSON: object keys sorted recursively, no incidental whitespace.
 * Two structurally equal values always serialise to the same bytes, so their
 * hashes match. This is what makes a commitment reproducible by anyone.
 */
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

/** Commitment to any JSON-able value: sha256 over its canonical form. */
export function commit(value) {
  return sha256(canonical(value));
}

/** 32 random bytes, hex. A fresh seed is a fresh animal. */
export function randomSeed() {
  return randomBytes(32).toString('hex');
}

/**
 * Derive an ed25519 keypair from a 32-byte seed (hex or Buffer).
 * The same seed always yields the same key, so identity never has to be stored.
 */
export function keypairFromSeed(seed) {
  const seedBuf = Buffer.isBuffer(seed) ? seed : Buffer.from(seed, 'hex');
  if (seedBuf.length !== 32) throw new Error('seed must be 32 bytes');
  const der = Buffer.concat([PKCS8_PREFIX, seedBuf]);
  const priv = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  const pub = createPublicKey(priv);
  const pubRaw = pub.export({ format: 'der', type: 'spki' }).subarray(-32);
  return { priv, pubkey: Buffer.from(pubRaw).toString('hex') };
}

/** Sign a hex message hash with an ed25519 private key. Returns hex. */
export function sign(priv, hashHex) {
  return edSign(null, Buffer.from(hashHex, 'hex'), priv).toString('hex');
}

/** Verify a signature given only the raw public key bytes (hex). */
export function verify(pubkeyHex, hashHex, sigHex) {
  const der = Buffer.concat([SPKI_PREFIX, Buffer.from(pubkeyHex, 'hex')]);
  const pub = createPublicKey({ key: der, format: 'der', type: 'spki' });
  try {
    return edVerify(null, Buffer.from(hashHex, 'hex'), pub, Buffer.from(sigHex, 'hex'));
  } catch {
    return false;
  }
}

export const ZERO_HASH = '0'.repeat(64);
