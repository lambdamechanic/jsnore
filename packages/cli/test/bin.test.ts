import { afterEach, describe, expect, test } from "vitest";
import { Readable } from "node:stream";

type StdoutWrite = typeof process.stdout.write;
type StderrWrite = typeof process.stderr.write;

function createCaptureWriter(): {
  get: () => string;
  patch: () => () => void;
} {
  let buffer = "";
  return {
    get() {
      return buffer;
    },
    patch() {
      const originalStdoutWrite: StdoutWrite = process.stdout.write.bind(process.stdout);
      const originalStderrWrite: StderrWrite = process.stderr.write.bind(process.stderr);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.stdout as any).write = (chunk: unknown) => {
        buffer += String(chunk);
        return true;
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.stderr as any).write = (chunk: unknown) => {
        buffer += String(chunk);
        return true;
      };

      return () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (process.stdout as any).write = originalStdoutWrite;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (process.stderr as any).write = originalStderrWrite;
      };
    }
  };
}

describe("bin", () => {
  const originalArgv = process.argv.slice();
  const originalExitCode = process.exitCode;

  afterEach(() => {
    process.argv = originalArgv.slice();
    process.exitCode = originalExitCode;
  });

  test("sets exitCode and writes output", async () => {
    const capture = createCaptureWriter();
    const restore = capture.patch();

    const originalStdin = process.stdin;
    Object.defineProperty(process, "stdin", {
      value: Readable.from([
        JSON.stringify({
          items: [
            { id: 1, type: "t", extra: "a" },
            { id: 2, type: "t", extra: "b" },
            { id: 3, type: "t", extra: "c" }
          ]
        })
      ]),
      configurable: true
    });

    process.argv = ["node", "jsnore", "--mask", "--min-hits", "3"];
    process.exitCode = undefined;

    await import("../src/bin.ts");

    restore();
    Object.defineProperty(process, "stdin", { value: originalStdin, configurable: true });

    expect(process.exitCode).toBe(0);
    expect(capture.get()).toBe("items(extra,id)\n");
  });
});
