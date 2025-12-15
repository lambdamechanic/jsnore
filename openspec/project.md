# Project Context

## Purpose
Build a TypeScript command-line tool and library that derive a `json-mask` projection for slimming a single JSON document by removing fields that are constant across wildcard-expanded paths.

## Tech Stack
- TypeScript
- Node.js
- `json-mask` (mask syntax + projection application)

## Project Conventions

### Code Style
- Prefer small, readable modules and explicit names.
- Keep public APIs stable and well-tested.

### Architecture Patterns
- Core logic lives in the library package; the CLI is a thin wrapper.
- Deterministic output is important (stable ordering).

### Testing Strategy
- Prefer property tests using `minitsis` + `minitsis-node` for core behavior, invariants, and edge cases.
- Use classic unit tests sparingly (e.g., CLI wiring/smoke tests and a few basic helpers).
- CLI smoke tests for stdin/file input and `--mask` vs slimmed JSON output.
- Enforce 100% test coverage using Vitest coverage thresholds (primarily driven by property tests).

### Git Workflow
- Keep changes small and scoped.
- Commit `.beads/issues.jsonl` with code changes.

## Domain Context
- The library derives masks based on repeated values across wildcard patterns.
- Wildcards follow `json-mask` semantics (path segments separated by `/`, `*` matches all items at that segment).

## Important Constraints
- Use `bd` for all issue tracking (no markdown TODO lists).
- Use OpenSpec proposal workflow before implementing new capabilities.

## External Dependencies
- `json-mask` npm package
