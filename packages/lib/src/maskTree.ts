import type { JsonMaskSegment } from "./segments.js";

export type MaskTree = {
  children: Map<string, MaskTreeNode>;
};

export type MaskTreeNode = {
  segment: JsonMaskSegment;
  children: Map<string, MaskTreeNode>;
};

function segmentKey(segment: JsonMaskSegment): string {
  if (segment.type === "index") return "[]";
  if (segment.type === "wildcard") return "*";
  return `k:${segment.key}`;
}

export function createMaskTree(): MaskTree {
  return { children: new Map() };
}

export function addPathToMaskTree(tree: MaskTree, path: JsonMaskSegment[]): void {
  let current = tree.children;

  for (const segment of path) {
    const key = segmentKey(segment);
    const existing = current.get(key);
    if (existing) {
      current = existing.children;
      continue;
    }
    const next: MaskTreeNode = { segment, children: new Map() };
    current.set(key, next);
    current = next.children;
  }
}

export function buildMaskTree(paths: JsonMaskSegment[][]): MaskTree {
  const tree = createMaskTree();
  for (const path of paths) addPathToMaskTree(tree, path);
  return tree;
}
