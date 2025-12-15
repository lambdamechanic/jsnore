## 1. Proposal Tasks (spec-driven)
- [x] Validate OpenSpec change bundle: `openspec validate update-missing-semantics --strict`

## 2. Implementation Tasks (after approval)
- [ ] Update library API: add missing semantics option with default `distinct`
- [ ] Update constancy evaluation to support `ignore` semantics (missing not counted toward hits)
- [ ] Update CLI to accept `--missing distinct|ignore` and pass through to library
- [ ] Add/adjust unit + property tests for both modes
- [ ] Update README/docs with examples and cautions
