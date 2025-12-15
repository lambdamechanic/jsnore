import { describe, expect, test } from "vitest";
import { generateWildcardCandidates, type JsonMaskSegment } from "../src/index.js";

function key(key: string): JsonMaskSegment {
  return { type: "key", key };
}

function wildcard(): JsonMaskSegment {
  return { type: "wildcard" };
}

describe("generateWildcardCandidates", () => {
  test("generates all wildcard combinations for key segments (no max wildcards)", () => {
    const input = [[key("a"), key("b")]];

    expect(generateWildcardCandidates(input)).toEqual([
      [key("a"), key("b")],
      [key("a"), wildcard()],
      [wildcard(), key("b")],
      [wildcard(), wildcard()]
    ]);
  });

  test("dedupes and is deterministic across input ordering", () => {
    const p1 = [key("a"), wildcard(), key("b")];
    const p2 = [key("a"), wildcard(), key("c")];

    const out1 = generateWildcardCandidates([p1, p2]);
    const out2 = generateWildcardCandidates([p2, p1]);

    expect(out1).toEqual(out2);
    expect(out1).toContainEqual([wildcard(), wildcard(), wildcard()]);
    expect(out1).toContainEqual([key("a"), wildcard(), key("b")]);
    expect(out1).toContainEqual([key("a"), wildcard(), key("c")]);
  });

  test("handles empty paths", () => {
    expect(generateWildcardCandidates([[]])).toEqual([[]]);
  });

  test("sorts candidates by length first", () => {
    const out = generateWildcardCandidates([[key("a"), key("b")], [key("a")]]);
    expect(out[0]).toEqual([key("a")]);
    expect(out[out.length - 1]).toEqual([wildcard(), wildcard()]);
  });
});
