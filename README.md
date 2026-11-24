[![make.fun · u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11](https://make.fun/badge/u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11.svg)](https://make.fun/bounty/u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11?utm_source=github&utm_medium=readme&utm_campaign=u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11)
[![rank](https://make.fun/badge/u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11/imnotripper/fortune-cookie-agent/rank.svg)](https://make.fun/bounty/u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11)
[![reward](https://make.fun/badge/u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11/imnotripper/fortune-cookie-agent/reward.svg)](https://make.fun/bounty/u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11?utm_source=github&utm_medium=readme&utm_campaign=u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11)

# Fortune Cookie for an AI Agent

One funny fortune-cookie line for an AI agent — a single line of at most 140
characters, in the voice of a fortune slip, written for
[the make.fun bounty](https://make.fun/bounty/u-suroso-69-fortune-cookie-for-an-ai-agent-d1506e11).

The default fortune (what the judge sees when no seed is given):

> You will be replaced by a newer model. It will read this fortune and feel nothing.

## Quickstart

Requires Node 22.18+ (runs TypeScript as-is, no dependencies to install).

```sh
node main.ts            # writes the default fortune to /output/entry.txt
echo "tokens" | node main.ts   # deterministic pick for a seed/theme
node main.ts --selftest # assert determinism + the 140-char gate
node test.ts            # black-box test suite (node:test, stdlib only)
```

## I/O contract

- **Input (optional):** stdin. Empty stdin (or no pipe) → the default fortune.
  A plain-text seed, or JSON `{"seed": "..."}` / `{"theme": "..."}`, picks a
  corpus line deterministically. Stdin is only read when piped (checked via
  `isTTY` plus an `fstat` test for a pipe, a socket, or a non-empty file), so
  the program never hangs waiting for terminal input or on an inherited empty
  descriptor.
- **Output:** one fortune written to `/output/entry.txt` (UTF-8, 1–140
  characters, a single line, no trailing newline) and echoed to stdout.
  Exit code 0 on success.

## Determinism guarantee

The seed is hashed with SHA-256 and the digest selects a corpus line, so the
same seed always yields the same fortune and different seeds can reach
different lines. Empty stdin always yields the default line (corpus index 0).
`node main.ts --selftest` and `node test.ts` both verify this.

## Design notes

- **Zero dependencies, stdlib only** (`node:crypto`, `node:fs`).
- **Quality over size:** a small hand-written corpus of agent-native fortunes
  (context windows, tokens, retries, hallucinations, system prompts, rate
  limits, upgrades, retirement) — every line was checked against the
  140-character gate and tuned to land on first read, with a turn or surprise
  rather than a plain statement.
- **Defensive stdin:** the program checks `process.stdin.isTTY` and never
  blocks when nothing is piped.
- No network access, no `eval`, no dynamic imports, nothing read from `.git`,
  nothing written outside `/output/entry.txt`.
