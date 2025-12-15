import { isDeepStrictEqual } from "node:util";
import mask from "json-mask";
import { integers, lists, type TestCase } from "minitsis-node";
import { deriveMask, escapeJsonMaskKey } from "../src/index.js";

export type NamedPropertyTest = ((testCase: TestCase) => unknown) & { testName: string };

export type PropertyTestConfig = {
  databasePath: string;
  runs: number;
  seed: number;
};

export function getPropertyTestConfig(): PropertyTestConfig {
  const databasePath = ".minitsis-db";
  const seed = Number.isFinite(Number(process.env.MINITSIS_SEED))
    ? Number(process.env.MINITSIS_SEED)
    : 1234;

  const runsFromEnv = Number(process.env.MINITSIS_RUNS);
  const runs =
    Number.isFinite(runsFromEnv) && Number.isInteger(runsFromEnv) && runsFromEnv > 0 ? runsFromEnv : 200;

  return { databasePath, runs, seed };
}

function withTestName<T extends (testCase: TestCase) => unknown>(name: string, fn: T): NamedPropertyTest {
  (fn as unknown as { testName: string }).testName = name;
  return fn as unknown as NamedPropertyTest;
}

const otherKey = "__other__";
const forbiddenKeys = new Set(["__proto__", "constructor", "prototype"]);

const asciiChar = integers(33, 126).map((n) => String.fromCharCode(n));
const keyString = lists(asciiChar, 1, 32).map((chars) => chars.join(""));
const valueString = lists(asciiChar, 0, 32).map((chars) => chars.join(""));

function stripRemovable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripRemovable);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      if (key === "removable") continue;
      out[key] = stripRemovable(record[key]);
    }
    return out;
  }
  return value;
}

const escapeRoundTrip = withTestName("property: escapeJsonMaskKey round-trip", (testCase: TestCase) => {
  const key = testCase.any(keyString);
  testCase.assume(key !== otherKey);
  testCase.assume(!forbiddenKeys.has(key));

  const input: Record<string, unknown> = { [key]: 1, [otherKey]: 2 };
  const filtered = mask(input, escapeJsonMaskKey(key));

  const hasKey = Object.prototype.hasOwnProperty.call(filtered, key) && (filtered as Record<string, unknown>)[key] === 1;
  const onlyKey = Object.keys(filtered as Record<string, unknown>).length === 1;
  if (!hasKey || !onlyKey) {
    throw new Error(
      `json-mask round-trip failed for key=${JSON.stringify(key)} mask=${JSON.stringify(
        escapeJsonMaskKey(key)
      )} got=${JSON.stringify(filtered)}`
    );
  }
});

const deriveMaskDeterministic = withTestName("property: deriveMask deterministic", (testCase: TestCase) => {
  const count = testCase.any(integers(0, 12));
  const minHits = testCase.any(integers(0, 12));

  const items: Array<{ id: number; type: string; extra: string }> = [];
  for (let i = 0; i < count; i += 1) {
    items.push({ id: i, type: "t", extra: testCase.any(valueString) });
  }

  const doc = { items };
  const a = deriveMask(doc, { minHits });
  const b = deriveMask(doc, { minHits });
  if (a !== b) {
    throw new Error(
      `deriveMask is not deterministic: minHits=${minHits} doc=${JSON.stringify(doc)} a=${JSON.stringify(
        a
      )} b=${JSON.stringify(b)}`
    );
  }
});

const missingVsPresentPreventsConstancy = withTestName(
  "property: missing-vs-present prevents constancy",
  (testCase: TestCase) => {
    const count = testCase.any(integers(2, 12));
    const fooValue = testCase.any(valueString);

    const items: Array<{ id: number; foo?: string }> = [];
    let sawPresent = false;
    let sawMissing = false;
    for (let i = 0; i < count; i += 1) {
      const present = testCase.any(integers(0, 1)) === 1;
      if (present) {
        sawPresent = true;
        items.push({ id: i, foo: fooValue });
      } else {
        sawMissing = true;
        items.push({ id: i });
      }
    }
    testCase.assume(sawPresent && sawMissing);

    const derived = deriveMask({ items }, { minHits: count });
    if (!derived.includes("foo")) {
      throw new Error(
        `expected derived mask to include foo when missing differs: count=${count} derived=${JSON.stringify(derived)}`
      );
    }
  }
);

const noIndexSpecialization = withTestName("property: no index-specific output", (testCase: TestCase) => {
  const count = testCase.any(integers(0, 12));
  const items = Array.from({ length: count }, (_, i) => ({ id: i, extra: testCase.any(valueString) }));

  const derived = deriveMask({ items }, { minHits: 0 });
  if (/\/\d+/.test(derived)) {
    throw new Error(`derived mask contains index-specific segment: ${JSON.stringify(derived)}`);
  }
});

const constantContainerRemovesSubtree = withTestName(
  "property: constant containers remove entire subtree",
  (testCase: TestCase) => {
    const count = testCase.any(integers(2, 12));
    const constant = {
      foo: testCase.any(valueString),
      bar: testCase.any(valueString)
    };

    const items = Array.from({ length: count }, (_, i) => ({
      id: i,
      metadata: constant
    }));

    const doc = { items };
    const derived = deriveMask(doc, { minHits: count });
    const slimmed = mask(doc, derived) as { items: Array<Record<string, unknown>> };

    if (derived.includes("metadata")) {
      throw new Error(`expected derived mask to drop metadata: ${JSON.stringify(derived)}`);
    }

    const anyHasMetadata = slimmed.items.some((item) => Object.prototype.hasOwnProperty.call(item, "metadata"));
    if (anyHasMetadata) {
      throw new Error(
        `metadata should be removed from all items: mask=${JSON.stringify(derived)} slimmed=${JSON.stringify(slimmed)}`
      );
    }
  }
);

const injectedRemovableOnly = withTestName(
  "property: injected removable is the only removed field",
  (testCase: TestCase) => {
    const n = testCase.any(integers(2, 10));
    const itemCount = testCase.any(integers(n, 12));

    const possibleKeys = ["k1", "k2", "k3"] as const;
    const removableValue = { is: "removable" };

    const items = Array.from({ length: itemCount }, (_, i) => {
      const include = possibleKeys.map(() => testCase.any(integers(0, 1)) === 1);
      if (!include.some(Boolean)) include[0] = true;

      const item: Record<string, unknown> = { id: i, removable: removableValue };
      for (let k = 0; k < possibleKeys.length; k += 1) {
        if (!include[k]) continue;
        const key = possibleKeys[k]!;
        item[key] = `v-${i}-${key}`;
      }
      return item;
    });

    const doc = { items, other: "other" };
    const derived = deriveMask(doc, { minHits: n });
    const slimmed = mask(doc, derived);

    const expected = stripRemovable(doc);
    if (!isDeepStrictEqual(slimmed, expected)) {
      throw new Error(
        `expected only removable to be dropped: n=${n} mask=${JSON.stringify(derived)}\nexpected=${JSON.stringify(
          expected
        )}\nslimmed=${JSON.stringify(slimmed)}`
      );
    }
  }
);

export const propertyTests: NamedPropertyTest[] = [
  escapeRoundTrip,
  deriveMaskDeterministic,
  missingVsPresentPreventsConstancy,
  noIndexSpecialization,
  constantContainerRemovesSubtree,
  injectedRemovableOnly
];
