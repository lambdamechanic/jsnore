import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { run, type Reader } from "../src/cli.js";

function createWriter(): { writer: { write(chunk: string): void }; get: () => string } {
  const chunks: string[] = [];
  return {
    writer: {
      write(chunk: string) {
        chunks.push(chunk);
      }
    },
    get() {
      return chunks.join("");
    }
  };
}

function createReader(text: string): Reader {
  return {
    async read() {
      return text;
    }
  };
}

function createFailingReader(message: string): Reader {
  return {
    async read() {
      throw new Error(message);
    }
  };
}

describe("run", () => {
  test("--help writes usage", async () => {
    const out = createWriter();
    const err = createWriter();

    const code = await run(["--help"], createFailingReader("stdin not needed"), out.writer, err.writer);

    expect(code).toBe(0);
    expect(err.get()).toBe("");
    expect(out.get()).toContain("Usage:");
  });

  test("--version writes version", async () => {
    const out = createWriter();
    const err = createWriter();

    const code = await run(["--version"], createFailingReader("stdin not needed"), out.writer, err.writer);

    expect(code).toBe(0);
    expect(err.get()).toBe("");
    expect(out.get()).toBe("0.0.0\n");
  });

  test("unknown option returns 2", async () => {
    const out = createWriter();
    const err = createWriter();

    const code = await run(["--nope"], createFailingReader("stdin not needed"), out.writer, err.writer);

    expect(code).toBe(2);
    expect(out.get()).toBe("");
    expect(err.get()).toBe("Unknown option: --nope\n");
  });

  test("--mask prints derived mask from stdin", async () => {
    const out = createWriter();
    const err = createWriter();

    const input = JSON.stringify({
      items: [
        { id: 1, type: "t", extra: "a" },
        { id: 2, type: "t", extra: "b" },
        { id: 3, type: "t", extra: "c" }
      ]
    });

    const code = await run(["--mask", "--min-hits", "3"], createReader(input), out.writer, err.writer);

    expect(code).toBe(0);
    expect(err.get()).toBe("");
    expect(out.get()).toBe("items(extra,id)\n");
  });

  test("prints slimmed JSON by default (compact)", async () => {
    const out = createWriter();
    const err = createWriter();

    const input = JSON.stringify({
      items: [
        { id: 1, type: "t", extra: "a" },
        { id: 2, type: "t", extra: "b" },
        { id: 3, type: "t", extra: "c" }
      ]
    });

    const code = await run(["--min-hits=3"], createReader(input), out.writer, err.writer);

    expect(code).toBe(0);
    expect(err.get()).toBe("");
    expect(out.get().endsWith("\n")).toBe(true);
    expect(JSON.parse(out.get())).toEqual({
      items: [
        { id: 1, extra: "a" },
        { id: 2, extra: "b" },
        { id: 3, extra: "c" }
      ]
    });
  });

  test("--pretty prints formatted JSON", async () => {
    const out = createWriter();
    const err = createWriter();

    const input = JSON.stringify({ items: [1, 2, 3] });
    const code = await run(["--pretty"], createReader(input), out.writer, err.writer);

    expect(code).toBe(0);
    expect(err.get()).toBe("");
    expect(out.get()).toBe(JSON.stringify({ items: [1, 2, 3] }, null, 2) + "\n");
  });

  test("reads from file when a positional file argument is provided", async () => {
    const out = createWriter();
    const err = createWriter();

    const dir = await mkdtemp(join(tmpdir(), "jsnore-cli-"));
    try {
      const filePath = join(dir, "input.json");
      await writeFile(filePath, JSON.stringify({ items: [1, 2, 3] }), "utf8");

      const code = await run([filePath, "--pretty"], createFailingReader("stdin should not be used"), out.writer, err.writer);

      expect(code).toBe(0);
      expect(err.get()).toBe("");
      expect(out.get()).toBe(JSON.stringify({ items: [1, 2, 3] }, null, 2) + "\n");
    } finally {
      await rm(dir, { force: true, recursive: true });
    }
  });

  test("--min-hits can prevent constancy when increased", async () => {
    const out = createWriter();
    const err = createWriter();

    const input = JSON.stringify({
      items: [
        { id: 1, type: "t" },
        { id: 2, type: "t" },
        { id: 3, type: "t" }
      ]
    });

    const code = await run(["--mask", "--min-hits", "4"], createReader(input), out.writer, err.writer);

    expect(code).toBe(0);
    expect(err.get()).toBe("");
    expect(out.get()).toBe("items(id,type)\n");
  });

  test("errors on invalid JSON", async () => {
    const out = createWriter();
    const err = createWriter();

    const code = await run([], createReader("{nope"), out.writer, err.writer);

    expect(code).toBe(1);
    expect(out.get()).toBe("");
    expect(err.get()).toContain("Invalid JSON:");
  });

  test("errors on missing --min-hits value", async () => {
    const out = createWriter();
    const err = createWriter();

    const code = await run(["--min-hits"], createReader("{}"), out.writer, err.writer);

    expect(code).toBe(2);
    expect(out.get()).toBe("");
    expect(err.get()).toBe("Missing value for --min-hits\n");
  });

  test("errors on invalid --min-hits values", async () => {
    const out = createWriter();
    const err = createWriter();

    const code = await run(["--min-hits=-1"], createReader("{}"), out.writer, err.writer);

    expect(code).toBe(2);
    expect(out.get()).toBe("");
    expect(err.get()).toBe("Invalid --min-hits: -1\n");
  });

  test("errors when more than one input file is provided", async () => {
    const out = createWriter();
    const err = createWriter();

    const code = await run(
      ["one.json", "two.json"],
      createFailingReader("stdin not needed"),
      out.writer,
      err.writer
    );

    expect(code).toBe(2);
    expect(out.get()).toBe("");
    expect(err.get()).toBe("Only one input file is supported\n");
  });

  test("errors when stdin read fails", async () => {
    const out = createWriter();
    const err = createWriter();

    const code = await run([], createFailingReader("boom"), out.writer, err.writer);

    expect(code).toBe(1);
    expect(out.get()).toBe("");
    expect(err.get()).toContain("Failed to read input:");
  });

  test("supports --compact (including repeated flags)", async () => {
    const out = createWriter();
    const err = createWriter();

    const code = await run(["--compact", "--compact", "--mask"], createReader("{}"), out.writer, err.writer);

    expect(code).toBe(0);
    expect(err.get()).toBe("");
    expect(out.get()).toBe("\n");
  });

  test("supports repeated --pretty and switching back to compact", async () => {
    const out = createWriter();
    const err = createWriter();

    const input = JSON.stringify({ items: [1, 2, 3] });
    const code = await run(["--pretty", "--pretty", "--compact"], createReader(input), out.writer, err.writer);

    expect(code).toBe(0);
    expect(err.get()).toBe("");
    expect(JSON.parse(out.get())).toEqual({ items: [1, 2, 3] });
  });

  test("outputs an empty projection when the derived mask is empty", async () => {
    const out = createWriter();
    const err = createWriter();

    expect(await run(["--min-hits", "1"], createReader(JSON.stringify({ a: 1 })), out.writer, err.writer)).toBe(0);
    expect(err.get()).toBe("");
    expect(out.get()).toBe("{}\n");

    const out2 = createWriter();
    const err2 = createWriter();
    expect(await run(["--min-hits", "1"], createReader(JSON.stringify([1, 2, 3])), out2.writer, err2.writer)).toBe(0);
    expect(err2.get()).toBe("");
    expect(out2.get()).toBe("[]\n");

    const out3 = createWriter();
    const err3 = createWriter();
    expect(await run(["--min-hits", "1"], createReader(JSON.stringify(123)), out3.writer, err3.writer)).toBe(0);
    expect(err3.get()).toBe("");
    expect(out3.get()).toBe("null\n");
  });

  test("--apply-mask applies an explicit json-mask expression", async () => {
    const out = createWriter();
    const err = createWriter();

    const input = JSON.stringify({ a: { x: 1, y: 2 }, b: 3 });
    const code = await run(["--apply-mask", "a/x"], createReader(input), out.writer, err.writer);

    expect(code).toBe(0);
    expect(err.get()).toBe("");
    expect(out.get()).toBe(JSON.stringify({ a: { x: 1 } }) + "\n");
  });

  test("--apply-mask supports --pretty formatting", async () => {
    const out = createWriter();
    const err = createWriter();

    const input = JSON.stringify({ a: { x: 1, y: 2 } });
    const code = await run(["--apply-mask=a/x", "--pretty"], createReader(input), out.writer, err.writer);

    expect(code).toBe(0);
    expect(err.get()).toBe("");
    expect(out.get()).toBe(JSON.stringify({ a: { x: 1 } }, null, 2) + "\n");
  });

  test("--apply-mask conflicts with --mask", async () => {
    const out = createWriter();
    const err = createWriter();

    const code = await run(
      ["--apply-mask", "a/x", "--mask"],
      createFailingReader("stdin not needed"),
      out.writer,
      err.writer
    );

    expect(code).toBe(2);
    expect(out.get()).toBe("");
    expect(err.get()).toBe("Cannot combine --mask with --apply-mask\n");
  });

  test("--apply-mask requires exactly one expression", async () => {
    const out = createWriter();
    const err = createWriter();

    expect(await run(["--apply-mask"], createReader("{}"), out.writer, err.writer)).toBe(2);
    expect(err.get()).toBe("Missing value for --apply-mask\n");

    const out2 = createWriter();
    const err2 = createWriter();
    expect(
      await run(["--apply-mask", "a", "--apply-mask", "b"], createReader("{}"), out2.writer, err2.writer)
    ).toBe(2);
    expect(err2.get()).toBe("Only one --apply-mask is supported\n");
  });
});
