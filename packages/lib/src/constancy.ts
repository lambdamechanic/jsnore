import { isDeepStrictEqual } from "node:util";
import type { JsonMaskSegment } from "./segments.js";
import { MISSING } from "./missing.js";

export type ConstancyResult = {
  constant: boolean;
  hits: number;
  value?: unknown;
};

export function isPathConstant(root: unknown, path: JsonMaskSegment[], minHits = 5): boolean {
  const pathLength = path.length;
  const deepEqual = isDeepStrictEqual;

  let hits = 0;
  let firstValue: unknown = undefined;
  let hasFirstValue = false;

  const hasOwn = Object.prototype.hasOwnProperty;
  const isArray = Array.isArray;
  const values: unknown[] = [root];
  const depths: number[] = [0];

  while (values.length > 0) {
    const instance = values.pop()!;
    const depth = depths.pop()!;

    if (depth >= pathLength) {
      hits += 1;

      if (!hasFirstValue) {
        firstValue = instance;
        hasFirstValue = true;
        continue;
      }

      if (firstValue === instance) continue;

      if (firstValue === MISSING || instance === MISSING) return false;

      const firstIsObject = firstValue !== null && typeof firstValue === "object";
      const instanceIsObject = instance !== null && typeof instance === "object";
      if (!firstIsObject || !instanceIsObject) return false;

      if (!deepEqual(firstValue, instance)) return false;
      continue;
    }

    const nextDepth = depth + 1;
    const segment = path[depth]!;

    if (instance === MISSING) {
      values.push(MISSING);
      depths.push(nextDepth);
      continue;
    }

    const isObject = instance !== null && typeof instance === "object";
    const isInstanceArray = isObject && isArray(instance);

    if (segment.type === "key") {
      if (isObject && !isInstanceArray) {
        const record = instance as Record<string, unknown>;
        if (hasOwn.call(record, segment.key)) {
          values.push(record[segment.key]);
          depths.push(nextDepth);
        } else {
          values.push(MISSING);
          depths.push(nextDepth);
        }
      } else {
        values.push(MISSING);
        depths.push(nextDepth);
      }
      continue;
    }

    if (segment.type === "index") {
      if (isInstanceArray) {
        for (let i = instance.length - 1; i >= 0; i -= 1) {
          values.push(instance[i]);
          depths.push(nextDepth);
        }
      } else {
        values.push(MISSING);
        depths.push(nextDepth);
      }
      continue;
    }

    // object wildcard
    if (isObject && !isInstanceArray) {
      const record = instance as Record<string, unknown>;
      for (const key in record) {
        if (!hasOwn.call(record, key)) continue;
        values.push(record[key]);
        depths.push(nextDepth);
      }
    } else {
      values.push(MISSING);
      depths.push(nextDepth);
    }
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
  const deepEqual = isDeepStrictEqual;

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
    if (!deepEqual(first, current)) return { constant: false, hits };
  }

  return { constant: true, hits, value: first };
}
