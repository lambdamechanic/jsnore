export const MISSING: unique symbol = Symbol("jsnore.missing");
export type Missing = typeof MISSING;

export function isMissing(value: unknown): value is Missing {
  return value === MISSING;
}

export function missingAwareEqual(a: unknown, b: unknown): boolean {
  if (a === MISSING || b === MISSING) return a === b;
  return Object.is(a, b);
}

