# Change: update-missing-semantics

## Why
The current constancy evaluation treats missing as distinct from present, which preserves presence/absence signals but can be too conservative for some datasets. Users need an opt-in mode to treat missing as “no data” so constants can be removed when they are constant among *present* occurrences.

## What Changes
- Add a runtime option to control missing semantics during constancy evaluation:
  - `distinct` (default): missing vs present prevents constancy (current behavior)
  - `ignore`: missing is ignored for constancy; only present hits count toward `minHits`
- Expose the option in:
  - library API (`deriveMask`)
  - CLI (flag to select semantics)

## Scope / Non-Goals
- Non-goal: changing default behavior (default remains `distinct`).
- Non-goal: adding conditional selection to json-mask (e.g. “only objects that have key X”).
- Non-goal: changing wildcard generation rules.

## Compatibility
- Backwards compatible by default.
- Opt-in behavior change when selecting `ignore`.

## Open Questions
- CLI flag shape: `--missing distinct|ignore` vs `--ignore-missing` (proposal uses `--missing` for extensibility).

## Impact
- Affected OpenSpec capabilities:
  - `derive-json-mask` (new option)
  - `json-slim-cli` (new flag)

