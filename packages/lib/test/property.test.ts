import { createNodeDatabase, runTest } from "minitsis-node";
import { describe, test } from "vitest";
import { getPropertyTestConfig, propertyTests } from "../property/tests.js";

describe("property tests (minitsis)", () => {
  const { databasePath, runs, seed } = getPropertyTestConfig();
  const db = createNodeDatabase(databasePath);

  for (const property of propertyTests) {
    test(
      property.testName,
      async () => {
        await runTest(runs, seed, db, true)(property);
      },
      60_000
    );
  }
});

