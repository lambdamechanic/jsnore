import type { JsonMaskSegment } from "./segments.js";

function serializePath(path: JsonMaskSegment[]): string {
  return JSON.stringify(path);
}

export function generateWildcardCandidates(paths: JsonMaskSegment[][]): JsonMaskSegment[][] {
  const seen = new Set<string>();
  const candidates: JsonMaskSegment[][] = [];

  for (const path of paths) {
    const keyIndices: number[] = [];
    const keySegmentsAtIndex: Array<{ type: "key"; key: string } | undefined> = [];

    for (let index = 0; index < path.length; index += 1) {
      const segment = path[index];
      if (segment?.type === "key") {
        keyIndices.push(index);
        keySegmentsAtIndex[index] = segment;
      }
    }

    const working = path.slice();

    const visit = (keyIndex: number): void => {
      if (keyIndex >= keyIndices.length) {
        const candidate = working.slice();
        const key = serializePath(candidate);
        if (seen.has(key)) return;
        seen.add(key);
        candidates.push(candidate);
        return;
      }

      const segmentIndex = keyIndices[keyIndex];
      const original = keySegmentsAtIndex[segmentIndex]!;

      visit(keyIndex + 1);
      working[segmentIndex] = { type: "wildcard" };
      visit(keyIndex + 1);
      working[segmentIndex] = original;
    };

    visit(0);
  }

  candidates.sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    return serializePath(a).localeCompare(serializePath(b));
  });

  return candidates;
}
