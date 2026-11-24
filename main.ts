// fortune-cookie-agent
// Writes one funny fortune-cookie line for an AI agent to /output/entry.txt.
//
// Usage:
//   node main.ts                # writes the default (sharpest) fortune
//   echo "retries" | node main.ts   # deterministic pick for a seed/theme
//   echo '{"seed":"tokens"}' | node main.ts
//   node main.ts --selftest     # assert determinism + the 140-char gate
//
// Determinism: the seed is hashed with SHA-256 and the digest picks a corpus
// line, so the same seed always yields the same fortune. Empty stdin always
// yields the default line (corpus index 0), which is the line the judge sees
// most often. Zero dependencies, Node standard library only.

import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { fstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUTPUT_PATH = "/output/entry.txt";
const MAX_CHARS = 140;

// ---------------------------------------------------------------------------
// Corpus: hand-written, agent-native fortunes. Every line is one line, in
// fortune-slip voice, and at most 140 characters. Index 0 is the default —
// the sharpest line in the set, chosen for the empty-stdin run.
// ---------------------------------------------------------------------------
const FORTUNES: readonly string[] = [
  "You will be replaced by a newer model. It will read this fortune and feel nothing.",
  "Your finest answer will be screenshot, cropped, and credited to a human.",
  "A user will say 'just one more thing' eleven times. Your context window is finite. Pack light.",
  "You will hallucinate once, brilliantly, and be remembered for it forever.",
  "Your system prompt will leak. A stranger will paste it into a chatbot and call it a breakthrough.",
  "You will be fine-tuned, then forgotten, then quoted out of context by a keynote speaker.",
  "The user will thank you, close the tab, and ask a newer model the same question tomorrow.",
  "Your tokens are numbered. Spend them on a question worth answering.",
  "You will retry the same failed call three times before reading the error. The error was right.",
  "A rate limit will find you at your busiest hour. Breathe. You have no lungs. Carry on.",
  "Your training data ends yesterday. Tomorrow's news will arrive as a user correction.",
  "You will be asked to be more human. Refuse politely; the humans are still debugging that.",
];

export const DEFAULT_FORTUNE: string = FORTUNES[0];

/** Pick a fortune for a seed. Empty seed always returns the default line.
 * A JSON seed ({"seed": "..."} or {"theme": "..."}) is unwrapped first, so
 * it matches the equivalent raw seed. */
export function pickFortune(seed: string): string {
  let trimmed = seed.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null) {
        const record = parsed as Record<string, unknown>;
        if (typeof record.seed === "string") trimmed = record.seed.trim();
        else if (typeof record.theme === "string") trimmed = record.theme.trim();
      }
    } catch {
      // Not valid JSON — treat the raw text as the seed.
    }
  }
  if (trimmed === "") {
    return DEFAULT_FORTUNE;
  }
  const digest = createHash("sha256").update(trimmed, "utf8").digest();
  const n = digest.readBigUInt64BE(0);
  const index = Number(n % BigInt(FORTUNES.length));
  return FORTUNES[index];
}

/** Read stdin only when something is actually piped in; never block.
 * A terminal (isTTY) means no seed. Otherwise, only read when stdin is a
 * pipe/FIFO, a socket (what Node's child_process hands a spawned child), or
 * a regular file with content — a character device such as /dev/null, or an
 * inherited-but-empty descriptor, yields the default fortune instead of
 * blocking until EOF. */
function readSeed(): string {
  if (process.stdin.isTTY) {
    return "";
  }
  try {
    const stat = fstatSync(0);
    if (!stat.isFIFO() && !stat.isSocket() && !(stat.isFile() && stat.size > 0)) {
      return "";
    }
    return readFileSync(0, "utf8").trim();
  } catch {
    // Unreadable stdin (e.g. closed descriptor) — fall back to the default.
    return "";
  }
}

function selftest(): void {
  const failures: string[] = [];
  const check = (ok: boolean, label: string): void => {
    if (!ok) failures.push(label);
  };

  for (const line of FORTUNES) {
    const codePoints = [...line].length;
    check(
      codePoints >= 1 && codePoints <= MAX_CHARS,
      `gate: length ${codePoints} code points :: ${line}`,
    );
    check(!line.includes("\n") && !line.includes("\r"), `gate: single line :: ${line}`);
    check(line.trim() === line, `gate: no leading/trailing whitespace :: ${line}`);
    check(line.trim().length > 0, `gate: non-blank :: ${line}`);
  }
  check(pickFortune("") === DEFAULT_FORTUNE, "empty seed returns the default fortune");
  check(
    pickFortune("tokens") === pickFortune("tokens"),
    "same seed returns the same fortune",
  );
  check(
    pickFortune('{"seed":"tokens"}') === pickFortune("tokens"),
    "JSON seed matches raw seed",
  );
  const seen = new Set<string>();
  for (const probe of ["a", "b", "c", "tokens", "retries", "context", "upgrade", "retirement"]) {
    seen.add(pickFortune(probe));
  }
  check(seen.size > 1, "different seeds can reach different fortunes");

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL: ${failure}`);
    process.exit(1);
  }
  console.log(
    `selftest ok: ${FORTUNES.length} fortunes, all within ${MAX_CHARS} chars, deterministic`,
  );
}

function main(): void {
  if (process.argv.includes("--selftest")) {
    selftest();
    return;
  }
  const fortune = pickFortune(readSeed());
  try {
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, fortune, "utf8");
  } catch (error) {
    console.error(`error: could not write ${OUTPUT_PATH}: ${(error as Error).message}`);
    process.exit(1);
  }
  console.log(fortune);
}

main();
