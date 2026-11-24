// Black-box tests for main.ts — runs the program as a subprocess and checks
// the competition gate (UTF-8, 1–140 chars, single non-blank line, no
// trailing newline) plus determinism and the corpus invariants.
// Node standard library only: node:test, node:child_process, node:fs.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAIN = new URL("./main.ts", import.meta.url).pathname;
const OUTPUT = "/output/entry.txt";
const MAX_CHARS = 140;

interface RunResult {
  stdout: string;
  stderr: string;
}

function runMain(stdin: string | null, args: string[] = []): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = execFile("node", [MAIN, ...args], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`main.ts exited non-zero: ${stderr || error.message}`));
        return;
      }
      resolve({ stdout, stderr });
    });
    if (stdin === null) {
      child.stdin.end();
    } else {
      child.stdin.end(stdin);
    }
  });
}

function assertGate(text: string): void {
  assert.equal(typeof text, "string");
  // Count code points, not UTF-16 units, so astral characters count once.
  const length = [...text].length;
  assert.ok(length >= 1, "entry must be at least 1 character");
  assert.ok(length <= MAX_CHARS, `entry is ${length} chars, over the 140 limit`);
  assert.equal(text.trim().length > 0, true, "entry must not be only whitespace");
  assert.equal(text.includes("\n"), false, "entry must be a single line");
  assert.equal(text.includes("\r"), false, "entry must not contain carriage returns");
  assert.equal(text.endsWith("\n"), false, "entry must not end with a newline");
  assert.equal(text, text.trim(), "entry must have no leading/trailing whitespace");
}

function readEntry(): string {
  return readFileSync(OUTPUT, "utf8");
}

describe("fortune-cookie-agent gate", () => {
  it("empty stdin writes a valid single-line fortune", async () => {
    const { stdout } = await runMain("");
    const entry = readEntry();
    assertGate(entry);
    assert.equal(stdout.trim(), entry, "stdout echoes the written entry");
  });

  it("plain-text seed is deterministic and valid", async () => {
    await runMain("tokens");
    const first = readEntry();
    assertGate(first);
    await runMain("tokens");
    const second = readEntry();
    assert.equal(first, second, "same seed must produce the same fortune");
  });

  it("JSON seed is accepted and deterministic", async () => {
    await runMain('{"seed": "retries"}');
    const fromJson = readEntry();
    assertGate(fromJson);
    await runMain("retries");
    const fromRaw = readEntry();
    assert.equal(fromJson, fromRaw, "JSON seed must match the raw seed");
  });

  it("different seeds can reach different fortunes", async () => {
    const seen = new Set<string>();
    for (const seed of ["a", "b", "c", "tokens", "retries", "context", "upgrade"]) {
      await runMain(seed);
      seen.add(readEntry());
    }
    assert.ok(seen.size > 1, "seeded picks should not all collapse to one line");
  });

  it("--selftest passes", async () => {
    const { stdout } = await runMain(null, ["--selftest"]);
    assert.match(stdout, /selftest ok/);
  });
});
