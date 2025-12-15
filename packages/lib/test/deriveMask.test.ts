import { describe, expect, test } from "vitest";
import { deriveMask } from "../src/index.js";
import {
  __testIsCandidateCoveredByConstantPrefix,
  matchesPrefix,
  normalizePathForRender
} from "../src/deriveMask.js";

describe("deriveMask", () => {
  test("uses a default minHits of 5", () => {
    const doc = {
      items: [
        { id: 1, type: "t", extra: "a" },
        { id: 2, type: "t", extra: "b" },
        { id: 3, type: "t", extra: "c" },
        { id: 4, type: "t", extra: "d" },
        { id: 5, type: "t", extra: "e" }
      ]
    };

    expect(deriveMask(doc)).toBe("items(extra,id)");
  });

  test("drops constant fields across array elements when hits >= minHits", () => {
    const doc = {
      items: [
        { id: 1, type: "t", extra: "a" },
        { id: 2, type: "t", extra: "b" },
        { id: 3, type: "t", extra: "c" }
      ]
    };

    expect(deriveMask(doc, { minHits: 3 })).toBe("items(extra,id)");
  });

  test("keeps fields when hits < minHits", () => {
    const doc = { items: [{ id: 1, type: "t" }, { id: 2, type: "t" }, { id: 3, type: "t" }] };
    expect(deriveMask(doc, { minHits: 4 })).toBe("items(id,type)");
  });

  test("treats missing as distinct from present (prevents constancy)", () => {
    const doc = { items: [{ id: 1, foo: "x" }, { id: 2 }, { id: 3, foo: "x" }] };
    expect(deriveMask(doc, { minHits: 3 })).toBe("items(foo,id)");
  });

  test("normalizes array-of-primitive leaves by stripping trailing index", () => {
    const doc = { items: [1, 2, 3] };
    expect(deriveMask(doc, { minHits: 3 })).toBe("items");
  });

  test("supports root arrays by stripping leading index", () => {
    const doc = [{ id: 1, type: "t" }, { id: 2, type: "t" }, { id: 3, type: "t" }];
    expect(deriveMask(doc, { minHits: 3 })).toBe("id");
  });

  test("returns empty mask when there are no keepable paths", () => {
    expect(deriveMask({ a: 1 }, { minHits: 1 })).toBe("");
  });

  test("returns empty mask for primitive roots (no keepable paths)", () => {
    expect(deriveMask(123, { minHits: 1 })).toBe("");
  });

  test("can treat wildcarded key segments as constant (covers wildcard constant prefix logic)", () => {
    const doc = {
      a: { x: 1, keep: "a" },
      b: { x: 1, keep: "b" }
    };

    // With minHits 2, `*/x` is constant but single-hit container paths like `a` are not.
    expect(deriveMask(doc, { minHits: 2 })).toBe("a/keep,b/keep");
  });
});

describe("deriveMask internal helpers", () => {
  test("matchesPrefix handles all segment combinations", () => {
    expect(matchesPrefix([{ type: "key", key: "a" }], [{ type: "key", key: "a" }])).toBe(true);
    expect(matchesPrefix([{ type: "wildcard" }], [{ type: "key", key: "a" }])).toBe(true);
    expect(matchesPrefix([{ type: "index" }], [{ type: "index" }])).toBe(true);

    expect(
      matchesPrefix(
        [{ type: "key", key: "a" }, { type: "key", key: "b" }],
        [{ type: "key", key: "a" }]
      )
    ).toBe(false);
    expect(matchesPrefix([{ type: "wildcard" }], [{ type: "index" }])).toBe(false);
    expect(matchesPrefix([{ type: "index" }], [{ type: "key", key: "a" }])).toBe(false);
    expect(matchesPrefix([{ type: "key", key: "a" }], [{ type: "index" }])).toBe(false);
    expect(matchesPrefix([{ type: "key", key: "a" }], [{ type: "key", key: "b" }])).toBe(false);
  });

  test("normalizePathForRender strips leading and trailing index segments", () => {
    expect(normalizePathForRender([{ type: "index" }, { type: "key", key: "a" }])).toEqual([
      { type: "key", key: "a" }
    ]);
    expect(normalizePathForRender([{ type: "key", key: "items" }, { type: "index" }])).toEqual([
      { type: "key", key: "items" }
    ]);
    expect(
      normalizePathForRender([{ type: "key", key: "items" }, { type: "index" }, { type: "index" }])
    ).toEqual([{ type: "key", key: "items" }]);
    expect(
      normalizePathForRender([{ type: "index" }, { type: "index" }, { type: "key", key: "a" }])
    ).toEqual([{ type: "key", key: "a" }]);
  });

  test("__testIsCandidateCoveredByConstantPrefix can return false for prefix candidates", () => {
    expect(
      __testIsCandidateCoveredByConstantPrefix(
        [[{ type: "key", key: "a" }, { type: "key", key: "b" }]],
        [{ type: "key", key: "a" }]
      )
    ).toBe(false);
  });

  test("__testIsCandidateCoveredByConstantPrefix handles branching (covers dedupe path)", () => {
    expect(
      __testIsCandidateCoveredByConstantPrefix(
        [
          [{ type: "key", key: "a" }],
          [{ type: "wildcard" }, { type: "key", key: "x" }]
        ],
        [{ type: "key", key: "a" }, { type: "key", key: "x" }]
      )
    ).toBe(true);
  });

  test("__testIsCandidateCoveredByConstantPrefix reuses existing nodes for shared prefixes", () => {
    expect(
      __testIsCandidateCoveredByConstantPrefix(
        [
          [{ type: "key", key: "a" }, { type: "key", key: "b" }],
          [{ type: "key", key: "a" }, { type: "key", key: "c" }]
        ],
        [{ type: "key", key: "a" }, { type: "key", key: "b" }, { type: "key", key: "d" }]
      )
    ).toBe(true);
  });
});
