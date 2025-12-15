## 1. Proposal Tasks (spec-driven)
- [x] Validate OpenSpec change bundle: `openspec validate add-json-anonymizer --strict`

## 2. Implementation Tasks (after approval)
- [ ] Add library API to anonymize a JSON value with cached mapping
- [ ] Seed PRNG from `crypto` randomness and generate same-length replacement strings
- [ ] Add CLI tool to read JSON from stdin/file and output anonymized JSON
- [ ] Add unit + property tests (mapping stability, same-length strings, numbers unchanged)
- [ ] Document usage and caveats in README
