import mask from "json-mask";
import { describe, expect, test } from "vitest";
import { renderJsonMaskFromPaths, type JsonMaskSegment } from "../src/index.js";

function key(key: string): JsonMaskSegment {
  return { type: "key", key };
}

function wildcard(): JsonMaskSegment {
  return { type: "wildcard" };
}

function index(): JsonMaskSegment {
  return { type: "index" };
}

describe("renderJsonMaskFromPaths", () => {
  test("groups leaf siblings with parentheses", () => {
    const paths = [[key("items"), index(), key("id")], [key("items"), index(), key("name")]];
    expect(renderJsonMaskFromPaths(paths)).toBe("items(id,name)");

    const input = { items: [{ id: 1, name: "a", extra: true }] };
    expect(mask(input, renderJsonMaskFromPaths(paths))).toEqual({ items: [{ id: 1, name: "a" }] });
  });

  test("groups nested leaf siblings", () => {
    const paths = [[key("a"), key("b"), key("c")], [key("a"), key("b"), key("d")]];
    expect(renderJsonMaskFromPaths(paths)).toBe("a/b(c,d)");

    const input = { a: { b: { c: 1, d: 2, e: 3 } } };
    expect(mask(input, renderJsonMaskFromPaths(paths))).toEqual({ a: { b: { c: 1, d: 2 } } });
  });

  test("renders mixed leaf and non-leaf siblings as comma-separated paths", () => {
    const paths = [[key("a"), key("x")], [key("a"), key("y"), key("z")]];
    expect(renderJsonMaskFromPaths(paths)).toBe("a(x,y/z)");

    const input = { a: { x: 1, y: { z: 2, q: 3 }, other: true } };
    expect(mask(input, renderJsonMaskFromPaths(paths))).toEqual({ a: { x: 1, y: { z: 2 } } });
  });

  test("escapes reserved characters in keys", () => {
    const paths = [[key("a/b"), key("c")]];
    expect(renderJsonMaskFromPaths(paths)).toBe("a\\/b/c");

    const input = { "a/b": { c: 1, d: 2 } };
    expect(mask(input, renderJsonMaskFromPaths(paths))).toEqual({ "a/b": { c: 1 } });
  });

  test("groups wildcard children with parentheses", () => {
    const paths = [[wildcard(), key("a")], [wildcard(), key("b")]];
    expect(renderJsonMaskFromPaths(paths)).toBe("*(a,b)");

    const input = { x: { a: 1, b: 2, c: 3 }, y: { a: 4 } };
    expect(mask(input, renderJsonMaskFromPaths(paths))).toEqual({ x: { a: 1, b: 2 }, y: { a: 4 } });
  });

  test("renders wildcard single-child paths with '/'", () => {
    const paths = [[wildcard(), key("a"), key("b")]];
    expect(renderJsonMaskFromPaths(paths)).toBe("*/a/b");

    const input = { x: { a: { b: 1, c: 2 } }, y: { a: { b: 3 } } };
    expect(mask(input, renderJsonMaskFromPaths(paths))).toEqual({ x: { a: { b: 1 } }, y: { a: { b: 3 } } });
  });

  test("throws for root index nodes", () => {
    expect(() => renderJsonMaskFromPaths([[index(), key("a")]])).toThrow(
      "Index nodes must be rendered by their parent key"
    );
  });

  test("sorts mixed node types before failing on root index", () => {
    expect(() =>
      renderJsonMaskFromPaths([[key("z")], [wildcard(), key("a")], [index(), key("b")]])
    ).toThrow("Index nodes must be rendered by their parent key");
  });

  test("merges array-index and direct children under the same key", () => {
    const paths = [[key("a"), index(), key("x")], [key("a"), key("y")]];
    expect(renderJsonMaskFromPaths(paths)).toBe("a(x,y)");

    const input = { a: { x: 1, y: 2, z: 3 } };
    expect(mask(input, renderJsonMaskFromPaths(paths))).toEqual({ a: { x: 1, y: 2 } });
  });
});
