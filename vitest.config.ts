import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["./packages/lib", "./packages/cli", "./packages/jsonymous"]
  }
});
