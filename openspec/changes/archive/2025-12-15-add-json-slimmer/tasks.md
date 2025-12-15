## 1. Proposal Tasks (spec-driven)
- [x] Finalize open questions in `openspec/changes/add-json-slimmer/proposal.md`
- [x] Validate OpenSpec change bundle: `openspec validate add-json-slimmer --strict`

## 2. Implementation Tasks (after approval)
- [x] Initialize TypeScript workspace (library + CLI packages)
- [x] Set up property-testing infrastructure (`minitsis`, `minitsis-node`) and document how to run it
- [x] Set up Vitest with 100% coverage thresholds and a CI-friendly coverage command
- [x] Implement path enumeration for a single JSON document (containers + leaves)
- [x] Implement generalized candidate generation with multiple wildcards (no configured max) and mandatory index wildcarding
- [x] Implement constant detection with `minHits`, deep equality, and missing-as-distinct semantics
- [x] Implement mask construction and canonical formatting
- [x] Implement `json-mask`-compatible escaping for path segments (and tests for escaped keys)
- [x] Implement CLI I/O (stdin/file), `--mask`, and slimmed JSON output
- [x] Add property tests (minitsis) for derivation invariants and degenerate inputs (primary test strategy)
- [x] Add minimal unit/smoke tests for CLI wiring and mode selection (secondary)
- [x] Add basic docs/README usage examples
