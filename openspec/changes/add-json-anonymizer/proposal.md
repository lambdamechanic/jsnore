# Change: add-json-anonymizer

## Why
We need a safe way to share real-world JSON for debugging and testing without exposing sensitive identifiers. A dedicated anonymizer tool enables deterministic anonymization within a run while preserving structural shape and string lengths.

## What Changes
- Add a JSON anonymizer tool that:
  - Replaces all **string keys** and **string values** with pseudorandom strings of the **same length**
  - Seeds its PRNG using a real randomness source (`crypto`), then uses a fast PRNG for generation
  - Caches conversions so the same source string is always mapped to the same anonymized string within a run
  - Leaves numbers and booleans unchanged; treats dates as strings (no date parsing)
- Expose anonymization as:
  - A CLI tool (primary)
  - A small library helper (for reuse/testing)

## Scope / Non-Goals
- Non-goal: cryptographic anonymization guarantees (this is pseudorandom masking, not encryption).
- Non-goal: schema-aware anonymization (no special handling for dates, emails, UUIDs, etc.).
- Non-goal: streaming JSON parsing (input is a single JSON document).

## Open Questions
CLI packaging is a separate bin named `jsonymous`.

## Impact
- New OpenSpec capabilities:
  - `anonymize-json` (library)
  - `json-anonymize-cli` (CLI)
