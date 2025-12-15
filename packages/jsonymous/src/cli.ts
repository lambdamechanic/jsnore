import { readFile } from "node:fs/promises";
import { anonymizeJson } from "@jsnore/lib";

export type Writer = { write(chunk: string): void };
export type Reader = { read(): Promise<string> };

type OutputFormat = "compact" | "pretty";

type ParsedArgs =
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "run"; inputFilePath?: string; format: OutputFormat }
  | { kind: "error"; message: string; exitCode: number };

function parseArgs(argv: string[]): ParsedArgs {
  let inputFilePath: string | undefined;
  let format: OutputFormat = "compact";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;

    if (arg === "--help" || arg === "-h") return { kind: "help" };
    if (arg === "--version" || arg === "-v") return { kind: "version" };

    if (arg === "--pretty") {
      format = "pretty";
      continue;
    }

    if (arg === "--compact") {
      format = "compact";
      continue;
    }

    if (arg.startsWith("-")) return { kind: "error", message: `Unknown option: ${arg}`, exitCode: 2 };

    if (inputFilePath !== undefined) {
      return { kind: "error", message: "Only one input file is supported", exitCode: 2 };
    }
    inputFilePath = arg;
  }

  return { kind: "run", inputFilePath, format };
}

function renderUsage(): string {
  return [
    "jsonymous",
    "",
    "Usage:",
    "  jsonymous --help",
    "  jsonymous --version",
    "  jsonymous [--pretty|--compact] [file]",
    ""
  ].join("\n");
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

  const anonymized = anonymizeJson(doc);
  const json = parsed.format === "pretty" ? JSON.stringify(anonymized, null, 2) : JSON.stringify(anonymized);
  stdout.write(`${json}\n`);
  return 0;
}

