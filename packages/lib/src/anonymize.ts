import { randomBytes } from "node:crypto";

export type AnonymizeOptions = {
  /**
   * Optional deterministic seed for testing/repro.
   * If omitted, a seed is drawn from `crypto.randomBytes`.
   */
  seed?: Uint8Array;
  /**
   * Characters used for replacement strings.
   * Defaults to URL-safe alphanumerics.
   */
  alphabet?: string;
  /**
   * Advanced: inject a PRNG source (used for tests).
   * When provided, `seed` is ignored.
   */
  nextU32?: () => number;
};

type Xoshiro128ss = {
  s0: number;
  s1: number;
  s2: number;
  s3: number;
};

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

function nextU32(state: Xoshiro128ss): number {
  const result = rotl(Math.imul(state.s1, 5) >>> 0, 7);
  const out = Math.imul(result, 9) >>> 0;

  const t = (state.s1 << 9) >>> 0;

  state.s2 ^= state.s0;
  state.s3 ^= state.s1;
  state.s1 ^= state.s2;
  state.s0 ^= state.s3;

  state.s2 ^= t;
  state.s3 = rotl(state.s3, 11);

  return out;
}

function seedFromBytes(seed: Uint8Array): Xoshiro128ss {
  const view = new DataView(seed.buffer, seed.byteOffset, seed.byteLength);
  const s0 = view.getUint32(0, true);
  const s1 = view.getUint32(4, true);
  const s2 = view.getUint32(8, true);
  const s3 = view.getUint32(12, true);
  // Avoid the all-zero state (invalid for xoshiro).
  if ((s0 | s1 | s2 | s3) === 0) return { s0: 1, s1: 0, s2: 0, s3: 0 };
  return { s0, s1, s2, s3 };
}

function defaultAlphabet(): string {
  return "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
}

export type Anonymizer = {
  anonymizeString(input: string): string;
  anonymizeValue(input: unknown): unknown;
};

export function createAnonymizer(options: AnonymizeOptions = {}): Anonymizer {
  const alphabet = options.alphabet ?? defaultAlphabet();
  if (alphabet.length < 2) throw new Error("alphabet must contain at least 2 characters");

  const next =
    options.nextU32 ??
    (() => {
      const seed = options.seed ?? randomBytes(16);
      if (seed.byteLength < 16) throw new Error("seed must be at least 16 bytes");
      const rng = seedFromBytes(seed);
      return () => nextU32(rng);
    })();

  const forward = new Map<string, string>();
  const reverse = new Map<string, string>();

  function randomStringOfLength(length: number): string {
    if (length === 0) return "";
    let out = "";
    for (let i = 0; i < length; i += 1) {
      const idx = next() % alphabet.length;
      out += alphabet[idx]!;
    }
    return out;
  }

  function anonymizeString(input: string): string {
    const existing = forward.get(input);
    if (existing !== undefined) return existing;

    let candidate = randomStringOfLength(input.length);
    while (reverse.has(candidate)) {
      candidate = randomStringOfLength(input.length);
    }

    forward.set(input, candidate);
    reverse.set(candidate, input);
    return candidate;
  }

  function anonymizeValue(input: unknown): unknown {
    if (typeof input === "string") return anonymizeString(input);
    if (typeof input === "number") return input;
    if (typeof input === "boolean") return input;
    if (input === null) return null;
    if (Array.isArray(input)) return input.map(anonymizeValue);
    if (typeof input !== "object") return input;

    const record = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key in record) {
      if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
      const anonKey = anonymizeString(key);
      out[anonKey] = anonymizeValue(record[key]);
    }
    return out;
  }

  return { anonymizeString, anonymizeValue };
}

export function anonymizeJson(input: unknown, options: AnonymizeOptions = {}): unknown {
  return createAnonymizer(options).anonymizeValue(input);
}
