import { describe, expect, test, vi } from "vitest";

vi.mock("node:crypto", () => ({
  randomBytes: () => new Uint8Array(16) // all zeros to exercise all-zero seed handling
}));

describe("createAnonymizer seeded path", () => {
  test("uses crypto seed when no seed/nextU32 is provided", async () => {
    const { createAnonymizer } = await import("../src/anonymize.ts");
    const anonymizer = createAnonymizer();
    const out = anonymizer.anonymizeValue(["x", "y"]) as unknown[];
    expect(out).toHaveLength(2);
    expect(typeof out[0]).toBe("string");
    expect(typeof out[1]).toBe("string");
    expect((out[0] as string).length).toBe(1);
  });
});

