import { createNodeDatabase, runTest } from "minitsis-node";
import { getPropertyTestConfig, propertyTests } from "./tests.js";

async function main(): Promise<void> {
  const { databasePath, runs, seed } = getPropertyTestConfig();
  const db = createNodeDatabase(databasePath);

  for (const t of propertyTests) {
    await runTest(runs, seed, db, true)(t);
  }
}

await main();

