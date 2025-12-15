import { afterEach, describe, expect, test, vi } from "vitest";
import { Readable } from "node:stream";

vi.mock("node:crypto", () => ({
  randomBytes: () => new Uint8Array(16).fill(7)
}));

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

  test("sets exitCode and writes anonymized JSON", async () => {
    const capture = createCaptureWriter();
    const restore = capture.patch();

    const originalStdin = process.stdin;
    Object.defineProperty(process, "stdin", {
      value: Readable.from([JSON.stringify({ hello: "world", n: 1 })]),
      configurable: true
    });

    process.argv = ["node", "jsonymous"];
    process.exitCode = undefined;

    await import("../src/bin.ts");

    restore();
    Object.defineProperty(process, "stdin", { value: originalStdin, configurable: true });

    expect(process.exitCode).toBe(0);
    const out = JSON.parse(capture.get());
    expect(Object.values(out).some((v) => v === 1)).toBe(true);
  });
});
