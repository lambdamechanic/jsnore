import mask from "json-mask";
import { describe, expect, test } from "vitest";
import {
  escapeJsonMaskKey,
  greet,
  joinJsonMaskPath,
  renderJsonMaskSegment,
  type JsonMaskSegment
} from "../src/index.js";

function key(key: string): JsonMaskSegment {
  return { type: "key", key };
}

function wildcard(): JsonMaskSegment {
  return { type: "wildcard" };
}

describe("escapeJsonMaskKey", () => {
  test("escapes json-mask terminals and backslash", () => {
    expect(escapeJsonMaskKey("a/b")).toBe("a\\/b");
    expect(escapeJsonMaskKey("a,b")).toBe("a\\,b");
    expect(escapeJsonMaskKey("a(b)")).toBe("a\\(b\\)");
    expect(escapeJsonMaskKey("a\\b")).toBe("a\\\\b");
  });

  test("escapes literal wildcard key", () => {
    expect(escapeJsonMaskKey("*")).toBe("\\*");
  });
});

describe("renderJsonMaskSegment", () => {
  test("renders wildcard segment as unescaped '*'", () => {
    expect(renderJsonMaskSegment(wildcard())).toBe("*");
  });

  test("renders index segment as '*'", () => {
    expect(renderJsonMaskSegment({ type: "index" })).toBe("*");
  });

  test("renders key segment with escaping", () => {
    expect(renderJsonMaskSegment(key("a/b"))).toBe("a\\/b");
  });
});

describe("joinJsonMaskPath", () => {
  test("joins escaped segments with '/'", () => {
    expect(joinJsonMaskPath([key("a/b"), key("c")])).toBe("a\\/b/c");
  });

  test("supports wildcard segment", () => {
    expect(joinJsonMaskPath([wildcard(), key("x")])).toBe("*/x");
  });
});

describe("json-mask round-trip", () => {
  test("selects properties whose keys contain reserved characters", () => {
    const input = {
      "a/b": { c: 1 },
      "a,b": 2,
      "a(b)": 3,
      "a\\b": 4,
      "*": 5,
      other: 6
    };

    expect(mask(input, joinJsonMaskPath([key("a/b"), key("c")]))).toEqual({ "a/b": { c: 1 } });
    expect(mask(input, joinJsonMaskPath([key("a,b")]))).toEqual({ "a,b": 2 });
    expect(mask(input, joinJsonMaskPath([key("a(b)")]))).toEqual({ "a(b)": 3 });
    expect(mask(input, joinJsonMaskPath([key("a\\b")]))).toEqual({ "a\\b": 4 });
    expect(mask(input, joinJsonMaskPath([key("*")]))).toEqual({ "*": 5 });
  });
});

describe("greet", () => {
  test("returns greeting", () => {
    expect(greet("world")).toBe("hello world");
  });
});
