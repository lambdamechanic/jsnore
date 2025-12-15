import type { JsonMaskSegment } from "./segments.js";
import { enumerateNodes } from "./enumerate.js";
import { generateWildcardCandidates } from "./candidates.js";
import { isPathConstant } from "./constancy.js";
import { renderJsonMaskFromPaths } from "./renderMask.js";

export type DeriveMaskOptions = {
  minHits?: number;
};

type ConstantPrefixNode = {
  terminal: boolean;
  keys: Map<string, ConstantPrefixNode>;
  wildcard?: ConstantPrefixNode;
  index?: ConstantPrefixNode;
};

function createConstantPrefixNode(): ConstantPrefixNode {
  return { terminal: false, keys: new Map() };
}

function addConstantCandidatePrefix(root: ConstantPrefixNode, candidate: JsonMaskSegment[]): void {
  let node = root;
  for (const segment of candidate) {
    if (segment.type === "key") {
      const existing = node.keys.get(segment.key);
      if (existing) node = existing;
      else {
        const next = createConstantPrefixNode();
        node.keys.set(segment.key, next);
        node = next;
      }
      continue;
    }
    if (segment.type === "index") {
      node.index ??= createConstantPrefixNode();
      node = node.index;
      continue;
    }
    node.wildcard ??= createConstantPrefixNode();
    node = node.wildcard;
  }
  node.terminal = true;
}

function isCandidateCoveredByConstantPrefix(
  root: ConstantPrefixNode,
  candidate: JsonMaskSegment[]
): boolean {
  let current: ConstantPrefixNode[] = [root];
  let next: ConstantPrefixNode[] = [];

  for (const segment of candidate) {
    for (const node of current) if (node.terminal) return true;

    for (const node of current) {
      if (segment.type === "index") {
        if (node.index) next.push(node.index);
        continue;
      }

      if (segment.type === "key") {
        const byKey = node.keys.get(segment.key);
        if (byKey) next.push(byKey);
        if (node.wildcard) next.push(node.wildcard);
        continue;
      }

      // wildcard segment
      if (node.wildcard) next.push(node.wildcard);
    }

    if (next.length === 0) return false;

    // Deduplicate without Set: keep only unique node references.
    // This is typically small (bounded by branching in constant-prefix trie).
    if (next.length > 1) {
      for (let i = 0; i < next.length; i += 1) {
        const node = next[i]!;
        for (let j = i + 1; j < next.length; ) {
          if (next[j] === node) next.splice(j, 1);
          else j += 1;
        }
      }
    }

    current = next;
    next = [];
  }

  for (const node of current) if (node.terminal) return true;
  return false;
}

export function matchesPrefix(candidate: JsonMaskSegment[], concrete: JsonMaskSegment[]): boolean {
  if (candidate.length > concrete.length) return false;
  for (let i = 0; i < candidate.length; i += 1) {
    const c = candidate[i]!;
    const p = concrete[i]!;

    if (c.type === "wildcard") {
      if (p.type !== "key") return false;
      continue;
    }
    if (c.type === "index") {
      if (p.type !== "index") return false;
      continue;
    }
    if (p.type !== "key") return false;
    if (c.key !== p.key) return false;
  }
  return true;
}

export function normalizePathForRender(path: JsonMaskSegment[]): JsonMaskSegment[] {
  let normalized = path;

  while (normalized[0]?.type === "index") normalized = normalized.slice(1);
  while (normalized[normalized.length - 1]?.type === "index") normalized = normalized.slice(0, -1);

  return normalized;
}

export function deriveMask(doc: unknown, options: DeriveMaskOptions = {}): string {
  const minHits = options.minHits ?? 5;

  const nodes = enumerateNodes(doc);
  const allPaths = nodes
    .map((node) => node.path)
    .filter((path) => path.length > 0);

  const candidates = generateWildcardCandidates(allPaths);
  const constantPrefixTrie = createConstantPrefixNode();
  for (const candidate of candidates) {
    if (isCandidateCoveredByConstantPrefix(constantPrefixTrie, candidate)) continue;
    if (!isPathConstant(doc, candidate, minHits)) continue;
    addConstantCandidatePrefix(constantPrefixTrie, candidate);
  }

  const keep = nodes
    .filter((node) => node.kind === "leaf")
    .map((node) => node.path)
    .filter((path) => {
      if (path.length === 0) return false;
      return !isCandidateCoveredByConstantPrefix(constantPrefixTrie, path);
    })
    .map(normalizePathForRender)
    .filter((path) => path.length > 0);

  if (keep.length === 0) return "";
  return renderJsonMaskFromPaths(keep);
}
