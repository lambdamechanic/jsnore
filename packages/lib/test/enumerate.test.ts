import { describe, expect, test } from "vitest";
import { MISSING, enumerateNodes, isMissing, missingAwareEqual } from "../src/index.js";

describe("enumerateNodes", () => {
  test("enumerates a primitive root as a single leaf node", () => {
    expect(enumerateNodes(42)).toEqual([{ kind: "leaf", path: [], value: 42 }]);
  });

  test("enumerates containers and leaves with deterministic ordering", () => {
    const input = { b: 1, a: [{ z: 2 }, 3] };

    expect(enumerateNodes(input)).toEqual([
      { kind: "object", path: [], value: input },
      { kind: "array", path: [{ type: "key", key: "a" }], value: input.a },
      { kind: "object", path: [{ type: "key", key: "a" }, { type: "index" }], value: input.a[0] },
      {
        kind: "leaf",
        path: [{ type: "key", key: "a" }, { type: "index" }, { type: "key", key: "z" }],
        value: 2
      },
      { kind: "leaf", path: [{ type: "key", key: "a" }, { type: "index" }], value: 3 },
      { kind: "leaf", path: [{ type: "key", key: "b" }], value: 1 }
    ]);
  });
});

describe("missing sentinel", () => {
  test("isMissing detects the sentinel", () => {
    expect(isMissing(MISSING)).toBe(true);
    expect(isMissing(undefined)).toBe(false);
  });

  test("missingAwareEqual treats missing-vs-present as different", () => {
    expect(missingAwareEqual(MISSING, MISSING)).toBe(true);
    expect(missingAwareEqual(MISSING, 1)).toBe(false);
    expect(missingAwareEqual(1, MISSING)).toBe(false);
  });

  test("missingAwareEqual uses Object.is for non-missing values", () => {
    expect(missingAwareEqual(NaN, NaN)).toBe(true);
    expect(missingAwareEqual(0, -0)).toBe(false);
  });
});
