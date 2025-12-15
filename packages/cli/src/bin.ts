#!/usr/bin/env node
import { run } from "./cli.js";

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += String(chunk);
    });
    process.stdin.on("end", () => resolve(buffer));
    process.stdin.on("error", (error) => reject(error));
  });
}

const exitCode = await run(process.argv.slice(2), { read: readStdin }, process.stdout, process.stderr);
process.exitCode = exitCode;
