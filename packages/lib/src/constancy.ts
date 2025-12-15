import { isDeepStrictEqual } from "node:util";
import type { JsonMaskSegment } from "./segments.js";
import { MISSING } from "./missing.js";

export type ConstancyResult = {
  constant: boolean;
  hits: number;
  value?: unknown;
};

function* iterateInstanceValues(
  instance: unknown,
  path: JsonMaskSegment[],
  depth: number
): Generator<unknown, void, void> {
  if (depth >= path.length) {
    yield instance;
    return;
  }

  const segment = path[depth]!;

  if (instance === MISSING) {
    yield* iterateInstanceValues(MISSING, path, depth + 1);
    return;
  }

  if (segment.type === "key") {
    if (instance !== null && typeof instance === "object" && !Array.isArray(instance)) {
      const record = instance as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(record, segment.key)) {
        yield* iterateInstanceValues(record[segment.key], path, depth + 1);
      } else {
        yield* iterateInstanceValues(MISSING, path, depth + 1);
      }
    } else {
      yield* iterateInstanceValues(MISSING, path, depth + 1);
    }
    return;
  }

  if (segment.type === "index") {
    if (Array.isArray(instance)) {
      for (const element of instance) yield* iterateInstanceValues(element, path, depth + 1);
    } else {
      yield* iterateInstanceValues(MISSING, path, depth + 1);
    }
    return;
  }

  // object wildcard
  if (instance !== null && typeof instance === "object" && !Array.isArray(instance)) {
    const record = instance as Record<string, unknown>;
    for (const key of Object.keys(record)) yield* iterateInstanceValues(record[key], path, depth + 1);
  } else {
    yield* iterateInstanceValues(MISSING, path, depth + 1);
  }
}

export function isPathConstant(root: unknown, path: JsonMaskSegment[], minHits = 5): boolean {
  let hits = 0;
  let firstValue: unknown = undefined;
  let hasFirstValue = false;

  for (const value of iterateInstanceValues(root, path, 0)) {
    hits += 1;

    if (!hasFirstValue) {
      firstValue = value;
      hasFirstValue = true;
      continue;
    }

    if (firstValue === MISSING || value === MISSING) {
      if (firstValue !== value) return false;
      continue;
    }

    if (!isDeepStrictEqual(firstValue, value)) return false;
  }

  if (hits === 0) return false;
  if (hits < minHits) return false;
  return true;
}

export function gatherInstanceValues(root: unknown, path: JsonMaskSegment[]): unknown[] {
  let instances: unknown[] = [root];

  for (const segment of path) {
    const next: unknown[] = [];

    for (const instance of instances) {
      if (instance === MISSING) {
        next.push(MISSING);
        continue;
      }

      if (segment.type === "key") {
        if (instance !== null && typeof instance === "object" && !Array.isArray(instance)) {
          const record = instance as Record<string, unknown>;
          if (Object.prototype.hasOwnProperty.call(record, segment.key)) next.push(record[segment.key]);
          else next.push(MISSING);
        } else {
          next.push(MISSING);
        }
        continue;
      }

      if (segment.type === "index") {
        if (Array.isArray(instance)) {
          for (const element of instance) next.push(element);
        } else {
          next.push(MISSING);
        }
        continue;
      }

      // object wildcard
      if (instance !== null && typeof instance === "object" && !Array.isArray(instance)) {
        const record = instance as Record<string, unknown>;
        const keys = Object.keys(record).sort();
        for (const key of keys) next.push(record[key]);
      } else {
        next.push(MISSING);
      }
    }

    instances = next;
  }

  return instances;
}

export function evaluateConstancy(
  root: unknown,
  path: JsonMaskSegment[],
  minHits = 5
): ConstancyResult {
  const values = gatherInstanceValues(root, path);
  const hits = values.length;

  if (hits === 0) return { constant: false, hits };
  if (hits < minHits) return { constant: false, hits };

  const first = values[0];
  for (let i = 1; i < values.length; i += 1) {
    const current = values[i];
    if (first === MISSING || current === MISSING) {
      if (first !== current) return { constant: false, hits };
      continue;
    }
    if (!isDeepStrictEqual(first, current)) return { constant: false, hits };
  }

  return { constant: true, hits, value: first };
}
