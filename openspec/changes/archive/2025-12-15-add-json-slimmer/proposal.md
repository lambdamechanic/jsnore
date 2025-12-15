# Change: add-json-slimmer

## Why
We want a repeatable way to slim a single JSON document by removing fields that are constant across wildcard-expanded paths, and to expose the result either as a `json-mask` projection (library) or as a transformed JSON document (CLI).

## What Changes
- Add a TypeScript library that derives a `json-mask` projection from a single JSON document.
- Add a CLI that can either:
  - Print the derived mask (`--mask`), or
  - Print a slimmed JSON document produced by applying the derived mask (default).
- Add configuration knobs for hit thresholds and wildcard generalization.

## Scope / Non-Goals
- Non-goal: multi-document corpus learning (input is exactly one JSON document).
- Non-goal: producing an “exclusion mask” language; output is a standard `json-mask` projection string.

## Assumptions (confirm / adjust)
- Mask syntax is `json-mask` style with `/` path separators and `*` wildcard segments (e.g., `aliases/*/firstName`).
- “Same value” uses deep structural equality over JSON values.
- Array indices are treated as wildcardable path segments; numeric indices are always wildcarded (no specialization by index).
- Multiple wildcards are supported with no configured maximum; degenerate inputs may produce fully-wildcarded paths.
- Constant detection is allowed for container values (objects/arrays), not just leaf values.
- Missing is treated as distinct from present; if a generalized path yields missing for some instances and a JSON value for others, it is not constant.

## Open Questions
All questions below have been resolved during implementation:

- CLI shape: single command with mode flags; `--mask` prints the derived mask and default mode prints slimmed JSON (derived mask applied).
- Candidate generation: no explicit safety limits are currently exposed; performance is driven by document shape and the implementation’s pruning/deduping.
- Canonical mask formatting: emit a single `json-mask` expression string and prefer parentheses grouping when possible.
- Escaping: follow `json-mask` escaping rules and validate via applying the derived mask with the `json-mask` library.

## Impact
- New OpenSpec capabilities:
  - `derive-json-mask` (library API)
  - `json-slim-cli` (CLI behavior)
