import { readFile } from "node:fs/promises";
import mask from "json-mask";
import { deriveMask } from "@jsnore/lib";

export type Writer = { write(chunk: string): void };
export type Reader = { read(): Promise<string> };

type OutputFormat = "compact" | "pretty";

type ParsedArgs =
  | { kind: "help" }
  | { kind: "version" }
  | {
      kind: "run";
      inputFilePath?: string;
      maskOnly: boolean;
      applyMaskExpr?: string;
      minHits: number;
      format: OutputFormat;
    }
  | { kind: "error"; message: string; exitCode: number };

function parseArgs(argv: string[]): ParsedArgs {
  let inputFilePath: string | undefined;
  let maskOnly = false;
  let applyMaskExpr: string | undefined;
  let minHits = 5;
  let format: OutputFormat = "compact";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;

    if (arg === "--help" || arg === "-h") return { kind: "help" };
    if (arg === "--version" || arg === "-v") return { kind: "version" };

    if (arg === "--mask") {
      maskOnly = true;
      continue;
    }

    if (arg === "--apply-mask" || arg.startsWith("--apply-mask=")) {
      const raw =
        arg === "--apply-mask" ? argv[index + 1] : arg.slice("--apply-mask=".length);
      if (arg === "--apply-mask") index += 1;
      if (!raw) return { kind: "error", message: "Missing value for --apply-mask", exitCode: 2 };
      if (applyMaskExpr !== undefined) {
        return { kind: "error", message: "Only one --apply-mask is supported", exitCode: 2 };
      }
      applyMaskExpr = raw;
      continue;
    }

    if (arg === "--pretty") {
      if (format === "pretty") continue;
      if (format === "compact") {
        format = "pretty";
        continue;
      }
    }

    if (arg === "--compact") {
      if (format === "compact") continue;
      if (format === "pretty") {
        format = "compact";
        continue;
      }
    }

    if (arg === "--min-hits" || arg.startsWith("--min-hits=")) {
      const raw =
        arg === "--min-hits" ? argv[index + 1] : arg.slice("--min-hits=".length);
      if (arg === "--min-hits") index += 1;
      if (!raw) return { kind: "error", message: "Missing value for --min-hits", exitCode: 2 };
      const value = Number(raw);
      if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
        return { kind: "error", message: `Invalid --min-hits: ${raw}`, exitCode: 2 };
      }
      minHits = value;
      continue;
    }

    if (arg.startsWith("-")) return { kind: "error", message: `Unknown option: ${arg}`, exitCode: 2 };

    if (inputFilePath !== undefined) {
      return { kind: "error", message: "Only one input file is supported", exitCode: 2 };
    }
    inputFilePath = arg;
  }

  if (maskOnly && applyMaskExpr !== undefined) {
    return {
      kind: "error",
      message: "Cannot combine --mask with --apply-mask",
      exitCode: 2
    };
  }

  return { kind: "run", inputFilePath, maskOnly, applyMaskExpr, minHits, format };
}

function renderUsage(): string {
  return [
    "jsnore",
    "",
    "Usage:",
    "  jsnore --help",
    "  jsnore --version",
    "  jsnore --apply-mask <expr> [--pretty|--compact] [file]",
    "  jsnore [--mask] [--min-hits N] [--pretty|--compact] [file]",
    ""
  ].join("\n");
}

function emptyProjectionFor(root: unknown): unknown {
  if (Array.isArray(root)) return [];
  if (root !== null && typeof root === "object") return {};
  return null;
}

export async function run(argv: string[], stdin: Reader, stdout: Writer, stderr: Writer): Promise<number> {
  const parsed = parseArgs(argv);

  if (parsed.kind === "help") {
    stdout.write(renderUsage());
    return 0;
  }

  if (parsed.kind === "version") {
    stdout.write("0.0.0\n");
    return 0;
  }

  if (parsed.kind === "error") {
    stderr.write(`${parsed.message}\n`);
    return parsed.exitCode;
  }

  let rawInput: string;
  try {
    rawInput =
      parsed.inputFilePath !== undefined
        ? await readFile(parsed.inputFilePath, "utf8")
        : await stdin.read();
  } catch (error) {
    stderr.write(`Failed to read input: ${String(error)}\n`);
    return 1;
  }

  let doc: unknown;
  try {
    doc = JSON.parse(rawInput);
  } catch (error) {
    stderr.write(`Invalid JSON: ${String(error)}\n`);
    return 1;
  }

  if (parsed.applyMaskExpr !== undefined) {
    const applied = mask(doc, parsed.applyMaskExpr);
    const json = parsed.format === "pretty" ? JSON.stringify(applied, null, 2) : JSON.stringify(applied);
    stdout.write(`${json}\n`);
    return 0;
  }

  const derived = deriveMask(doc, { minHits: parsed.minHits });

  if (parsed.maskOnly) {
    stdout.write(`${derived}\n`);
    return 0;
  }

  const slimmed = derived === "" ? emptyProjectionFor(doc) : mask(doc, derived);
  const json = parsed.format === "pretty" ? JSON.stringify(slimmed, null, 2) : JSON.stringify(slimmed);
  stdout.write(`${json}\n`);
  return 0;
}
