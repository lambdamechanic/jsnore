import type { JsonMaskSegment } from "./segments.js";

export type EnumeratedNodeKind = "array" | "leaf" | "object";

export type EnumeratedNode = {
  kind: EnumeratedNodeKind;
  path: JsonMaskSegment[];
  value: unknown;
};

export function enumerateNodes(root: unknown): EnumeratedNode[] {
  const nodes: EnumeratedNode[] = [];

  function visit(value: unknown, path: JsonMaskSegment[]): void {
    if (Array.isArray(value)) {
      nodes.push({ kind: "array", path, value });
      for (let index = 0; index < value.length; index += 1) {
        visit(value[index], [...path, { type: "index" }]);
      }
      return;
    }

    if (value !== null && typeof value === "object") {
      nodes.push({ kind: "object", path, value });
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      for (const key of keys) {
        visit(record[key], [...path, { type: "key", key }]);
      }
      return;
    }

    nodes.push({ kind: "leaf", path, value });
  }

  visit(root, []);
  return nodes;
}
