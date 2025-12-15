import type { JsonMaskSegment } from "./segments.js";
import { enumerateNodes } from "./enumerate.js";
import { generateWildcardCandidates } from "./candidates.js";
import { evaluateConstancy } from "./constancy.js";
import { renderJsonMaskFromPaths } from "./renderMask.js";

export type DeriveMaskOptions = {
  minHits?: number;
};

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
  const constantCandidates = candidates.filter(
    (candidate) => evaluateConstancy(doc, candidate, minHits).constant
  );

  const keep = nodes
    .filter((node) => node.kind === "leaf")
    .map((node) => node.path)
    .filter((path) => {
      if (path.length === 0) return false;
      return !constantCandidates.some((candidate) => matchesPrefix(candidate, path));
    })
    .map(normalizePathForRender)
    .filter((path) => path.length > 0);

  if (keep.length === 0) return "";

  const deduped: JsonMaskSegment[][] = [];
  const seen = new Set<string>();
  for (const path of keep) {
    const key = JSON.stringify(path);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(path);
  }

  return renderJsonMaskFromPaths(deduped);
}
