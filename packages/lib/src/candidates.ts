import type { JsonMaskSegment } from "./segments.js";

function serializePath(path: JsonMaskSegment[]): string {
  return JSON.stringify(path);
}

type TrieNode = {
  keys: Map<string, TrieNode>;
  index?: TrieNode;
};

function createTrieNode(): TrieNode {
  return { keys: new Map() };
}

function buildTrie(paths: JsonMaskSegment[][]): TrieNode {
  const root = createTrieNode();

  for (const path of paths) {
    let node = root;
    for (const segment of path) {
      if (segment.type === "index") {
        node.index ??= createTrieNode();
        node = node.index;
        continue;
      }
      if (segment.type !== "key") {
        // When passed already-generalized paths, fall back to treating these segments as opaque.
        // The primary production input to this function is concrete paths (keys + indices).
        break;
      }
      const existing = node.keys.get(segment.key);
      if (existing) node = existing;
      else {
        const next = createTrieNode();
        node.keys.set(segment.key, next);
        node = next;
      }
    }
  }

  return root;
}

export function generateWildcardCandidates(paths: JsonMaskSegment[][]): JsonMaskSegment[][] {
  const seen = new Set<string>();
  const candidates: JsonMaskSegment[][] = [];

  const trie = buildTrie(paths);

  for (const path of paths) {
    const working = path.slice();

    // Track the set of trie nodes this prefix pattern can match.
    // Use arrays (not Set) to reduce overhead and keep signatures deterministic.
    const visit = (pos: number, nodeSet: TrieNode[]): void => {
      if (pos >= path.length) {
        const candidate = working.slice();
        const key = serializePath(candidate);
        if (seen.has(key)) return;
        seen.add(key);
        candidates.push(candidate);
        return;
      }

      const segment = path[pos]!;

      if (segment.type === "index") {
        const nextNodes: TrieNode[] = [];
        for (const node of nodeSet) if (node.index) nextNodes.push(node.index);
        if (nextNodes.length === 0) return;
        working[pos] = segment;
        visit(pos + 1, nextNodes);
        return;
      }

      if (segment.type !== "key") {
        // This generator primarily targets concrete paths. For already-generalized paths,
        // keep the segment and continue without branching.
        working[pos] = segment;
        visit(pos + 1, nodeSet);
        return;
      }

      const keepNodes: TrieNode[] = [];
      for (const node of nodeSet) {
        const child = node.keys.get(segment.key);
        if (child) keepNodes.push(child);
      }
      if (keepNodes.length === 0) return;

      working[pos] = segment;
      visit(pos + 1, keepNodes);

      // If wildcarding at this position doesn't broaden the matching set, skip it.
      // This happens when every possible node has exactly one key child and it's the same key.
      let wildcardIsRedundant = true;
      for (const node of nodeSet) {
        if (node.keys.size !== 1 || !node.keys.has(segment.key)) {
          wildcardIsRedundant = false;
          break;
        }
      }
      if (wildcardIsRedundant) return;

      const wildcardNodes: TrieNode[] = [];
      for (const node of nodeSet) for (const child of node.keys.values()) wildcardNodes.push(child);
      if (wildcardNodes.length === 0) return;

      working[pos] = { type: "wildcard" };
      visit(pos + 1, wildcardNodes);
      working[pos] = segment;
    };

    visit(0, [trie]);
  }

  candidates.sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    return serializePath(a).localeCompare(serializePath(b));
  });

  return candidates;
}
