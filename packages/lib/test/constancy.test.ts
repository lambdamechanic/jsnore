import { describe, expect, test } from "vitest";
import {
  MISSING,
  evaluateConstancy,
  gatherInstanceValues,
  isPathConstant,
  type JsonMaskSegment
} from "../src/index.js";

function key(key: string): JsonMaskSegment {
  return { type: "key", key };
}

function wildcard(): JsonMaskSegment {
  return { type: "wildcard" };
}

function index(): JsonMaskSegment {
  return { type: "index" };
}

describe("gatherInstanceValues", () => {
  test("propagates missing for absent keys", () => {
    const input = { a: { b: 1 }, c: { b: 1 }, d: {} };
    expect(gatherInstanceValues(input, [wildcard(), key("b")])).toEqual([1, 1, MISSING]);
  });

  test("treats non-objects as missing when selecting a key", () => {
    const input = { a: 1 };
    expect(gatherInstanceValues(input, [key("a"), key("b")])).toEqual([MISSING]);
  });

  test("propagates missing across later wildcards", () => {
    const input = { a: {} };
    expect(gatherInstanceValues(input, [key("a"), key("b"), wildcard()])).toEqual([MISSING]);
  });

  test("wildcard on an empty object yields no instances", () => {
    expect(gatherInstanceValues({}, [wildcard()])).toEqual([]);
  });

  test("index on a non-array yields missing", () => {
    expect(gatherInstanceValues({ a: 1 }, [key("a"), index()])).toEqual([MISSING]);
  });

  test("wildcard on a non-object yields missing", () => {
    expect(gatherInstanceValues({ a: 1 }, [key("a"), wildcard()])).toEqual([MISSING]);
  });
});

describe("evaluateConstancy", () => {
  test("honors minHits", () => {
    const input = { a: { b: 1 }, c: { b: 1 } };
    expect(evaluateConstancy(input, [wildcard(), key("b")], 3)).toEqual({ constant: false, hits: 2 });
  });

  test("marks constant when all instance values deeply equal and hits >= minHits", () => {
    const input = { a: { b: { c: 1 } }, c: { b: { c: 1 } }, d: { b: { c: 1 } } };
    expect(evaluateConstancy(input, [wildcard(), key("b")], 3)).toEqual({
      constant: true,
      hits: 3,
      value: { c: 1 }
    });
  });

  test("uses deep equality for non-missing values", () => {
    const input = { a: { b: 1 }, c: { b: 2 }, d: { b: 1 } };
    expect(evaluateConstancy(input, [wildcard(), key("b")], 3)).toEqual({ constant: false, hits: 3 });
  });

  test("missing-vs-present prevents constancy; missing-vs-missing does not", () => {
    const input1 = { a: { b: 1 }, c: { b: 1 }, d: {} };
    expect(evaluateConstancy(input1, [wildcard(), key("b")], 3)).toEqual({ constant: false, hits: 3 });

    const input2 = { a: {}, c: {}, d: {} };
    expect(evaluateConstancy(input2, [wildcard(), key("b")], 3)).toEqual({
      constant: true,
      hits: 3,
      value: MISSING
    });
  });

  test("handles wildcard expansion over arrays", () => {
    const input = { arr: [{ x: 1 }, { x: 1 }, {}] };
    expect(gatherInstanceValues(input, [key("arr"), index(), key("x")])).toEqual([1, 1, MISSING]);
    expect(evaluateConstancy(input, [key("arr"), index(), key("x")], 3)).toEqual({
      constant: false,
      hits: 3
    });
  });

  test("returns non-constant when there are zero hits", () => {
    expect(evaluateConstancy({}, [wildcard()], 0)).toEqual({ constant: false, hits: 0 });
  });
});

describe("isPathConstant", () => {
  test("returns false when there are zero hits", () => {
    expect(isPathConstant({}, [wildcard()], 0)).toBe(false);
  });

  test("returns false when hits < minHits", () => {
    const input = [{ b: 1 }, { b: 1 }];
    expect(isPathConstant(input, [index(), key("b")], 3)).toBe(false);
  });

  test("returns false when missing is mixed with present", () => {
    const input = [{ b: 1 }, {}, { b: 1 }];
    expect(isPathConstant(input, [index(), key("b")], 3)).toBe(false);
  });

  test("returns true when all values equal and hits >= minHits", () => {
    const input = [{ b: { x: 1 } }, { b: { x: 1 } }, { b: { x: 1 } }];
    expect(isPathConstant(input, [index(), key("b")], 3)).toBe(true);
  });
});
