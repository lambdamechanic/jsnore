import { describe, expect, test } from "vitest";
import { anonymizeJson, createAnonymizer } from "../src/index.js";

describe("anonymizeJson", () => {
  test("replaces string keys and values with same-length strings", () => {
    const seed = new Uint8Array(16);
    seed[0] = 1;

    const input = { hello: "world", n: 123, ok: true, none: null, nested: { hello: "world" } };
    const out = anonymizeJson(input, { seed }) as Record<string, unknown>;

    const outKeys = Object.keys(out);
    expect(outKeys).toHaveLength(5);
    for (const key of outKeys) expect(key.length).toBeGreaterThan(0);

    expect(out).not.toHaveProperty("hello");
    expect(out).not.toHaveProperty("nested");

    expect(Object.values(out).some((v) => v === 123)).toBe(true);
    expect(Object.values(out).some((v) => v === true)).toBe(true);
    expect(Object.values(out).some((v) => v === null)).toBe(true);

    // Find the anonymized key for the original "hello"
    const anonHelloKey = createAnonymizer({ seed }).anonymizeString("hello");
    expect(anonHelloKey.length).toBe(5);
    expect(typeof out[anonHelloKey]).toBe("string");
    expect((out[anonHelloKey] as string).length).toBe(5);
  });

  test("caches conversions for stable mapping within a run", () => {
    const seed = new Uint8Array(16);
    seed[0] = 2;

    const anonymizer = createAnonymizer({ seed });
    expect(anonymizer.anonymizeString("x")).toBe(anonymizer.anonymizeString("x"));
    expect(anonymizer.anonymizeString("x")).not.toBe(anonymizer.anonymizeString("y"));

    const out = anonymizer.anonymizeValue({ a: "x", b: "x" }) as Record<string, unknown>;
    const values = Object.values(out);
    expect(values[0]).toBe(values[1]);
  });

  test("preserves string length including empty strings", () => {
    const seed = new Uint8Array(16);
    seed[0] = 3;

    const out = anonymizeJson({ empty: "" }, { seed }) as Record<string, unknown>;
    const anonKey = Object.keys(out)[0]!;
    expect(anonKey.length).toBe(5);
    expect(out[anonKey]).toBe("");
  });

  test("skips inherited properties", () => {
    const seed = new Uint8Array(16);
    seed[0] = 4;

    const proto: Record<string, unknown> = { inherited: "x" };
    const obj = Object.create(proto) as Record<string, unknown>;
    obj.own = "y";

    const out = anonymizeJson(obj, { seed }) as Record<string, unknown>;
    expect(Object.keys(out)).toHaveLength(1);
  });

  test("passes through non-JSON primitives", () => {
    const seed = new Uint8Array(16);
    seed[0] = 5;
    expect(anonymizeJson(undefined, { seed })).toBe(undefined);
  });

  test("throws on invalid alphabet or seed size", () => {
    const seed = new Uint8Array(16);
    seed[0] = 6;
    expect(() => createAnonymizer({ seed, alphabet: "a" })).toThrow(
      "alphabet must contain at least 2 characters"
    );
    expect(() => createAnonymizer({ seed: new Uint8Array(15) })).toThrow("seed must be at least 16 bytes");
  });

  test("regenerates on output collisions", () => {
    const seq = [0, 0, 1];
    const nextU32 = () => seq.shift() ?? 0;
    const anonymizer = createAnonymizer({ alphabet: "ab", nextU32 });

    expect(anonymizer.anonymizeString("x")).toBe("a");
    expect(anonymizer.anonymizeString("y")).toBe("b");
  });
});
