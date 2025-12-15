import { describe, expect, test } from "vitest";
import { generateWildcardCandidates, type JsonMaskSegment } from "../src/index.js";

function key(key: string): JsonMaskSegment {
  return { type: "key", key };
}

function wildcard(): JsonMaskSegment {
  return { type: "wildcard" };
}

describe("generateWildcardCandidates", () => {
  test("prunes redundant wildcards that don't broaden matching", () => {
    const input = [
      [key("a"), key("b")],
      [key("c"), key("b")]
    ];

    const out = generateWildcardCandidates(input);
    expect(out).toHaveLength(3);
    expect(out).toContainEqual([key("a"), key("b")]);
    expect(out).toContainEqual([key("c"), key("b")]);
    expect(out).toContainEqual([wildcard(), key("b")]);
  });

  test("dedupes and is deterministic across input ordering", () => {
    const p1 = [key("a"), key("b")];
    const p2 = [key("a"), key("c")];

    const out1 = generateWildcardCandidates([p1, p2]);
    const out2 = generateWildcardCandidates([p2, p1]);

    expect(out1).toEqual(out2);
    expect(out1).toContainEqual([key("a"), wildcard()]);
    expect(out1).toContainEqual([key("a"), key("b")]);
    expect(out1).toContainEqual([key("a"), key("c")]);
  });

  test("handles empty paths", () => {
    expect(generateWildcardCandidates([[]])).toEqual([[]]);
  });

  test("sorts candidates by length first", () => {
    const out = generateWildcardCandidates([[key("a"), key("b")], [key("a")]]);
    expect(out[0]).toEqual([key("a")]);
    expect(out[out.length - 1]?.length).toBe(2);
  });
});
