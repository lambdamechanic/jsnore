import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { run } from "../src/cli.js";

type MemWriter = { chunks: string[]; write(chunk: string): void };
function createWriter(): MemWriter {
  return { chunks: [], write(chunk: string) { this.chunks.push(chunk); } };
}

describe("jsonymous CLI", () => {
  test("prints help", async () => {
    const stdout = createWriter();
    const stderr = createWriter();
    const code = await run(["--help"], { read: async () => "" }, stdout, stderr);
    expect(code).toBe(0);
    expect(stderr.chunks.join("")).toBe("");
    expect(stdout.chunks.join("")).toContain("jsonymous");
  });

  test("prints version", async () => {
    const stdout = createWriter();
    const stderr = createWriter();
    const code = await run(["--version"], { read: async () => "" }, stdout, stderr);
    expect(code).toBe(0);
    expect(stderr.chunks.join("")).toBe("");
    expect(stdout.chunks.join("")).toBe("0.0.0\n");
  });

  test("anonymizes stdin JSON and preserves validity", async () => {
    const input = JSON.stringify({ a: "x", n: 1, nested: { a: "x" } });
    const stdout = createWriter();
    const stderr = createWriter();

    const code = await run([], { read: async () => input }, stdout, stderr);
    expect(code).toBe(0);
    expect(stderr.chunks.join("")).toBe("");

    const output = stdout.chunks.join("");
    const parsed = JSON.parse(output);

    expect(Object.values(parsed).some((v) => v === 1)).toBe(true);
  });

  test("supports pretty output and file input", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jsonymous-"));
    const file = join(dir, "input.json");
    await writeFile(file, JSON.stringify({ a: "x" }));

    const stdout = createWriter();
    const stderr = createWriter();

    const code = await run(["--pretty", file], { read: async () => "" }, stdout, stderr);
    expect(code).toBe(0);
    expect(stderr.chunks.join("")).toBe("");
    expect(stdout.chunks.join("")).toContain("\n  ");
  });

  test("supports compact output", async () => {
    const stdout = createWriter();
    const stderr = createWriter();

    const code = await run(["--compact"], { read: async () => JSON.stringify({ a: "x" }) }, stdout, stderr);
    expect(code).toBe(0);
    expect(stderr.chunks.join("")).toBe("");
    expect(stdout.chunks.join("")).not.toContain("\n  ");
  });

  test("errors when multiple input files are provided", async () => {
    const stdout = createWriter();
    const stderr = createWriter();

    const code = await run(["a.json", "b.json"], { read: async () => "" }, stdout, stderr);
    expect(code).toBe(2);
    expect(stdout.chunks.join("")).toBe("");
    expect(stderr.chunks.join("")).toContain("Only one input file is supported");
  });

  test("errors on read failure", async () => {
    const stdout = createWriter();
    const stderr = createWriter();

    const code = await run(["/definitely-not-a-file.json"], { read: async () => "" }, stdout, stderr);
    expect(code).toBe(1);
    expect(stdout.chunks.join("")).toBe("");
    expect(stderr.chunks.join("")).toContain("Failed to read input:");
  });

  test("errors on unknown option", async () => {
    const stdout = createWriter();
    const stderr = createWriter();

    const code = await run(["--nope"], { read: async () => "{}" }, stdout, stderr);
    expect(code).toBe(2);
    expect(stdout.chunks.join("")).toBe("");
    expect(stderr.chunks.join("")).toContain("Unknown option:");
  });

  test("errors on invalid JSON", async () => {
    const stdout = createWriter();
    const stderr = createWriter();

    const code = await run([], { read: async () => "{" }, stdout, stderr);
    expect(code).toBe(1);
    expect(stdout.chunks.join("")).toBe("");
    expect(stderr.chunks.join("")).toContain("Invalid JSON:");
  });
});
